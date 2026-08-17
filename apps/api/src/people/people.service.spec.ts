import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AffectationStatus, Prisma } from "@atfm/db";
import { PeopleService } from "./people.service";
import { EventsService } from "../events/events.service";
import { AuthenticatedUser } from "../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../test/prisma-mock";

function rh(society: string): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [{ society, role: "RH" }], societies: [society] };
}

function nonRh(): AuthenticatedUser {
  return { personId: "actor-2", username: "no-role", name: "No Role", roles: [], societies: [] };
}

describe("PeopleService", () => {
  let prisma: PrismaMock;
  let events: EventsService;
  let service: PeopleService;

  beforeEach(() => {
    prisma = createPrismaMock();
    events = { publish: jest.fn().mockResolvedValue(undefined) } as unknown as EventsService;
    service = new PeopleService(prisma, events);
  });

  describe("findAll", () => {
    it("sans société : projette la vue transversale du Core Directory", async () => {
      (prisma.client.person.findMany as jest.Mock).mockResolvedValue([
        {
          id: "p1",
          firstName: "Elodie",
          lastName: "Vasseur",
          email: "elodie@atfm-group.com",
          phone: null,
          affectations: [
            { id: "a1", society: "logistics", department: "Commercial", position: "Chargée grands comptes", manager: "Karim", entryDate: new Date(), exitDate: null, status: "Inactif", replacement: "Sarah Kaced" },
          ],
        },
      ]);

      const result = await service.findAll({});

      expect(result).toEqual([
        expect.objectContaining({ personId: "p1", name: "Elodie Vasseur" }),
      ]);
    });

    it("avec society & department=Commercial : reproduit la lecture CRM (getCoreDirectoryCommercials)", async () => {
      (prisma.client.person.findMany as jest.Mock).mockResolvedValue([
        {
          id: "p1",
          firstName: "Elodie",
          lastName: "Vasseur",
          email: "elodie@atfm-group.com",
          phone: null,
          affectations: [
            { id: "a1", society: "logistics", department: "Commercial", position: "Chargée grands comptes", manager: "Karim", entryDate: new Date(), exitDate: null, status: "Inactif", replacement: "Sarah Kaced (intérim)" },
          ],
        },
        {
          id: "p2",
          firstName: "Karim",
          lastName: "Fassi",
          email: "karim@atfm-group.com",
          phone: null,
          affectations: [
            { id: "a2", society: "logistics", department: "Opérations", position: "Responsable opérations", manager: null, entryDate: new Date(), exitDate: null, status: "Actif", replacement: null },
          ],
        },
        {
          id: "p3",
          firstName: "Transféré",
          lastName: "Ailleurs",
          email: "transfere@atfm-group.com",
          phone: null,
          affectations: [
            // Affectation Commercial chez logistics mais clôturée : ne doit jamais apparaître.
            { id: "a3", society: "logistics", department: "Commercial", position: "Commercial", manager: null, entryDate: new Date(), exitDate: new Date(), status: "Actif", replacement: null },
          ],
        },
      ]);

      const result = await service.findAll({ society: "logistics", department: "Commercial" });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        personId: "p1",
        name: "Elodie Vasseur",
        status: "Inactif",
        replacement: "Sarah Kaced (intérim)",
        isCommercial: true,
      });
    });
  });

  describe("create", () => {
    const dto = {
      firstName: "Nouvelle",
      lastName: "Recrue",
      gender: "Non précisé",
      email: "nouvelle.recrue@atfm-group.com",
      society: "logistics",
      department: "Commercial",
      position: "Commercial",
    };

    it("autorise le RH de la société cible et publie EmployeeCreated", async () => {
      (prisma.client.person.create as jest.Mock).mockResolvedValue({
        id: "new-person",
        firstName: "Nouvelle",
        lastName: "Recrue",
      });

      const result = await service.create(dto, rh("logistics"));

      expect(prisma.client.person.create).toHaveBeenCalled();
      expect(result.person.id).toBe("new-person");
      expect(typeof result.tempPassword).toBe("string");
      expect(result.tempPassword.length).toBeGreaterThan(0);
      expect(events.publish).toHaveBeenCalledWith(
        "EmployeeCreated",
        "new-person",
        "Nouvelle Recrue",
        expect.stringContaining("logistics"),
      );
    });

    it("refuse un RH d'une autre société (règle imposée côté API)", async () => {
      await expect(service.create(dto, rh("tech"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.person.create).not.toHaveBeenCalled();
      expect(events.publish).not.toHaveBeenCalled();
    });

    it("convertit un e-mail dupliqué (P2002) en ConflictException", async () => {
      (prisma.client.person.create as jest.Mock).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "5.22.0" }),
      );

      await expect(service.create(dto, rh("logistics"))).rejects.toThrow(ConflictException);
      expect(events.publish).not.toHaveBeenCalled();
    });
  });

  describe("transfer", () => {
    const person = {
      id: "person-1",
      firstName: "Test",
      lastName: "Nouveau",
      affectations: [
        { id: "aff-old", society: "logistics", department: "Commercial", position: "Commercial", manager: "Karim", entryDate: new Date(), exitDate: null, status: "Actif", replacement: null },
      ],
    };

    it("clôture l'affectation d'origine et ouvre la nouvelle, sans rien supprimer", async () => {
      (prisma.client.person.findUnique as jest.Mock).mockResolvedValue(person);
      (prisma.client.affectation.update as jest.Mock).mockResolvedValue({ id: "aff-old", exitDate: new Date() });
      (prisma.client.affectation.create as jest.Mock).mockResolvedValue({ id: "aff-new", society: "tech" });

      const result = await service.transfer(
        "person-1",
        { fromSociety: "logistics", toSociety: "tech", position: "Développeur", department: "Ingénierie" },
        rh("logistics"),
      );

      expect(prisma.client.affectation.update).toHaveBeenCalledWith({
        where: { id: "aff-old" },
        data: { exitDate: expect.any(Date) },
      });
      expect(prisma.client.affectation.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ personId: "person-1", society: "tech", status: "Actif" }) }),
      );
      expect(result).toEqual({ id: "aff-new", society: "tech" });
      expect(events.publish).toHaveBeenCalledWith("EmployeeTransferred", "person-1", "Test Nouveau", expect.stringContaining("tech"));
    });

    it("refuse un RH qui n'est pas celui de la société d'origine", async () => {
      await expect(
        service.transfer("person-1", { fromSociety: "logistics", toSociety: "tech" }, rh("tech")),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.client.person.findUnique).not.toHaveBeenCalled();
    });

    it("échoue si aucune affectation active dans fromSociety", async () => {
      (prisma.client.person.findUnique as jest.Mock).mockResolvedValue({ ...person, affectations: [] });

      await expect(
        service.transfer("person-1", { fromSociety: "logistics", toSociety: "tech" }, rh("logistics")),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateAffectationStatus", () => {
    const person = {
      id: "person-1",
      firstName: "Elodie",
      lastName: "Vasseur",
      affectations: [
        { id: "aff-1", society: "logistics", department: "Commercial", position: "Chargée grands comptes", manager: "Karim", entryDate: new Date(), exitDate: null, status: "Actif", replacement: null },
      ],
    };

    it("passe l'affectation à Inactif avec un relais et publie EmployeeDeactivated", async () => {
      (prisma.client.person.findUnique as jest.Mock).mockResolvedValue(person);
      (prisma.client.affectation.update as jest.Mock).mockResolvedValue({ id: "aff-1", status: "Inactif", replacement: "Sarah Kaced" });

      const result = await service.updateAffectationStatus(
        "person-1",
        "aff-1",
        { status: AffectationStatus.Inactif, replacement: "Sarah Kaced" },
        rh("logistics"),
      );

      expect(prisma.client.affectation.update).toHaveBeenCalledWith({
        where: { id: "aff-1" },
        data: { status: "Inactif", replacement: "Sarah Kaced" },
      });
      expect(result.status).toBe("Inactif");
      expect(events.publish).toHaveBeenCalledWith("EmployeeDeactivated", "person-1", "Elodie Vasseur", expect.stringContaining("Inactif"));
    });

    it("efface le relais quand le statut redevient Actif, même si un replacement est fourni", async () => {
      (prisma.client.person.findUnique as jest.Mock).mockResolvedValue(person);
      (prisma.client.affectation.update as jest.Mock).mockResolvedValue({ id: "aff-1", status: "Actif", replacement: null });

      await service.updateAffectationStatus("person-1", "aff-1", { status: AffectationStatus.Actif, replacement: "Ne doit pas être gardé" }, rh("logistics"));

      expect(prisma.client.affectation.update).toHaveBeenCalledWith({
        where: { id: "aff-1" },
        data: { status: "Actif", replacement: null },
      });
      expect(events.publish).toHaveBeenCalledWith("EmployeeActivated", "person-1", "Elodie Vasseur", expect.any(String));
    });

    it("refuse un RH d'une société différente de celle de l'affectation", async () => {
      (prisma.client.person.findUnique as jest.Mock).mockResolvedValue(person);

      await expect(
        service.updateAffectationStatus("person-1", "aff-1", { status: AffectationStatus.Inactif }, rh("tech")),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.client.affectation.update).not.toHaveBeenCalled();
    });

    it("404 si l'affectation n'existe pas sur cette personne", async () => {
      (prisma.client.person.findUnique as jest.Mock).mockResolvedValue({ ...person, affectations: [] });

      await expect(
        service.updateAffectationStatus("person-1", "aff-inconnue", { status: AffectationStatus.Inactif }, rh("logistics")),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findOne", () => {
    const person = {
      id: "person-1",
      firstName: "Elodie",
      lastName: "Vasseur",
      nationalId: "102071025830",
      nationalIdDate: new Date("2017-06-06"),
      nationalIdPlace: "Sabotsy Namehana",
      affectations: [
        { id: "aff-1", society: "logistics", department: "Commercial", position: "Chargée grands comptes", exitDate: null, status: "Actif", salary: 700000 },
      ],
    };

    it("renvoie l'identité nationale et le salaire au RH de la société de la personne", async () => {
      (prisma.client.person.findUnique as jest.Mock).mockResolvedValue(person);

      const result = await service.findOne("person-1", rh("logistics"));

      expect(result.nationalId).toBe("102071025830");
      expect((result.affectations[0] as { salary: number }).salary).toBe(700000);
    });

    it("masque l'identité nationale et le salaire pour un acteur sans rôle RH sur cette société", async () => {
      (prisma.client.person.findUnique as jest.Mock).mockResolvedValue(person);

      const result = await service.findOne("person-1", rh("tech"));

      expect(result.nationalId).toBeNull();
      expect(result.nationalIdDate).toBeNull();
      expect(result.nationalIdPlace).toBeNull();
      expect((result.affectations[0] as { salary: number | null }).salary).toBeNull();
    });
  });

  describe("updateAffectationDetails", () => {
    const person = {
      id: "person-1",
      firstName: "Elodie",
      lastName: "Vasseur",
      affectations: [
        { id: "aff-1", society: "logistics", department: "Commercial", position: "Chargée grands comptes", manager: "Karim", entryDate: new Date(), exitDate: null, status: "Actif", replacement: null },
      ],
    };

    it("met à jour poste/département/salaire et publie EmployeeUpdated", async () => {
      (prisma.client.person.findUnique as jest.Mock).mockResolvedValue(person);
      (prisma.client.affectation.update as jest.Mock).mockResolvedValue({ id: "aff-1", position: "Responsable grands comptes", salary: 800000 });

      const result = await service.updateAffectationDetails(
        "person-1",
        "aff-1",
        { position: "Responsable grands comptes", salary: 800000 },
        rh("logistics"),
      );

      expect(prisma.client.affectation.update).toHaveBeenCalledWith({
        where: { id: "aff-1" },
        data: { position: "Responsable grands comptes", salary: 800000 },
      });
      expect(result.position).toBe("Responsable grands comptes");
      expect(events.publish).toHaveBeenCalledWith("EmployeeUpdated", "person-1", "Elodie Vasseur", expect.stringContaining("logistics"));
    });

    it("refuse un RH d'une société différente de celle de l'affectation", async () => {
      (prisma.client.person.findUnique as jest.Mock).mockResolvedValue(person);

      await expect(
        service.updateAffectationDetails("person-1", "aff-1", { salary: 800000 }, rh("tech")),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.client.affectation.update).not.toHaveBeenCalled();
    });

    it("404 si l'affectation n'existe pas sur cette personne", async () => {
      (prisma.client.person.findUnique as jest.Mock).mockResolvedValue({ ...person, affectations: [] });

      await expect(
        service.updateAffectationDetails("person-1", "aff-inconnue", { salary: 800000 }, rh("logistics")),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    const person = {
      id: "person-1",
      firstName: "Elodie",
      lastName: "Vasseur",
      affectations: [
        { id: "aff-1", society: "logistics", department: "Commercial", exitDate: null, status: "Actif" },
        { id: "aff-old", society: "tech", department: "Ingénierie", exitDate: new Date(), status: "Actif" },
      ],
    };

    it("autorise le RH d'une société où la personne est actuellement active", async () => {
      (prisma.client.person.findUnique as jest.Mock).mockResolvedValue(person);
      (prisma.client.person.update as jest.Mock).mockResolvedValue({ ...person, phone: "+33600000000" });

      await service.update("person-1", { phone: "+33600000000" }, rh("logistics"));

      expect(prisma.client.person.update).toHaveBeenCalled();
    });

    it("refuse le RH d'une société où l'affectation est clôturée (tech, historique)", async () => {
      (prisma.client.person.findUnique as jest.Mock).mockResolvedValue(person);

      await expect(service.update("person-1", { phone: "+33600000000" }, rh("tech"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.person.update).not.toHaveBeenCalled();
    });

    it("refuse un acteur sans rôle RH", async () => {
      (prisma.client.person.findUnique as jest.Mock).mockResolvedValue(person);

      await expect(service.update("person-1", { phone: "+33600000000" }, nonRh())).rejects.toThrow(ForbiddenException);
    });
  });
});
