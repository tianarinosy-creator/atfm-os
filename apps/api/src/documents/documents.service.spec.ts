import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { DirectoryLookupService } from "../directory/directory-lookup.service";
import { AuthenticatedUser } from "../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

const OWNER = { personId: "person-1", name: "Léa Fontaine", status: "Actif" };

describe("DocumentsService", () => {
  let prisma: PrismaMock;
  let directory: DirectoryLookupService;
  let service: DocumentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    directory = {
      loadSocietyMembers: jest.fn().mockResolvedValue(new Map([["person-1", OWNER]])),
      assertActiveMember: jest.fn().mockResolvedValue(undefined),
    } as unknown as DirectoryLookupService;
    service = new DocumentsService(prisma, directory);
  });

  describe("findAll", () => {
    it("refuse un acteur hors société", async () => {
      await expect(service.findAll({ society: "tech" }, actorOf("logistics"))).rejects.toThrow(ForbiddenException);
    });

    it("ne montre que les documents actifs par défaut (archived non fourni)", async () => {
      (prisma.client.document.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll({ society: "tech" }, actorOf("tech"));

      expect(prisma.client.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ society: "tech", archived: false }) }),
      );
    });

    it("filtre par catégorie et résout le propriétaire depuis le Core Directory", async () => {
      (prisma.client.document.findMany as jest.Mock).mockResolvedValue([
        { id: "d1", name: "Budget prévisionnel 2027", ownerPersonId: "person-1" },
      ]);

      const result = await service.findAll({ society: "tech", category: "Finance" }, actorOf("tech"));

      expect(prisma.client.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ category: "Finance" }) }),
      );
      expect(result[0].owner).toMatchObject({ name: "Léa Fontaine" });
    });

    it("recherche sur le nom ET le nom du propriétaire résolu", async () => {
      (prisma.client.document.findMany as jest.Mock).mockResolvedValue([
        { id: "d1", name: "Budget prévisionnel 2027", ownerPersonId: "person-1" },
        { id: "d2", name: "Fiche de poste", ownerPersonId: "unknown-person" },
      ]);

      const byName = await service.findAll({ society: "tech", search: "budget" }, actorOf("tech"));
      expect(byName.map((d) => d.id)).toEqual(["d1"]);

      const byOwner = await service.findAll({ society: "tech", search: "fontaine" }, actorOf("tech"));
      expect(byOwner.map((d) => d.id)).toEqual(["d1"]);
    });
  });

  describe("create", () => {
    it("refuse un propriétaire qui n'est pas un membre actif de la société", async () => {
      (directory.assertActiveMember as jest.Mock).mockRejectedValue(new BadRequestException("nope"));

      await expect(
        service.create({ society: "tech", name: "X", category: "RH" as never, ownerPersonId: "person-1" }, actorOf("tech")),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.client.document.create).not.toHaveBeenCalled();
    });

    it("attribue automatiquement un statut de signature 'En attente' pour un Contrat", async () => {
      (prisma.client.document.create as jest.Mock).mockResolvedValue({ id: "d1", ownerPersonId: "person-1" });

      await service.create(
        { society: "tech", name: "Contrat X", category: "Contrats" as never, ownerPersonId: "person-1" },
        actorOf("tech"),
      );

      expect(prisma.client.document.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ signatureStatus: "En attente" }) }),
      );
    });

    it("ne fixe aucun statut de signature pour les autres catégories", async () => {
      (prisma.client.document.create as jest.Mock).mockResolvedValue({ id: "d1", ownerPersonId: "person-1" });

      await service.create(
        { society: "tech", name: "Fiche de poste", category: "RH" as never, ownerPersonId: "person-1" },
        actorOf("tech"),
      );

      expect(prisma.client.document.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ signatureStatus: null }) }),
      );
    });
  });

  describe("newVersion", () => {
    it("404 si le document n'existe pas", async () => {
      (prisma.client.document.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.newVersion("missing", actorOf("tech"))).rejects.toThrow(NotFoundException);
    });

    it("incrémente la version et rafraîchit updatedDate", async () => {
      (prisma.client.document.findUnique as jest.Mock).mockResolvedValue({ id: "d1", society: "tech", ownerPersonId: "person-1" });
      (prisma.client.document.update as jest.Mock).mockResolvedValue({ id: "d1", ownerPersonId: "person-1", version: 2 });

      await service.newVersion("d1", actorOf("tech"));

      expect(prisma.client.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "d1" },
          data: expect.objectContaining({ version: { increment: 1 } }),
        }),
      );
    });
  });

  describe("toggleArchive", () => {
    it("inverse l'état archived", async () => {
      (prisma.client.document.findUnique as jest.Mock).mockResolvedValue({ id: "d1", society: "tech", archived: false, ownerPersonId: "person-1" });
      (prisma.client.document.update as jest.Mock).mockResolvedValue({});

      await service.toggleArchive("d1", actorOf("tech"));

      expect(prisma.client.document.update).toHaveBeenCalledWith({ where: { id: "d1" }, data: { archived: true } });
    });
  });

  describe("toggleSignature", () => {
    it("refuse si le document n'a pas de processus de signature", async () => {
      (prisma.client.document.findUnique as jest.Mock).mockResolvedValue({
        id: "d1",
        society: "tech",
        signatureStatus: null,
        ownerPersonId: "person-1",
      });

      await expect(service.toggleSignature("d1", actorOf("tech"))).rejects.toThrow(BadRequestException);
      expect(prisma.client.document.update).not.toHaveBeenCalled();
    });

    it("bascule En attente -> Signé", async () => {
      (prisma.client.document.findUnique as jest.Mock).mockResolvedValue({
        id: "d1",
        society: "tech",
        signatureStatus: "En attente",
        ownerPersonId: "person-1",
      });
      (prisma.client.document.update as jest.Mock).mockResolvedValue({});

      await service.toggleSignature("d1", actorOf("tech"));

      expect(prisma.client.document.update).toHaveBeenCalledWith({ where: { id: "d1" }, data: { signatureStatus: "Signé" } });
    });
  });

  describe("cyclePermission", () => {
    it("fait tourner Public interne -> Restreint -> Direction uniquement -> Public interne", async () => {
      (prisma.client.document.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "d1",
        society: "tech",
        permissions: "Public interne",
        ownerPersonId: "person-1",
      });
      (prisma.client.document.update as jest.Mock).mockResolvedValue({});

      await service.cyclePermission("d1", actorOf("tech"));
      expect(prisma.client.document.update).toHaveBeenLastCalledWith({ where: { id: "d1" }, data: { permissions: "Restreint" } });

      (prisma.client.document.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "d1",
        society: "tech",
        permissions: "Direction uniquement",
        ownerPersonId: "person-1",
      });
      await service.cyclePermission("d1", actorOf("tech"));
      expect(prisma.client.document.update).toHaveBeenLastCalledWith({ where: { id: "d1" }, data: { permissions: "Public interne" } });
    });
  });
});
