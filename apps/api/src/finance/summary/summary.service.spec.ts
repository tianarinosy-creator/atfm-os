import { ForbiddenException } from "@nestjs/common";
import { SummaryService } from "./summary.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

describe("SummaryService", () => {
  let prisma: PrismaMock;
  let service: SummaryService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new SummaryService(prisma);
  });

  it("refuse un acteur hors société", async () => {
    await expect(service.getSummary("logistics", actorOf("tech"))).rejects.toThrow(ForbiddenException);
  });

  it("calcule les KPIs, la liste des retards et le cash flow mensuel cumulé, multi-devises", async () => {
    (prisma.client.financeInvoice.findMany as jest.Mock).mockResolvedValue([
      { id: "inv1", client: "A", amount: 1000, currency: "USD", status: "Payée", issueDate: new Date(2026, 0, 10), dueDate: new Date(2026, 0, 20) },
      { id: "inv2", client: "B", amount: 2000, currency: "EUR", status: "En attente", issueDate: new Date(2026, 0, 15), dueDate: new Date(2026, 1, 1) },
      { id: "inv3", client: "C", amount: 500, currency: "EUR", status: "En retard", issueDate: new Date(2026, 1, 1), dueDate: new Date(2026, 0, 15) },
    ]);
    (prisma.client.financeExpense.findMany as jest.Mock).mockResolvedValue([
      { category: "Loyer", amount: 300, currency: "EUR", status: "Payée", date: new Date(2026, 0, 20) },
      { category: "Marketing", amount: 100, currency: "GBP", status: "En attente", date: new Date(2026, 1, 5) },
    ]);

    const result = await service.getSummary("logistics", actorOf("logistics"));

    // inv1: 1000 USD -> 920 EUR ; total facturé = 920 + 2000 + 500
    expect(result.caFacture).toBe(3420);
    // seule inv1 (Payée) compte dans l'encaissé
    expect(result.caEncaisse).toBe(920);
    // 300 EUR + 100 GBP (117 EUR)
    expect(result.totalDepenses).toBe(417);
    expect(result.depensesPayees).toBe(300);
    expect(result.tresorerie).toBe(920 - 300);
    expect(result.resultatNet).toBe(3420 - 417);

    expect(result.enRetard).toHaveLength(1);
    expect(result.enRetard[0]).toMatchObject({ id: "inv3", client: "C" });
    expect(result.enRetardTotal).toBe(500);

    expect(result.cashflowByMonth).toEqual([
      { key: "2026-01", in: 2920, out: 300, net: 2620, running: 2620 },
      { key: "2026-02", in: 500, out: 117, net: 383, running: 3003 },
    ]);
    // La trésorerie cumulée en fin de période doit correspondre au résultat net.
    expect(result.cashflowByMonth.at(-1)?.running).toBe(result.resultatNet);
  });
});
