import { Injectable } from "@nestjs/common";
import { DealStage } from "@atfm/db";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/auth.types";
import { assertSocietyMember } from "../common/access/assert-society-member";
import { assertGroupAccess } from "../common/access/assert-group-access";
import { monthKey, toEUR } from "../finance/finance.constants";

const DEAL_STAGES: DealStage[] = ["prospect", "qualification", "proposition", "negociation", "gagne", "perdu"];

/// La BI ne stocke jamais rien de son cru — uniquement des vues calculées à la
/// volée par lecture croisée du Finance et du CRM déjà existants (voir section 3
/// du dossier de passation : "Comparaison inter-filiales (lecture croisée
/// Finance)"). Aucune nouvelle table Prisma pour ce module.
@Injectable()
export class BiService {
  constructor(private readonly prisma: PrismaService) {}

  private async financeTotals(society: string) {
    const [invoices, expenses] = await Promise.all([
      this.prisma.client.financeInvoice.findMany({ where: { society } }),
      this.prisma.client.financeExpense.findMany({ where: { society } }),
    ]);
    const ca = invoices.reduce((s, i) => s + toEUR(i.amount, i.currency), 0);
    const depenses = expenses.reduce((s, e) => s + toEUR(e.amount, e.currency), 0);
    return { invoices, expenses, ca, depenses };
  }

  /// GET /bi/comparison — "Comparaison filiales" : lit le Finance de TOUTES les
  /// sociétés à la fois (voir ComparisonView du prototype). Portée Groupe, comme
  /// Investissements : ce n'est pas parce qu'un acteur peut voir SON Finance
  /// qu'il doit voir celui de toutes les autres filiales (assertGroupAccess).
  async getComparison(actor: AuthenticatedUser) {
    assertGroupAccess(actor);

    const societyRows = await this.prisma.client.affectation.findMany({
      distinct: ["society"],
      select: { society: true },
      orderBy: { society: "asc" },
    });

    const rows = await Promise.all(
      societyRows.map(async ({ society }) => {
        const { ca, depenses } = await this.financeTotals(society);
        return { society, ca, depenses, resultat: ca - depenses };
      }),
    );

    return {
      rows,
      totalCA: rows.reduce((s, r) => s + r.ca, 0),
      totalResultat: rows.reduce((s, r) => s + r.resultat, 0),
    };
  }

  /// GET /bi/financial-analysis?society= — cash flow mensuel + prévision de
  /// trésorerie par projection linéaire de la moyenne des flux nets (voir
  /// FinancialAnalysisView). Scopé société, comme le Finance dont il dérive.
  async getFinancialAnalysis(society: string, actor: AuthenticatedUser) {
    assertSocietyMember(actor, society);

    const { invoices, expenses } = await this.financeTotals(society);

    const map = new Map<string, { in: number; out: number }>();
    invoices.forEach((i) => {
      const k = monthKey(i.issueDate);
      const entry = map.get(k) ?? { in: 0, out: 0 };
      entry.in += toEUR(i.amount, i.currency);
      map.set(k, entry);
    });
    expenses.forEach((e) => {
      const k = monthKey(e.date);
      const entry = map.get(k) ?? { in: 0, out: 0 };
      entry.out += toEUR(e.amount, e.currency);
      map.set(k, entry);
    });

    const cashflowByMonth = [...map.keys()].sort().map((key) => ({ key, ...map.get(key)! }));

    const avgNet = cashflowByMonth.length
      ? Math.round(cashflowByMonth.reduce((s, m) => s + (m.in - m.out), 0) / cashflowByMonth.length)
      : 0;
    const lastBalance = cashflowByMonth.reduce((s, m) => s + (m.in - m.out), 0);
    const forecast = [1, 2, 3].map((n) => ({ label: `M+${n}`, value: lastBalance + avgNet * n }));

    return { cashflowByMonth, avgNet, forecast };
  }

  /// GET /bi/commercial-analysis?society= — valeur du pipeline par étape +
  /// taux de conversion (voir CommercialAnalysisView).
  async getCommercialAnalysis(society: string, actor: AuthenticatedUser) {
    assertSocietyMember(actor, society);

    const [deals, contactsCount] = await Promise.all([
      this.prisma.client.crmDeal.findMany({ where: { society } }),
      this.prisma.client.crmContact.count({ where: { society } }),
    ]);

    const byStage = DEAL_STAGES.map((stage) => {
      const items = deals.filter((d) => d.stage === stage);
      return { stage, value: items.reduce((s, d) => s + d.value, 0), count: items.length };
    });

    const totalNonPerdu = deals.filter((d) => d.stage !== "perdu").length;
    const gagne = deals.filter((d) => d.stage === "gagne").length;
    const winRate = totalNonPerdu ? Math.round((gagne / totalNonPerdu) * 100) : 0;

    return { dealsCount: deals.length, winRate, contactsCount, byStage };
  }

  /// GET /bi/report?society= — synthèse Finance + Commercial pour le rapport
  /// téléchargeable (voir ReportsView.generateReport() ; le .txt est généré
  /// côté frontend à partir de ces chiffres, jamais côté serveur).
  async getReportSummary(society: string, actor: AuthenticatedUser) {
    assertSocietyMember(actor, society);

    const [{ ca, depenses }, dealsCount, contactsCount] = await Promise.all([
      this.financeTotals(society),
      this.prisma.client.crmDeal.count({ where: { society } }),
      this.prisma.client.crmContact.count({ where: { society } }),
    ]);

    return { ca, depenses, resultatNet: ca - depenses, dealsCount, contactsCount };
  }
}
