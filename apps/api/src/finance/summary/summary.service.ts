import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { assertSocietyMember } from "../../common/access/assert-society-member";
import { monthKey, toEUR } from "../finance.constants";

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  /// GET /finance/summary?society= — équivalent des props calculées dans
  /// FinanceMain du prototype (KPIs du dashboard + cash flow mensuel).
  async getSummary(society: string, actor: AuthenticatedUser) {
    assertSocietyMember(actor, society);

    const [invoices, expenses] = await Promise.all([
      this.prisma.client.financeInvoice.findMany({ where: { society } }),
      this.prisma.client.financeExpense.findMany({ where: { society } }),
    ]);

    const caFacture = invoices.reduce((s, i) => s + toEUR(i.amount, i.currency), 0);
    const caEncaisse = invoices.filter((i) => i.status === "Payée").reduce((s, i) => s + toEUR(i.amount, i.currency), 0);
    const totalDepenses = expenses.reduce((s, e) => s + toEUR(e.amount, e.currency), 0);
    const depensesPayees = expenses.filter((e) => e.status === "Payée").reduce((s, e) => s + toEUR(e.amount, e.currency), 0);
    const tresorerie = caEncaisse - depensesPayees;
    const resultatNet = caFacture - totalDepenses;

    const enRetard = invoices.filter((i) => i.status === "En retard");
    const enRetardTotal = enRetard.reduce((s, i) => s + toEUR(i.amount, i.currency), 0);

    const cashflowMap = new Map<string, { in: number; out: number }>();
    invoices.forEach((i) => {
      const k = monthKey(i.issueDate);
      const entry = cashflowMap.get(k) ?? { in: 0, out: 0 };
      entry.in += toEUR(i.amount, i.currency);
      cashflowMap.set(k, entry);
    });
    expenses.forEach((e) => {
      const k = monthKey(e.date);
      const entry = cashflowMap.get(k) ?? { in: 0, out: 0 };
      entry.out += toEUR(e.amount, e.currency);
      cashflowMap.set(k, entry);
    });

    let running = 0;
    const cashflowByMonth = [...cashflowMap.keys()]
      .sort()
      .map((key) => {
        const { in: cashIn, out: cashOut } = cashflowMap.get(key)!;
        const net = cashIn - cashOut;
        running += net;
        return { key, in: cashIn, out: cashOut, net, running };
      });

    return {
      caFacture,
      caEncaisse,
      totalDepenses,
      depensesPayees,
      tresorerie,
      resultatNet,
      enRetard: enRetard.map((i) => ({ id: i.id, client: i.client, amount: i.amount, currency: i.currency, dueDate: i.dueDate })),
      enRetardTotal,
      cashflowByMonth,
    };
  }
}
