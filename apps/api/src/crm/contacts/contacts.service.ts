import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { assertSocietyMember } from "../../common/access/assert-society-member";
import { DirectoryLookupService } from "../../directory/directory-lookup.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";
import { QueryContactsDto } from "./dto/query-contacts.dto";

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: DirectoryLookupService,
  ) {}

  private async withHandledBy<T extends { handledById: string | null }>(society: string, contacts: T[]) {
    const commercials = await this.directory.loadCommercials(society);
    return contacts.map((c) => ({
      ...c,
      handledBy: c.handledById ? (commercials.get(c.handledById) ?? null) : null,
    }));
  }

  /// GET /crm/contacts?society=&search= — jamais de liste de commerciaux propre au
  /// CRM : "Traité par" est résolu à la volée depuis le Core Directory.
  async findAll(query: QueryContactsDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, query.society);

    const search = query.search?.trim();
    const contacts = await this.prisma.client.crmContact.findMany({
      where: {
        society: query.society,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { company: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { deals: true } } },
      orderBy: { createdAt: "desc" },
    });

    return this.withHandledBy(query.society, contacts);
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const contact = await this.prisma.client.crmContact.findUnique({
      where: { id },
      include: { deals: true },
    });
    if (!contact) throw new NotFoundException("Contact introuvable.");
    assertSocietyMember(actor, contact.society);

    const [withHandledBy] = await this.withHandledBy(contact.society, [contact]);
    return withHandledBy;
  }

  async create(dto: CreateContactDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, dto.society);
    if (dto.handledByPersonId) {
      await this.directory.assertActiveCommercial(dto.society, dto.handledByPersonId);
    }

    const created = await this.prisma.client.crmContact.create({
      data: {
        society: dto.society,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        company: dto.company,
        position: dto.position,
        referredBy: dto.referredBy,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : null,
        handledById: dto.handledByPersonId,
        tags: dto.tags ?? [],
      },
    });
    const [withHandledBy] = await this.withHandledBy(dto.society, [created]);
    return withHandledBy;
  }

  async update(id: string, dto: UpdateContactDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.client.crmContact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Contact introuvable.");
    assertSocietyMember(actor, existing.society);

    if (dto.handledByPersonId) {
      await this.directory.assertActiveCommercial(existing.society, dto.handledByPersonId);
    }

    const updated = await this.prisma.client.crmContact.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        company: dto.company,
        position: dto.position,
        referredBy: dto.referredBy,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : undefined,
        handledById: dto.handledByPersonId,
        tags: dto.tags,
      },
    });
    const [withHandledBy] = await this.withHandledBy(existing.society, [updated]);
    return withHandledBy;
  }
}
