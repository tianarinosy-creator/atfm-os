import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { SESSION_COOKIE } from "../../../lib/session";
import { decodeJwtPayload } from "../../../lib/jwt";
import { eur } from "../../../components/eur";
import { LogoutButton } from "../../../components/logout-button";

interface JwtPayload {
  societies: string[];
}

interface Startup {
  id: string;
  name: string;
  sector: string;
  stage: "sourcing" | "pitch" | "dd" | "termsheet" | "investi" | "refuse";
  founder: string;
  round: string;
  amountTarget: number;
  dateInvested: string | null;
}

interface PortfolioItem extends Startup {
  currentValuation: number;
  atfmInvested: number;
  atfmStakePercentage: number;
  currentStake: number;
  roi: number;
}

interface Portfolio {
  items: PortfolioItem[];
  totalInvested: number;
  totalCurrentValue: number;
  globalROI: number;
}

interface Investor {
  name: string;
  type: string;
  contact: string;
  startups: string[];
}

interface HistoryEvent {
  id: string;
  event: string;
  description: string;
  date: string;
  startupName: string;
  startupId: string;
}

const STAGES = [
  { id: "sourcing", label: "Sourcing" },
  { id: "pitch", label: "Pitch reçu" },
  { id: "dd", label: "Due Diligence" },
  { id: "termsheet", label: "Term Sheet" },
  { id: "investi", label: "Investi" },
  { id: "refuse", label: "Refusé" },
];

const VIEWS = [
  { id: "pipeline", label: "Pipeline startups" },
  { id: "portefeuille", label: "Portefeuille" },
  { id: "investisseurs", label: "Investisseurs" },
  { id: "historique", label: "Historique" },
];

function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default async function InvestissementsPage({ searchParams }: { searchParams: { view?: string } }) {
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

  const view = VIEWS.some((v) => v.id === searchParams.view) ? (searchParams.view as string) : "pipeline";

  const portfolio = await apiFetch<Portfolio>("/investments/portfolio", { token });

  let startups: Startup[] = [];
  let investors: Investor[] = [];
  let history: HistoryEvent[] = [];
  if (view === "pipeline") startups = await apiFetch<Startup[]>("/investments/startups", { token });
  if (view === "investisseurs") investors = await apiFetch<Investor[]>("/investments/investors", { token });
  if (view === "historique") history = await apiFetch<HistoryEvent[]>("/investments/history", { token });

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-deep font-mono text-xs font-bold text-white">
            A
          </div>
          <span className="text-sm font-bold tracking-tight text-ink">ATFM OS Capital — Investissements</span>
          <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10.5px] font-bold text-ink-soft">
            ATFM Legacy · Vue groupe
          </span>
        </div>
        <div className="flex items-center gap-4">
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
          <a href="/documents" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Documents
          </a>
          <LogoutButton />
        </div>
      </header>

      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-2.5">
        <div className="flex items-center gap-2">
          {VIEWS.map((v) => (
            <a
              key={v.id}
              href={`/investissements?view=${v.id}`}
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: v.id === view ? "#F3F4F7" : "transparent",
                color: v.id === view ? "#10141C" : "#5B6270",
              }}
            >
              {v.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Investi (ATFM)</div>
            <div className="font-mono text-xs font-bold text-ink">{eur(portfolio.totalInvested)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Valeur actuelle</div>
            <div className="font-mono text-xs font-bold text-ink">{eur(portfolio.totalCurrentValue)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">ROI</div>
            <div
              className="font-mono text-xs font-bold"
              style={{ color: portfolio.globalROI >= 0 ? "#1F9D64" : "#D64545" }}
            >
              {portfolio.globalROI >= 0 ? "+" : ""}
              {portfolio.globalROI}%
            </div>
          </div>
        </div>
      </div>

      <main className="p-6">
        {view === "pipeline" && (
          <div className="flex items-start gap-3.5 overflow-x-auto" style={{ minWidth: STAGES.length * 240 }}>
            {STAGES.map((stage) => {
              const items = startups.filter((s) => s.stage === stage.id);
              return (
                <div key={stage.id} className="w-56 flex-shrink-0">
                  <div className="mb-2.5 flex items-center justify-between px-1.5">
                    <span className="text-xs font-bold text-ink">{stage.label}</span>
                    <span className="rounded-full bg-surface-alt px-2 py-0.5 font-mono text-[11px] text-ink-soft">
                      {items.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border p-2.5 text-center text-xs text-ink-soft">
                        Aucune startup
                      </div>
                    )}
                    {items.map((s) => (
                      <a
                        key={s.id}
                        href={`/investissements/${s.id}`}
                        className="block rounded-lg border border-border bg-surface p-3 shadow-sm"
                        style={{ borderLeft: "3px solid #6E56CF" }}
                      >
                        <div className="mb-1.5 text-[13px] font-semibold text-ink">{s.name}</div>
                        <div className="mb-2 text-[11.5px] text-ink-soft">{s.sector}</div>
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10.5px] font-semibold text-ink-soft">
                            {s.round}
                          </span>
                          {s.amountTarget > 0 && (
                            <span className="font-mono text-xs font-semibold text-ink">{eur(s.amountTarget)}</span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "portefeuille" &&
          (portfolio.items.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucune startup en portefeuille pour l&apos;instant.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
              {portfolio.items.map((s) => (
                <a
                  key={s.id}
                  href={`/investissements/${s.id}`}
                  className="rounded-lg border border-border border-t-[3px] bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  style={{ borderTopColor: "#6E56CF" }}
                >
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-sm font-bold text-ink">{s.name}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                      style={{ background: s.roi >= 0 ? "#1F9D6420" : "#D6454520", color: s.roi >= 0 ? "#1F9D64" : "#D64545" }}
                    >
                      {s.roi >= 0 ? "+" : ""}
                      {s.roi}%
                    </span>
                  </div>
                  <div className="mb-3 text-xs text-ink-soft">
                    {s.sector} · {s.round}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-ink-soft">
                    <span>Investi le {s.dateInvested ? fmtDateLong(s.dateInvested) : "—"}</span>
                    <span className="font-mono font-semibold text-ink">
                      {eur(s.atfmInvested)} → {eur(s.currentStake)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ))}

        {view === "investisseurs" &&
          (investors.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucun co-investisseur enregistré.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-alt text-left text-[11px] uppercase tracking-wide text-ink-soft">
                    <th className="px-4 py-2.5">Investisseur</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Contact</th>
                    <th className="px-4 py-2.5">Startups co-investies</th>
                  </tr>
                </thead>
                <tbody>
                  {investors.map((iv) => (
                    <tr key={iv.name} className="border-b border-border last:border-none">
                      <td className="flex items-center gap-2.5 px-4 py-3 font-semibold text-ink">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-alt text-[10px] font-bold text-violet">
                          {initials(iv.name)}
                        </span>
                        {iv.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                          {iv.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-soft">{iv.contact}</td>
                      <td className="px-4 py-3 text-xs text-ink">{iv.startups.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {view === "historique" &&
          (history.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucun événement enregistré.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {history.map((h) => (
                <a
                  key={h.id}
                  href={`/investissements/${h.startupId}`}
                  className="block rounded-lg border border-border bg-surface p-3.5"
                >
                  <div className="text-sm text-ink">
                    <strong>{h.startupName}</strong> — {h.event} : {h.description}
                  </div>
                  <div className="mt-1 text-[11px] text-ink-soft">{fmtDateLong(h.date)}</div>
                </a>
              ))}
            </div>
          ))}
      </main>
    </div>
  );
}
