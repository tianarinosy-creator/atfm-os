import { ForbiddenException } from "@nestjs/common";
import { BudgetsService } from "./budgets.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

describe("BudgetsService", () => {
  let prisma: PrismaMock;
  let service: BudgetsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new BudgetsService(prisma);
  });

  describe("findAll", () => {
    it("refuse un acteur hors société", async () => {
      await expect(service.findAll({ society: "logistics" }, actorOf("tech"))).rejects.toThrow(ForbiddenException);
    });

    it("calcule le réel consommé par catégorie, converti en EUR, et signale le dépassement", async () => {
      (prisma.client.financeBudget.findMany as jest.Mock).mockResolvedValue([
        { id: "b1", society: "logistics", category: "Marketing", budgeted: 5000, period: "Mensuel" },
        { id: "b2", society: "logistics", category: "Loyer", budgeted: 3000, period: "Mensuel" },
      ]);
      (prisma.client.financeExpense.findMany as jest.Mock).mockResolvedValue([
        { category: "Marketing", amount: 1000, currency: "USD" }, // -> 920 EUR
        { category: "Marketing", amount: 4500, currency: "EUR" },
        { category: "Loyer", amount: 3200, currency: "EUR" }, // dépasse le budget de 3000
        { category: "Personnel", amount: 20000, currency: "EUR" }, // catégorie sans budget, ignorée
      ]);

      const result = await service.findAll({ society: "logistics" }, actorOf("logistics"));

      expect(result[0]).toMatchObject({ category: "Marketing", actual: 5420, over: true, pct: 100 });
      expect(result[1]).toMatchObject({ category: "Loyer", actual: 3200, over: true });
    });
  });

  describe("create", () => {
    it("refuse un acteur hors société", async () => {
      await expect(
        service.create({ society: "logistics", category: "Marketing", budgeted: 5000, period: "Mensuel" }, actorOf("tech")),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.client.financeBudget.create).not.toHaveBeenCalled();
    });
  });
});
