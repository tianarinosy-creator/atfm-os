import { ForbiddenException } from "@nestjs/common";
import { BiService } from "./bi.service";
import { AuthenticatedUser } from "../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

describe("BiService", () => {
  let prisma: PrismaMock;
  let service: BiService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new BiService(prisma);
  });

  describe("getComparison", () => {
    it("refuse un acteur hors société holding (atfm)", async () => {
      await expect(service.getComparison(actorOf("tech"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.affectation.findMany).not.toHaveBeenCalled();
    });

    it("agrège CA/dépenses/résultat par société et calcule les totaux groupe", async () => {
      (prisma.client.affectation.findMany as jest.Mock).mockResolvedValue([{ society: "logistics" }, { society: "tech" }]);
      (prisma.client.financeInvoice.findMany as jest.Mock)
        .mockResolvedValueOnce([{ amount: 10000, currency: "EUR" }])
        .mockResolvedValueOnce([{ amount: 5000, currency: "EUR" }]);
      (prisma.client.financeExpense.findMany as jest.Mock)
        .mockResolvedValueOnce([{ amount: 4000, currency: "EUR" }])
        .mockResolvedValueOnce([{ amount: 6000, currency: "EUR" }]);

      const result = await service.getComparison(actorOf("atfm"));

      expect(result.rows).toEqual([
        { society: "logistics", ca: 10000, depenses: 4000, resultat: 6000 },
        { society: "tech", ca: 5000, depenses: 6000, resultat: -1000 },
      ]);
      expect(result.totalCA).toBe(15000);
      expect(result.totalResultat).toBe(5000);
    });
  });

  describe("getFinancialAnalysis", () => {
    it("refuse un acteur hors société", async () => {
      await expect(service.getFinancialAnalysis("tech", actorOf("logistics"))).rejects.toThrow(ForbiddenException);
    });

    it("calcule le cash flow mensuel et une prévision linéaire sur la moyenne des flux nets", async () => {
      (prisma.client.financeInvoice.findMany as jest.Mock).mockResolvedValue([
        { amount: 10000, currency: "EUR", issueDate: new Date("2026-01-15") },
        { amount: 20000, currency: "EUR", issueDate: new Date("2026-02-10") },
      ]);
      (prisma.client.financeExpense.findMany as jest.Mock).mockResolvedValue([
        { amount: 4000, currency: "EUR", date: new Date("2026-01-20") },
        { amount: 6000, currency: "EUR", date: new Date("2026-02-05") },
      ]);

      const result = await service.getFinancialAnalysis("tech", actorOf("tech"));

      expect(result.cashflowByMonth).toEqual([
        { key: "2026-01", in: 10000, out: 4000 },
        { key: "2026-02", in: 20000, out: 6000 },
      ]);
      // nets : +6000, +14000 -> moyenne 10000, solde cumulé 20000
      expect(result.avgNet).toBe(10000);
      expect(result.forecast).toEqual([
        { label: "M+1", value: 30000 },
        { label: "M+2", value: 40000 },
        { label: "M+3", value: 50000 },
      ]);
    });

    it("ne plante pas si aucune donnée (moyenne à 0)", async () => {
      (prisma.client.financeInvoice.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.client.financeExpense.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getFinancialAnalysis("tech", actorOf("tech"));

      expect(result.avgNet).toBe(0);
      expect(result.forecast.every((f) => f.value === 0)).toBe(true);
    });
  });

  describe("getCommercialAnalysis", () => {
    it("refuse un acteur hors société", async () => {
      await expect(service.getCommercialAnalysis("tech", actorOf("logistics"))).rejects.toThrow(ForbiddenException);
    });

    it("calcule la valeur du pipeline par étape et le taux de conversion", async () => {
      (prisma.client.crmDeal.findMany as jest.Mock).mockResolvedValue([
        { stage: "prospect", value: 1000 },
        { stage: "gagne", value: 5000 },
        { stage: "gagne", value: 3000 },
        { stage: "perdu", value: 2000 },
      ]);
      (prisma.client.crmContact.count as jest.Mock).mockResolvedValue(7);

      const result = await service.getCommercialAnalysis("tech", actorOf("tech"));

      expect(result.dealsCount).toBe(4);
      expect(result.contactsCount).toBe(7);
      // gagné = 2, non-perdu = 3 (tous sauf le perdu) -> 2/3 = 67%
      expect(result.winRate).toBe(67);
      expect(result.byStage.find((s) => s.stage === "gagne")).toMatchObject({ value: 8000, count: 2 });
      expect(result.byStage.find((s) => s.stage === "prospect")).toMatchObject({ value: 1000, count: 1 });
    });

    it("taux de conversion à 0 sans affaire non perdue", async () => {
      (prisma.client.crmDeal.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.client.crmContact.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getCommercialAnalysis("tech", actorOf("tech"));

      expect(result.winRate).toBe(0);
    });
  });

  describe("getReportSummary", () => {
    it("refuse un acteur hors société", async () => {
      await expect(service.getReportSummary("tech", actorOf("logistics"))).rejects.toThrow(ForbiddenException);
    });

    it("combine Finance et Commercial pour le rapport de synthèse", async () => {
      (prisma.client.financeInvoice.findMany as jest.Mock).mockResolvedValue([{ amount: 10000, currency: "EUR" }]);
      (prisma.client.financeExpense.findMany as jest.Mock).mockResolvedValue([{ amount: 4000, currency: "EUR" }]);
      (prisma.client.crmDeal.count as jest.Mock).mockResolvedValue(3);
      (prisma.client.crmContact.count as jest.Mock).mockResolvedValue(9);

      const result = await service.getReportSummary("tech", actorOf("tech"));

      expect(result).toEqual({ ca: 10000, depenses: 4000, resultatNet: 6000, dealsCount: 3, contactsCount: 9 });
    });
  });
});
