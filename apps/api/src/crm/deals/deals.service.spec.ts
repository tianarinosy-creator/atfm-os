import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { DealsService } from "./deals.service";
import { DirectoryLookupService } from "../../directory/directory-lookup.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

const OWNER = { personId: "commercial-1", name: "Sarah Kaced", status: "Actif" };

describe("DealsService", () => {
  let prisma: PrismaMock;
  let directory: DirectoryLookupService;
  let service: DealsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    directory = {
      loadCommercials: jest.fn().mockResolvedValue(new Map([["commercial-1", OWNER]])),
      assertActiveCommercial: jest.fn().mockResolvedValue(undefined),
    } as unknown as DirectoryLookupService;
    service = new DealsService(prisma, directory);
  });

  describe("create", () => {
    const dto = { society: "logistics", contactId: "contact-1", title: "Mission conseil" };

    it("refuse un acteur hors société", async () => {
      await expect(service.create(dto, actorOf("tech"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.crmDeal.create).not.toHaveBeenCalled();
    });

    it("404 si le contact n'appartient pas à la société de l'affaire", async () => {
      (prisma.client.crmContact.findUnique as jest.Mock).mockResolvedValue({ id: "contact-1", society: "tech" });

      await expect(service.create(dto, actorOf("logistics"))).rejects.toThrow(NotFoundException);
      expect(prisma.client.crmDeal.create).not.toHaveBeenCalled();
    });

    it("crée l'affaire et résout le commercial en charge depuis le Core Directory", async () => {
      (prisma.client.crmContact.findUnique as jest.Mock).mockResolvedValue({ id: "contact-1", society: "logistics" });
      (prisma.client.crmDeal.create as jest.Mock).mockResolvedValue({
        id: "deal-1",
        society: "logistics",
        ownerPersonId: "commercial-1",
      });

      const result = await service.create({ ...dto, ownerPersonId: "commercial-1" }, actorOf("logistics"));

      expect(directory.assertActiveCommercial).toHaveBeenCalledWith("logistics", "commercial-1");
      expect(result.owner).toEqual(OWNER);
    });
  });

  describe("update", () => {
    it("404 si l'affaire n'existe pas", async () => {
      (prisma.client.crmDeal.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update("missing", {}, actorOf("logistics"))).rejects.toThrow(NotFoundException);
    });

    it("403 si l'acteur n'a pas d'affectation active dans la société de l'affaire", async () => {
      (prisma.client.crmDeal.findUnique as jest.Mock).mockResolvedValue({ id: "d1", society: "logistics" });

      await expect(service.update("d1", { stage: "gagne" as any }, actorOf("tech"))).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("efface la relance prévue quand nextActionDate: null est fourni", async () => {
      (prisma.client.crmDeal.findUnique as jest.Mock).mockResolvedValue({ id: "d1", society: "logistics" });
      (prisma.client.crmDeal.update as jest.Mock).mockResolvedValue({ id: "d1", society: "logistics", ownerPersonId: null });

      await service.update("d1", { nextActionDate: null }, actorOf("logistics"));

      expect(prisma.client.crmDeal.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ nextActionDate: null }) }),
      );
    });
  });

  describe("addActivity", () => {
    it("404 si l'affaire n'existe pas", async () => {
      (prisma.client.crmDeal.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addActivity("missing", { type: "call" as any, text: "Appel" }, actorOf("logistics")),
      ).rejects.toThrow(NotFoundException);
    });

    it("ajoute l'activité pour un acteur membre de la société", async () => {
      (prisma.client.crmDeal.findUnique as jest.Mock).mockResolvedValue({ id: "d1", society: "logistics" });
      (prisma.client.crmActivity.create as jest.Mock).mockResolvedValue({ id: "act-1" });

      await service.addActivity("d1", { type: "call" as any, text: "Premier contact" }, actorOf("logistics"));

      expect(prisma.client.crmActivity.create).toHaveBeenCalledWith({
        data: { dealId: "d1", type: "call", text: "Premier contact" },
      });
    });
  });

  describe("findContracts", () => {
    it("ne retient que les affaires en négociation ou gagnées, avec le flag signed", async () => {
      (prisma.client.crmDeal.findMany as jest.Mock).mockResolvedValue([
        { id: "d1", society: "logistics", stage: "negociation", ownerPersonId: null },
        { id: "d2", society: "logistics", stage: "gagne", ownerPersonId: null },
      ]);

      const result = await service.findContracts("logistics", actorOf("logistics"));

      expect(prisma.client.crmDeal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { society: "logistics", stage: { in: ["negociation", "gagne"] } } }),
      );
      expect(result).toEqual([
        expect.objectContaining({ id: "d1", signed: false }),
        expect.objectContaining({ id: "d2", signed: true }),
      ]);
    });

    it("refuse un acteur hors société", async () => {
      await expect(service.findContracts("logistics", actorOf("tech"))).rejects.toThrow(ForbiddenException);
    });
  });
});
