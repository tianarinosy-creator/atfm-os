import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { tenantColors, tenantNames } from "@atfm/ui";
import { apiFetch } from "../../../lib/api";
import { SESSION_COOKIE } from "../../../lib/session";
import { decodeJwtPayload } from "../../../lib/jwt";
import { eur } from "../../../components/eur";
import { LogoutButton } from "../../../components/logout-button";
import { ExportCsvButton } from "../../../components/export-csv-button";

interface JwtPayload {
  societies: string[];
}

interface Invoice {
  id: string;
  client: string;
  amount: number;
  currency: string;
  status: string;
  issueDate: string;
  dueDate: string;
}

interface Expense {
  id: string;
  label: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  status: string;
}

interface Budget {
  id: string;
  category: string;
  budgeted: number;
  period: string;
  actual: number;
  pct: number;
  over: boolean;
}

interface Summary {
  caFacture: number;
  caEncaisse: number;
  totalDepenses: number;
  resultatNet: number;
  tresorerie: number;
  enRetard: { id: string; client: string }[];
  enRetardTotal: number;
  cashflowByMonth: { key: string; in: number; out: number; net: number; running: number }[];
}

function fmtCur(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount || 0);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

function statusColor(status: string) {
  if (status === "Payée") return "#1F9D64";
  if (status === "En retard") return "#D64545";
  return "#C98A1B";
}

