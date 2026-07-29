import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { MappingService } from "./mapping.service";
import { AuthenticatedUser } from "../../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

describe("MappingService", () => {
  let prisma: PrismaMock;
  let service: MappingService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new MappingService(prisma);
  });

  describe("getMapping", () => {
    it("refuse un acteur hors société", async () => {
      await expect(service.getMapping("tech", actorOf("logistics"))).rejects.toThrow(ForbiddenException);
    });

    it("404 si aucune connexion Odoo n'est configurée", async () => {
      (prisma.client.odooConnection.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getMapping("tech", actorOf("tech"))).rejects.toThrow(NotFoundException);
    });

    it("amorce la correspondance par défaut pour un module sélectionné sans mapping existant", async () => {
      (prisma.client.odooConnection.findUnique as jest.Mock).mockResolvedValue({ society: "tech", selectedModules: ["crm"] });
      (prisma.client.odooFieldMapping.count as jest.Mock).mockResolvedValue(0);
      (prisma.client.odooFieldMapping.findMany as jest.Mock).mockResolvedValue([
        { moduleId: "crm", odooField: "name", atfmLabel: "Titre de l'affaire" },
      ]);

      const result = await service.getMapping("tech", actorOf("tech"));

      expect(prisma.client.odooFieldMapping.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ society: "tech", moduleId: "crm", odooField: "name" })]),
        }),
      );
      expect(result.crm).toEqual([{ odooField: "name", atfmLabel: "Titre de l'affaire" }]);
    });

    it("ne réamorce pas un module qui a déjà une correspondance", async () => {
      (prisma.client.odooConnection.findUnique as jest.Mock).mockResolvedValue({ society: "tech", selectedModules: ["crm"] });
      (prisma.client.odooFieldMapping.count as jest.Mock).mockResolvedValue(6);
      (prisma.client.odooFieldMapping.findMany as jest.Mock).mockResolvedValue([]);

      await service.getMapping("tech", actorOf("tech"));

      expect(prisma.client.odooFieldMapping.createMany).not.toHaveBeenCalled();
    });
  });

  describe("updateField", () => {
    it("met à jour uniquement l'intitulé ATFM du champ ciblé", async () => {
      (prisma.client.odooFieldMapping.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.client.odooConnection.findUnique as jest.Mock).mockResolvedValue({ society: "tech", selectedModules: [] });
      (prisma.client.odooFieldMapping.findMany as jest.Mock).mockResolvedValue([]);

      await service.updateField("tech", { moduleId: "crm", odooField: "name", atfmLabel: "Nouveau libellé" }, actorOf("tech"));

      expect(prisma.client.odooFieldMapping.updateMany).toHaveBeenCalledWith({
        where: { society: "tech", moduleId: "crm", odooField: "name" },
        data: { atfmLabel: "Nouveau libellé" },
      });
    });
  });
});
