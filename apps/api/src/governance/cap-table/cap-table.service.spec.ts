import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { CapTableService } from "./cap-table.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

describe("CapTableService", () => {
  let prisma: PrismaMock;
  let service: CapTableService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new CapTableService(prisma);
  });

  describe("getCapTable", () => {
    it("refuse un acteur hors société", async () => {
      await expect(service.getCapTable({ society: "logistics" }, actorOf("tech"))).rejects.toThrow(ForbiddenException);
    });

    it("calcule le % réparti et la valeur estimée par actionnaire", async () => {
      (prisma.client.governanceValuation.findUnique as jest.Mock).mockResolvedValue({ society: "atfm", valuation: 42_000_000 });
      (prisma.client.shareholder.findMany as jest.Mock).mockResolvedValue([
        { id: "s1", name: "Alexandre Ferrand", type: "Personne", percentage: 38 },
        { id: "s2", name: "Bpifrance", type: "Société", percentage: 15 },
      ]);

      const result = await service.getCapTable({ society: "atfm" }, actorOf("atfm"));

      expect(result.totalPct).toBe(53);
      expect(result.shareholders[0]).toMatchObject({ id: "s1", value: 15_960_000 });
      expect(result.shareholders[1]).toMatchObject({ id: "s2", value: 6_300_000 });
    });

    it("renvoie une valorisation à 0 si aucune ligne n'existe encore", async () => {
      (prisma.client.governanceValuation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.client.shareholder.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getCapTable({ society: "atfm" }, actorOf("atfm"));

      expect(result.valuation).toBe(0);
      expect(result.totalPct).toBe(0);
    });
  });

  describe("setValuation", () => {
    it("refuse un acteur hors société", async () => {
      await expect(service.setValuation({ society: "logistics", valuation: 1000 }, actorOf("tech"))).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.client.governanceValuation.upsert).not.toHaveBeenCalled();
    });

    it("upsert la valorisation (crée ou met à jour)", async () => {
      await service.setValuation({ society: "logistics", valuation: 20_000_000 }, actorOf("logistics"));

      expect(prisma.client.governanceValuation.upsert).toHaveBeenCalledWith({
        where: { society: "logistics" },
        create: { society: "logistics", valuation: 20_000_000 },
        update: { valuation: 20_000_000 },
      });
    });
  });

  describe("removeShareholder", () => {
    it("404 si l'actionnaire n'existe pas", async () => {
      (prisma.client.shareholder.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.removeShareholder("missing", actorOf("logistics"))).rejects.toThrow(NotFoundException);
    });
  });
});
