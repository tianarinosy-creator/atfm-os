import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { Prisma } from "@atfm/db";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "../events/events.service";
import { AuthenticatedUser } from "../auth/auth.types";
import { CreatePersonDto } from "./dto/create-person.dto";
import { UpdatePersonDto } from "./dto/update-person.dto";
import { TransferAffectationDto } from "./dto/transfer-affectation.dto";
import { UpdateAffectationStatusDto } from "./dto/update-affectation-status.dto";
import { QueryPeopleDto } from "./dto/query-people.dto";
import { EmployeeView } from "./people.types";

const personWithDirectory = Prisma.validator<Prisma.PersonDefaultArgs>()({
  include: { affectations: true, roles: true, account: { select: { username: true, mfaEnabled: true, lastLogin: true } } },
});
type PersonWithDirectory = Prisma.PersonGetPayload<typeof personWithDirectory>;

@Injectable()
export class PeopleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  /// Impose côté API la règle "seul RH agit sur le Core Directory pour sa société" —
  /// ne jamais se contenter d'un contrôle uniquement côté interface.
  private assertRhFor(actor: AuthenticatedUser, society: string) {
    const isRh = actor.roles.some((r) => r.role === "RH" && r.society === society);
    if (!isRh) {
      throw new ForbiddenException(`Seul le RH de "${society}" peut effectuer cette action.`);
    }
  }

  private toEmployeeView(person: PersonWithDirectory, society: string): EmployeeView | null {
    const aff = person.affectations.find((a) => a.society === society && !a.exitDate);
    if (!aff) return null;
    return {
      personId: person.id,
      affectationId: aff.id,
      name: `${person.firstName} ${person.lastName}`.trim(),
      email: person.email,
      phone: person.phone,
      society: aff.society,
      department: aff.department,
      position: aff.position,
      manager: aff.manager,
      entryDate: aff.entryDate,
      status: aff.status,
      replacement: aff.replacement,
      isCommercial: aff.department === "Commercial",
    };
  }

  /// GET /people[?society=&department=&status=]
  /// Sans `society` : vue transversale du Core Directory (Annuaire).
  /// Avec `society` : vue "employé" filtrée — c'est l'endpoint que le CRM appelle
  /// pour peupler ses listes de commerciaux, jamais une copie locale.
  async findAll(query: QueryPeopleDto) {
    const people = await this.prisma.client.person.findMany(personWithDirectory);

    if (!query.society) {
      return people.map((p) => ({
        personId: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
        email: p.email,
        phone: p.phone,
        affectations: p.affectations.map((a) => ({
          id: a.id,
          society: a.society,
          department: a.department,
          position: a.position,
          manager: a.manager,
          entryDate: a.entryDate,
          exitDate: a.exitDate,
          status: a.status,
          replacement: a.replacement,
        })),
      }));
    }

    return people
      .map((p) => this.toEmployeeView(p, query.society!))
      .filter((view): view is EmployeeView => Boolean(view))
      .filter((view) => (query.department ? view.department === query.department : true))
      .filter((view) => (query.status ? view.status === query.status : true));
  }

  async findOne(id: string) {
    const person = await this.prisma.client.person.findUnique({
      where: { id },
      include: { affectations: { orderBy: { entryDate: "desc" } }, roles: true, account: { select: { username: true, mfaEnabled: true, lastLogin: true } } },
    });
    if (!person) throw new NotFoundException("Personne introuvable.");
    return person;
  }

  /// POST /people — réservé au RH de la société de la nouvelle affectation.
  async create(dto: CreatePersonDto, actor: AuthenticatedUser) {
    this.assertRhFor(actor, dto.society);

    const tempPassword = randomBytes(9).toString("base64url");
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const username = `${dto.firstName}.${dto.lastName}`.toLowerCase().replace(/[^a-z.]/g, "");

    let person: PersonWithDirectory;
    try {
      person = await this.prisma.client.person.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          gender: dto.gender,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          affectations: {
            create: {
              society: dto.society,
              department: dto.department,
              position: dto.position,
              manager: dto.manager,
              entryDate: dto.entryDate ? new Date(dto.entryDate) : new Date(),
              status: "Actif",
            },
          },
          account: {
            create: { username, passwordHash },
          },
        },
        ...personWithDirectory,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Un compte ou une adresse e-mail identique existe déjà.");
      }
      throw error;
    }

    await this.events.publish(
      "EmployeeCreated",
      person.id,
      `${person.firstName} ${person.lastName}`,
      `Créé·e chez ${dto.society} en tant que ${dto.position}`,
    );

    return { person, tempPassword };
  }

  /// PATCH /people/:id — mise à jour des données identitaires (hors affectation/statut).
  async update(id: string, dto: UpdatePersonDto, actor: AuthenticatedUser) {
    const existing = await this.findOne(id);
    const currentSocieties = existing.affectations.filter((a) => !a.exitDate).map((a) => a.society);
    const canEdit = currentSocieties.some((society) => actor.roles.some((r) => r.role === "RH" && r.society === society));
    if (!canEdit) {
      throw new ForbiddenException("Seul le RH d'une société active de cette personne peut la modifier.");
    }

    const updated = await this.prisma.client.person.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
      ...personWithDirectory,
    });

    await this.events.publish("EmployeeUpdated", updated.id, `${updated.firstName} ${updated.lastName}`, "Fiche personne mise à jour");
    return updated;
  }

  /// POST /people/:id/affectations — transfert de société. Clôture l'affectation
  /// active dans fromSociety (jamais supprimée) et ouvre une nouvelle dans toSociety.
  async transfer(id: string, dto: TransferAffectationDto, actor: AuthenticatedUser) {
    this.assertRhFor(actor, dto.fromSociety);

    const person = await this.findOne(id);
    const oldAffectation = person.affectations.find((a) => a.society === dto.fromSociety && !a.exitDate);
    if (!oldAffectation) {
      throw new NotFoundException(`Aucune affectation active chez "${dto.fromSociety}" pour cette personne.`);
    }

    const now = new Date();
    const [, newAffectation] = await this.prisma.client.$transaction([
      this.prisma.client.affectation.update({
        where: { id: oldAffectation.id },
        data: { exitDate: now },
      }),
      this.prisma.client.affectation.create({
        data: {
          personId: id,
          society: dto.toSociety,
          department: dto.department ?? oldAffectation.department,
          position: dto.position ?? oldAffectation.position,
          manager: dto.manager ?? null,
          entryDate: dto.entryDate ? new Date(dto.entryDate) : now,
          status: "Actif",
        },
      }),
    ]);

    await this.events.publish(
      "EmployeeTransferred",
      id,
      `${person.firstName} ${person.lastName}`,
      `Transféré·e de ${dto.fromSociety} vers ${dto.toSociety}`,
    );

    return newAffectation;
  }

  /// PATCH /people/:id/affectations/:affectationId — changement de statut
  /// (Actif / Inactif / Suspendu). Inactif => connexion bloquée, plus d'attribution,
  /// mais l'historique de l'affectation est conservé.
  async updateAffectationStatus(id: string, affectationId: string, dto: UpdateAffectationStatusDto, actor: AuthenticatedUser) {
    const person = await this.findOne(id);
    const affectation = person.affectations.find((a) => a.id === affectationId);
    if (!affectation) throw new NotFoundException("Affectation introuvable.");

    this.assertRhFor(actor, affectation.society);

    const updated = await this.prisma.client.affectation.update({
      where: { id: affectationId },
      data: {
        status: dto.status,
        replacement: dto.status === "Inactif" ? (dto.replacement ?? null) : null,
      },
    });

    await this.events.publish(
      dto.status === "Actif" ? "EmployeeActivated" : "EmployeeDeactivated",
      id,
      `${person.firstName} ${person.lastName}`,
      `Statut passé à "${dto.status}" chez ${affectation.society}`,
    );

    return updated;
  }
}