export default async function FinancePage({ searchParams }: { searchParams: { society?: string } }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const payload = decodeJwtPayload<JwtPayload>(token);
  const societies = payload?.societies ?? [];
  const society = searchParams.society && societies.includes(searchParams.society) ? searchParams.society : societies[0];

  if (!society) {
    return (
      <div className="min-h-screen bg-bg p-6">
        <p className="text-sm text-ink-soft">
          Aucune affectation active ne vous donne accès à la finance d&apos;une société.
        </p>
      </div>
    );
  }

  const qs = `society=${encodeURIComponent(society)}`;
  const [summary, invoices, expenses, budgets] = await Promise.all([
    apiFetch<Summary>(`/finance/summary?${qs}`, { token }),
    apiFetch<Invoice[]>(`/finance/invoices?${qs}`, { token }),
    apiFetch<Expense[]>(`/finance/expenses?${qs}`, { token }),
    apiFetch<Budget[]>(`/finance/budgets?${qs}`, { token }),
  ]);

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-deep font-mono text-xs font-bold text-white">
            A
          </div>
          <span className="text-sm font-bold tracking-tight text-ink">ATFM OS Capital — Finance</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-ink-soft">
            Trésorerie :{" "}
            <span className="font-semibold" style={{ color: summary.tresorerie >= 0 ? "#1F9D64" : "#D64545" }}>
              {eur(summary.tresorerie)}
            </span>
          </span>
          <a href="/crm" className="text-xs font-semibold text-ink-soft hover:text-ink">
            CRM
          </a>
          <a href="/projets" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Projets
          </a>
          <a href="/rh" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Annuaire
          </a>
          <a href="/gouvernance" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Gouvernance
          </a>
          <a href="/investissements" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Investissements
          </a>
          <LogoutButton />
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-border bg-surface px-6 py-2.5">
        {societies.map((s) => (
          <a
            key={s}
            href={`/finance?society=${s}`}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: s === society ? "#F3F4F7" : "transparent",
              color: s === society ? "#10141C" : "#5B6270",
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: tenantColors[s] ?? "#5B6270" }} />
            {tenantNames[s] ?? s}
          </a>
        ))}
      </div>

      <main className="space-y-8 p-6">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
          {[
            { label: "CA facturé", value: eur(summary.caFacture) },
            { label: "CA encaissé", value: eur(summary.caEncaisse) },
            { label: "Dépenses totales", value: eur(summary.totalDepenses) },
            { label: "Résultat net", value: eur(summary.resultatNet), color: summary.resultatNet >= 0 ? "#1F9D64" : "#D64545" },
            { label: "Trésorerie", value: eur(summary.tresorerie), color: summary.tresorerie >= 0 ? "#1F9D64" : "#D64545" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">{kpi.label}</div>
              <div className="font-mono text-xl font-bold" style={{ color: kpi.color ?? "#10141C" }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        {summary.enRetard.length > 0 && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm font-semibold text-danger">
            {summary.enRetard.length} facture{summary.enRetard.length > 1 ? "s" : ""} en retard de paiement, pour un
            total de {eur(summary.enRetardTotal)}.
          </div>
        )}

        <section>
          <h2 className="mb-2.5 text-sm font-bold text-ink">Flux de trésorerie mensuel</h2>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-alt text-left text-[11px] uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-2">Mois</th>
                  <th className="px-4 py-2">Encaissements</th>
                  <th className="px-4 py-2">Décaissements</th>
                  <th className="px-4 py-2">Flux net</th>
                  <th className="px-4 py-2">Trésorerie cumulée</th>
                </tr>
              </thead>
              <tbody>
                {summary.cashflowByMonth.map((m) => (
                  <tr key={m.key} className="border-b border-border last:border-none">
                    <td className="px-4 py-2 text-sm text-ink">{monthLabel(m.key)}</td>
                    <td className="px-4 py-2 font-mono text-xs text-success">+{eur(m.in)}</td>
                    <td className="px-4 py-2 font-mono text-xs text-danger">-{eur(m.out)}</td>
                    <td className="px-4 py-2 font-mono text-xs" style={{ color: m.net >= 0 ? "#1F9D64" : "#D64545" }}>
                      {m.net >= 0 ? "+" : ""}
                      {eur(m.net)}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs font-bold" style={{ color: m.running >= 0 ? "#10141C" : "#D64545" }}>
                      {eur(m.running)}
                    </td>
                  </tr>
                ))}
                {summary.cashflowByMonth.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-ink-soft">
                      Pas encore de données de flux.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Factures</h2>
            <ExportCsvButton
              filename={`factures-${society}.csv`}
              rows={[
                ["Client", "Montant", "Devise", "Statut", "Émission", "Échéance"],
                ...invoices.map((i) => [i.client, i.amount, i.currency, i.status, fmtDate(i.issueDate), fmtDate(i.dueDate)]),
              ]}
            />
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-alt text-left text-[11px] uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-2">Client</th>
                  <th className="px-4 py-2">Montant</th>
                  <th className="px-4 py-2">Statut</th>
                  <th className="px-4 py-2">Émission</th>
                  <th className="px-4 py-2">Échéance</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-b border-border last:border-none">
                    <td className="px-4 py-2.5 text-sm font-semibold text-ink">{i.client}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink">{fmtCur(i.amount, i.currency)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                        style={{ background: `${statusColor(i.status)}20`, color: statusColor(i.status) }}
                      >
                        {i.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">{fmtDate(i.issueDate)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">{fmtDate(i.dueDate)}</td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-ink-soft">
                      Aucune facture pour l&apos;instant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Dépenses</h2>
            <ExportCsvButton
              filename={`depenses-${society}.csv`}
              rows={[
                ["Libellé", "Montant", "Devise", "Catégorie", "Date", "Statut"],
                ...expenses.map((e) => [e.label, e.amount, e.currency, e.category, fmtDate(e.date), e.status]),
              ]}
            />
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-alt text-left text-[11px] uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-2">Libellé</th>
                  <th className="px-4 py-2">Catégorie</th>
                  <th className="px-4 py-2">Montant</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-none">
                    <td className="px-4 py-2.5 text-sm text-ink">{e.label}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink">{fmtCur(e.amount, e.currency)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">{fmtDate(e.date)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                        style={{ background: `${statusColor(e.status)}20`, color: statusColor(e.status) }}
                      >
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-ink-soft">
                      Aucune dépense pour l&apos;instant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-bold text-ink">Budgets</h2>
          {budgets.length === 0 ? (
            <p className="text-xs text-ink-soft">Aucun budget défini.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
              {budgets.map((b) => (
                <div key={b.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">{b.category}</span>
                    <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                      {b.period}
                    </span>
                  </div>
                  <div className="mb-2.5 h-2 overflow-hidden rounded-full bg-surface-alt">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${b.pct}%`, background: b.over ? "#D64545" : (tenantColors[society] ?? "#5B6270") }}
                    />
                  </div>
                  <div className="text-sm">
                    <span style={{ color: b.over ? "#D64545" : "#10141C" }} className="font-mono font-semibold">
                      {eur(b.actual)}
                    </span>
                    <span className="font-mono text-ink-soft"> / {eur(b.budgeted)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
