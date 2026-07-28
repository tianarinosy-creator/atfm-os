import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ExpensesService } from "./expenses.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

describe("ExpensesService", () => {
  let prisma: PrismaMock;
  let service: ExpensesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ExpensesService(prisma);
  });

  describe("findAll", () => {
    it("filtre par catégorie quand fournie", async () => {
      (prisma.client.financeExpense.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll({ society: "logistics", category: "Marketing" }, actorOf("logistics"));

      expect(prisma.client.financeExpense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { society: "logistics", category: "Marketing" } }),
      );
    });

    it("refuse un acteur hors société", async () => {
      await expect(service.findAll({ society: "logistics" }, actorOf("tech"))).rejects.toThrow(ForbiddenException);
    });
  });

  describe("create", () => {
    it("crée la dépense avec le statut 'Payée' par défaut", async () => {
      (prisma.client.financeExpense.create as jest.Mock).mockResolvedValue({ id: "ex-1" });

      await service.create(
        { society: "logistics", label: "Achat matériel", amount: 1200, currency: "EUR", category: "Autre", date: "2026-07-01" },
        actorOf("logistics"),
      );

      expect(prisma.client.financeExpense.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "Payée" }) }),
      );
    });
  });

  describe("update", () => {
    it("404 si la dépense n'existe pas", async () => {
      (prisma.client.financeExpense.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update("missing", {}, actorOf("logistics"))).rejects.toThrow(NotFoundException);
    });
  });
});
