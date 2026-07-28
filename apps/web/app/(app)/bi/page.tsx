import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { tenantColors, tenantNames } from "@atfm/ui";
import { apiFetch } from "../../../lib/api";
import { SESSION_COOKIE } from "../../../lib/session";
import { decodeJwtPayload } from "../../../lib/jwt";
import { eur } from "../../../components/eur";
import { LogoutButton } from "../../../components/logout-button";
import { DownloadReportButton } from "../../../components/download-report-button";

interface JwtPayload {
  societies: string[];
}

interface ComparisonRow {
  society: string;
  ca: number;
  depenses: number;
  resultat: number;
}

interface Comparison {
  rows: ComparisonRow[];
  totalCA: number;
  totalResultat: number;
}

interface FinancialAnalysis {
  cashflowByMonth: { key: string; in: number; out: number }[];
  avgNet: number;
  forecast: { label: string; value: number }[];
}

interface CommercialAnalysis {
  dealsCount: number;
  winRate: number;
  contactsCount: number;
  byStage: { stage: string; value: number; count: number }[];
}

interface ReportSummary {
  ca: number;
  depenses: number;
  resultatNet: number;
  dealsCount: number;
  contactsCount: number;
}

const TABS = [
  { id: "comparaison", label: "Comparaison filiales" },
  { id: "financiere", label: "Analyse financière" },
  { id: "commerciale", label: "Analyse commerciale" },
  { id: "rapports", label: "Rapports" },
] as const;

const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  qualification: "Qualification",
  proposition: "Proposition",
  negociation: "Négociation",
  gagne: "Gagné",
  perdu: "Perdu",
};

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

