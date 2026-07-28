import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "../../../../lib/api";
import { SESSION_COOKIE } from "../../../../lib/session";
import { decodeJwtPayload } from "../../../../lib/jwt";
import { eur } from "../../../../components/eur";
import { LogoutButton } from "../../../../components/logout-button";

interface JwtPayload {
  societies: string[];
}

interface DueDiligenceItem {
  id: string;
  text: string;
  done: boolean;
}

interface CapTableEntry {
  id: string;
  investor: string;
  percentage: number;
  amount: number;
}

interface StartupInvestor {
  id: string;
  name: string;
  type: string;
  contact: string;
}

interface HistoryEvent {
  id: string;
  event: string;
  description: string;
  date: string;
}

interface StartupDetail {
  id: string;
  name: string;
  sector: string;
  stage: "sourcing" | "pitch" | "dd" | "termsheet" | "investi" | "refuse";
  founder: string;
  description: string;
  pitchNotes: string;
  businessPlanNotes: string;
  dueDiligenceStatus: string;
  dueDiligenceItems: DueDiligenceItem[];
  round: string;
  amountTarget: number;
  amountRaised: number;
  roundStatus: string;
  valuationPreMoney: number | null;
  valuationPostMoney: number | null;
  currentValuation: number;
  atfmInvested: number;
  atfmStakePercentage: number;
  dateInvested: string | null;
  capTable: CapTableEntry[];
  investors: StartupInvestor[];
  history: HistoryEvent[];
}

const STAGE_LABELS: Record<string, string> = {
  sourcing: "Sourcing",
  pitch: "Pitch reçu",
  dd: "Due Diligence",
  termsheet: "Term Sheet",
  investi: "Investi",
  refuse: "Refusé",
};

const CAP_PALETTE = ["#6E56CF", "#14224A", "#1F6F8B", "#B08A3E", "#2F8F5B", "#B5482D", "#7A3B69"];

function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function StartupDetailPage({ params }: { params: { id: string } }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const payload = decodeJwtPayload<JwtPayload>(token);
  const societies = payload?.societies ?? [];

  if (!societies.includes("atfm")) {
    return (
      <div className="min-h-screen bg-bg p-6">
        <p className="text-sm text-ink-soft">
          Le module Investissements est réservé aux personnes ayant une affectation active chez ATFM Legacy.
        </p>
      </div>
    );
  }

  const startup = await apiFetch<StartupDetail>(`/investments/startups/${params.id}`, { token });
  const currentStake = Math.round((startup.currentValuation || 0) * ((startup.atfmStakePercentage || 0) / 100));
  const ddDone = startup.dueDiligenceItems.filter((c) => c.done).length;
  const ddTotal = startup.dueDiligenceItems.length;

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5">
        <a href="/investissements" className="text-xs font-semibold text-ink-soft hover:text-ink">
          ← Investissements
        </a>
        <LogoutButton />
      </header>

      <div className="border-b border-border bg-surface px-6 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-ink">{startup.name}</h1>
              <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10.5px] font-bold text-ink-soft">
                {STAGE_LABELS[startup.stage]}
              </span>
            </div>
            <p className="text-xs text-ink-soft">
              {startup.sector} · Fondateur : {startup.founder}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Valorisation actuelle</div>
              <div className="font-mono text-xs font-bold text-ink">{eur(startup.currentValuation)}</div>
            </div>
            {startup.atfmInvested > 0 && (
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Participation ATFM</div>
                <div className="font-mono text-xs font-bold text-ink">{eur(currentStake)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="space-y-8 p-6">
        <section>
          <h2 className="mb-2.5 text-sm font-bold text-ink">Résumé & Business Plan</h2>
          <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Description</div>
              <p className="text-sm text-ink">{startup.description || "—"}</p>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Notes Pitch Deck</div>
              <p className="whitespace-pre-wrap text-sm text-ink">{startup.pitchNotes || "—"}</p>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Business Plan</div>
              <p className="whitespace-pre-wrap text-sm text-ink">{startup.businessPlanNotes || "—"}</p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-2.5 flex items-center gap-3">
            <h2 className="text-sm font-bold text-ink">Due Diligence</h2>
            <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10.5px] font-bold text-ink-soft">
              {startup.dueDiligenceStatus}
            </span>
            {ddTotal > 0 && (
              <span className="text-xs text-ink-soft">
                {ddDone}/{ddTotal} points validés
              </span>
            )}
          </div>
          {startup.dueDiligenceItems.length === 0 ? (
            <p className="text-xs text-ink-soft">Aucun point de vérification enregistré.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {startup.dueDiligenceItems.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded border text-[10px]"
                    style={{
                      borderColor: c.done ? "#1F9D64" : "#E4E6EB",
                      background: c.done ? "#1F9D64" : "transparent",
                      color: "#fff",
                    }}
                  >
                    {c.done ? "✓" : ""}
                  </span>
                  <span className={`text-sm ${c.done ? "text-ink-soft line-through" : "text-ink"}`}>{c.text}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-bold text-ink">Levée & Cap Table</h2>
          <div className="mb-4 grid grid-cols-4 gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Tour</div>
              <div className="font-mono text-sm font-bold text-ink">{startup.round}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Levé / Cible</div>
              <div className="font-mono text-sm font-bold text-ink">
                {eur(startup.amountRaised)} / {eur(startup.amountTarget)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Pre-money</div>
              <div className="font-mono text-sm font-bold text-ink">
                {startup.valuationPreMoney ? eur(startup.valuationPreMoney) : "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Post-money</div>
              <div className="font-mono text-sm font-bold text-ink">
                {startup.valuationPostMoney ? eur(startup.valuationPostMoney) : "—"}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-alt text-left text-[11px] uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-2">Investisseur</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Contact</th>
                </tr>
              </thead>
              <tbody>
                {startup.investors.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-xs text-ink-soft">
                      Aucun investisseur externe enregistré.
                    </td>
                  </tr>
                )}
                {startup.investors.map((iv) => (
                  <tr key={iv.id} className="border-b border-border last:border-none">
                    <td className="px-4 py-2.5 text-sm text-ink">{iv.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                        {iv.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">{iv.contact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {startup.capTable.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-ink-soft">Cap Table</h3>
              <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-surface-alt">
                {startup.capTable.map((c, i) => (
                  <div
                    key={c.id}
                    style={{ width: `${c.percentage}%`, background: CAP_PALETTE[i % CAP_PALETTE.length] }}
                    title={`${c.investor} — ${c.percentage}%`}
                  />
                ))}
              </div>
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-alt text-left text-[11px] uppercase tracking-wide text-ink-soft">
                      <th className="px-4 py-2">Actionnaire</th>
                      <th className="px-4 py-2">Participation</th>
                      <th className="px-4 py-2">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {startup.capTable.map((c, i) => (
                      <tr key={c.id} className="border-b border-border last:border-none">
                        <td className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: CAP_PALETTE[i % CAP_PALETTE.length] }}
                          />
                          {c.investor}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink">{c.percentage}%</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink">{c.amount ? eur(c.amount) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-bold text-ink">Historique</h2>
          {startup.history.length === 0 ? (
            <p className="text-xs text-ink-soft">Aucun événement enregistré pour cette startup.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {startup.history.map((h) => (
                <div key={h.id} className="rounded-lg border border-border bg-surface p-3.5">
                  <div className="text-sm text-ink">
                    <strong>{h.event}</strong> — {h.description}
                  </div>
                  <div className="mt-1 text-[11px] text-ink-soft">{fmtDateLong(h.date)}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