export default async function BiPage({
  searchParams,
}: {
  searchParams: { society?: string; tab?: string };
}) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const payload = decodeJwtPayload<JwtPayload>(token);
  const societies = payload?.societies ?? [];
  const society = searchParams.society && societies.includes(searchParams.society) ? searchParams.society : societies[0];
  const hasGroupAccess = societies.includes("atfm");

  if (!society) {
    return (
      <div className="min-h-screen bg-bg p-6">
        <p className="text-sm text-ink-soft">
          Aucune affectation active ne vous donne accès à la BI d&apos;une société.
        </p>
      </div>
    );
  }

  const requestedTab = TABS.some((t) => t.id === searchParams.tab) ? (searchParams.tab as string) : undefined;
  const tab = requestedTab ?? (hasGroupAccess ? "comparaison" : "financiere");

  const comparison = hasGroupAccess ? await apiFetch<Comparison>("/bi/comparison", { token }) : null;

  let financial: FinancialAnalysis | null = null;
  let commercial: CommercialAnalysis | null = null;
  let report: ReportSummary | null = null;
  if (tab === "financiere") financial = await apiFetch<FinancialAnalysis>(`/bi/financial-analysis?society=${society}`, { token });
  if (tab === "commerciale") commercial = await apiFetch<CommercialAnalysis>(`/bi/commercial-analysis?society=${society}`, { token });
  if (tab === "rapports") report = await apiFetch<ReportSummary>(`/bi/report?society=${society}`, { token });

  const maxCA = comparison ? Math.max(1, ...comparison.rows.map((r) => r.ca)) : 1;
  const maxStageValue = commercial ? Math.max(1, ...commercial.byStage.map((s) => s.value)) : 1;

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-deep font-mono text-xs font-bold text-white">
            A
          </div>
          <span className="text-sm font-bold tracking-tight text-ink">ATFM OS Capital — Business Intelligence</span>
        </div>
        <div className="flex items-center gap-4">
          {comparison && (
            <span className="font-mono text-xs text-ink-soft">
              CA groupe : <span className="font-semibold text-ink">{eur(comparison.totalCA)}</span> · Résultat groupe :{" "}
              <span className="font-semibold text-ink">{eur(comparison.totalResultat)}</span>
            </span>
          )}
          <a href="/crm" className="text-xs font-semibold text-ink-soft hover:text-ink">
            CRM
          </a>
          <a href="/projets" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Projets
          </a>
          <a href="/rh" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Annuaire
          </a>
          <a href="/finance" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Finance
          </a>
          <a href="/gouvernance" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Gouvernance
          </a>
          <a href="/investissements" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Investissements
          </a>
          <a href="/documents" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Documents
          </a>
          <LogoutButton />
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-border bg-surface px-6 py-2.5">
        {societies.map((s) => (
          <a
            key={s}
            href={`/bi?society=${s}&tab=${tab}`}
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

      <div className="flex items-center gap-2 border-b border-border bg-surface px-6 py-2.5">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`/bi?society=${society}&tab=${t.id}`}
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: t.id === tab ? "#F3F4F7" : "transparent", color: t.id === tab ? "#10141C" : "#5B6270" }}
          >
            {t.label}
          </a>
        ))}
      </div>

      <main className="p-6">
        {tab === "comparaison" &&
          (!hasGroupAccess ? (
            <p className="text-sm text-ink-soft">
              La comparaison inter-filiales est réservée aux personnes ayant une affectation active chez ATFM Legacy.
            </p>
          ) : (
            comparison && (
              <div>
                <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  Chiffre d&apos;affaires facturé par filiale
                </div>
                <div className="mb-6 flex h-56 gap-4 border-b border-border pb-2">
                  {comparison.rows.map((r) => (
                    <div key={r.society} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <div
                        className="w-8 rounded-t"
                        style={{ height: `${(r.ca / maxCA) * 100}%`, background: tenantColors[r.society] ?? "#5B6270" }}
                        title={eur(r.ca)}
                      />
                      <span className="text-center text-[10.5px] text-ink-soft">
                        {(tenantNames[r.society] ?? r.society).replace("Havanana ", "")}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="overflow-hidden rounded-lg border border-border bg-surface">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-surface-alt text-left text-[11px] uppercase tracking-wide text-ink-soft">
                        <th className="px-4 py-2">Filiale</th>
                        <th className="px-4 py-2">CA facturé</th>
                        <th className="px-4 py-2">Dépenses</th>
                        <th className="px-4 py-2">Résultat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.rows.map((r) => (
                        <tr key={r.society} className="border-b border-border last:border-none">
                          <td className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: tenantColors[r.society] ?? "#5B6270" }} />
                            {tenantNames[r.society] ?? r.society}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-ink">{eur(r.ca)}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-ink">{eur(r.depenses)}</td>
                          <td
                            className="px-4 py-2.5 font-mono text-xs font-bold"
                            style={{ color: r.resultat >= 0 ? "#1F9D64" : "#D64545" }}
                          >
                            {eur(r.resultat)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ))}

        {tab === "financiere" && financial && (
          <div>
            <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-soft">
              Historique du flux net mensuel — {tenantNames[society] ?? society}
            </div>
            <div className="mb-6 overflow-hidden rounded-lg border border-border bg-surface">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-alt text-left text-[11px] uppercase tracking-wide text-ink-soft">
                    <th className="px-4 py-2">Mois</th>
                    <th className="px-4 py-2">Encaissé</th>
                    <th className="px-4 py-2">Décaissé</th>
                    <th className="px-4 py-2">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {financial.cashflowByMonth.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-xs text-ink-soft">
                        Aucune donnée disponible.
                      </td>
                    </tr>
                  )}
                  {financial.cashflowByMonth.map((m) => (
                    <tr key={m.key} className="border-b border-border last:border-none">
                      <td className="px-4 py-2.5 text-sm text-ink">{monthLabel(m.key)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "#1F9D64" }}>
                        +{eur(m.in)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "#D64545" }}>
                        -{eur(m.out)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-ink">{eur(m.in - m.out)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-soft">
              Prévision de trésorerie (projection linéaire à partir de la moyenne mensuelle)
            </div>
            <div className="mb-4 grid grid-cols-3 gap-3.5">
              {financial.forecast.map((f) => (
                <div key={f.label} className="rounded-lg border border-border bg-surface p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{f.label}</div>
                  <div
                    className="mt-2 font-mono text-lg font-bold"
                    style={{ color: f.value >= 0 ? "#10141C" : "#D64545" }}
                  >
                    {eur(f.value)}
                  </div>
                </div>
              ))}
            </div>
            <div
              className="flex items-center gap-2 rounded-lg p-3 text-xs"
              style={{ background: "#6E56CF15", color: "#6E56CF", border: "1px solid #6E56CF33" }}
            >
              ✦ Projection indicative basée sur la moyenne des flux nets observés ({eur(financial.avgNet)}/mois). À affiner avec des
              hypothèses métier.
            </div>
          </div>
        )}

        {tab === "commerciale" && commercial && (
          <div>
            <div className="mb-4 grid grid-cols-3 gap-3.5">
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Affaires actives</div>
                <div className="mt-2 font-mono text-lg font-bold text-ink">{commercial.dealsCount}</div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Taux de conversion</div>
                <div className="mt-2 font-mono text-lg font-bold text-ink">{commercial.winRate}%</div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Contacts</div>
                <div className="mt-2 font-mono text-lg font-bold text-ink">{commercial.contactsCount}</div>
              </div>
            </div>

            <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-soft">
              Valeur du pipeline par étape — {tenantNames[society] ?? society}
            </div>
            <div className="flex h-52 gap-4 border-b border-border pb-2">
              {commercial.byStage.map((s) => (
                <div key={s.stage} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="w-8 rounded-t"
                    style={{ height: `${(s.value / maxStageValue) * 100}%`, background: tenantColors[society] ?? "#5B6270" }}
                    title={`${eur(s.value)} (${s.count})`}
                  />
                  <span className="text-center text-[10.5px] text-ink-soft">{STAGE_LABELS[s.stage] ?? s.stage}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "rapports" && report && (
          <div className="w-64 rounded-lg border border-border border-t-[3px] bg-surface p-4 shadow-sm" style={{ borderTopColor: tenantColors[society] ?? "#5B6270" }}>
            <div className="text-sm font-bold text-ink">Rapport de synthèse</div>
            <div className="mb-1 text-xs text-ink-soft">Finance + Commercial · {tenantNames[society] ?? society}</div>
            <DownloadReportButton
              filename={`rapport-${tenantNames[society] ?? society}.txt`}
              lines={[
                `RAPPORT DE SYNTHÈSE — ${tenantNames[society] ?? society}`,
                `Généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`,
                "",
                "=== FINANCE ===",
                `CA facturé : ${eur(report.ca)}`,
                `Dépenses totales : ${eur(report.depenses)}`,
                `Résultat net : ${eur(report.resultatNet)}`,
                "",
                "=== COMMERCIAL ===",
                `Affaires en cours : ${report.dealsCount}`,
                `Contacts enregistrés : ${report.contactsCount}`,
              ]}
            />
          </div>
        )}
      </main>
    </div>
  );
}
