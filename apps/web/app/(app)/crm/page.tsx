import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { tenantColors, tenantNames } from "@atfm/ui";
import { apiFetch } from "../../../lib/api";
import { SESSION_COOKIE } from "../../../lib/session";
import { decodeJwtPayload } from "../../../lib/jwt";
import { eur } from "../../../components/eur";
import { LogoutButton } from "../../../components/logout-button";
import { StatusPill } from "../../../components/status-pill";

interface JwtPayload {
  societies: string[];
}

interface EmployeeView {
  personId: string;
  name: string;
  status: string;
  replacement: string | null;
}

interface CrmDeal {
  id: string;
  title: string;
  value: number;
  stage: string;
  nextActionDate: string | null;
  contact: { name: string; company: string | null } | null;
  owner: EmployeeView | null;
}

const STAGES = [
  { id: "prospect", label: "Prospect", color: "#5B6270" },
  { id: "qualification", label: "Qualification", color: "#1F6F8B" },
  { id: "proposition", label: "Proposition", color: "#B08A3E" },
  { id: "negociation", label: "Négociation", color: "#6E56CF" },
  { id: "gagne", label: "Gagné", color: "#1F9D64" },
  { id: "perdu", label: "Perdu", color: "#D64545" },
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default async function CrmPipelinePage({
  searchParams,
}: {
  searchParams: { society?: string };
}) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const payload = decodeJwtPayload<JwtPayload>(token);
  const societies = payload?.societies ?? [];
  const society = searchParams.society && societies.includes(searchParams.society) ? searchParams.society : societies[0];

  if (!society) {
    return (
      <div className="min-h-screen bg-bg p-6">
        <p className="text-sm text-ink-soft">
          Aucune affectation active ne vous donne accès au CRM d&apos;une société.
        </p>
      </div>
    );
  }

  const deals = await apiFetch<CrmDeal[]>(`/crm/deals?society=${encodeURIComponent(society)}`, { token });
  const pipelineValue = deals.filter((d) => d.stage !== "gagne" && d.stage !== "perdu").reduce((s, d) => s + d.value, 0);

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-deep font-mono text-xs font-bold text-white">
            A
          </div>
          <span className="text-sm font-bold tracking-tight text-ink">ATFM OS Capital — CRM</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-ink-soft">
            Pipeline actif : <span className="font-semibold text-ink">{eur(pipelineValue)}</span>
          </span>
          <a href="/rh" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Annuaire
          </a>
          <a href="/projets" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Projets
          </a>
          <a href="/finance" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Finance
          </a>
          <a href="/gouvernance" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Gouvernance
          </a>
          <LogoutButton />
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-border bg-surface px-6 py-2.5">
        {societies.map((s) => (
          <a
            key={s}
            href={`/crm?society=${s}`}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: s === society ? "var(--surface-alt, #F3F4F7)" : "transparent",
              color: s === society ? "#10141C" : "#5B6270",
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: tenantColors[s] ?? "#5B6270" }} />
            {tenantNames[s] ?? s}
          </a>
        ))}
      </div>

      <main className="overflow-x-auto p-6">
        <div className="flex items-start gap-3.5" style={{ minWidth: STAGES.length * 260 }}>
          {STAGES.map((stage) => {
            const items = deals.filter((d) => d.stage === stage.id);
            return (
              <div key={stage.id} className="w-64 flex-shrink-0">
                <div className="mb-2.5 flex items-center justify-between px-1.5">
                  <span className="text-xs font-bold" style={{ color: stage.color }}>
                    {stage.label}
                  </span>
                  <span className="rounded-full bg-surface-alt px-2 py-0.5 font-mono text-[11px] text-ink-soft">
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-2.5 text-center text-xs text-ink-soft">
                      Aucune affaire
                    </div>
                  )}
                  {items.map((deal) => (
                    <div
                      key={deal.id}
                      className="rounded-lg border border-border bg-surface p-3 shadow-sm"
                      style={{ borderLeft: `3px solid ${tenantColors[society] ?? "#5B6270"}` }}
                    >
                      <div className="mb-1.5 text-[13px] font-semibold text-ink">{deal.title}</div>
                      {deal.contact && (
                        <div className="mb-2 text-[11.5px] text-ink-soft">
                          {deal.contact.name}
                          {deal.contact.company ? ` · ${deal.contact.company}` : ""}
                        </div>
                      )}
                      {deal.owner && (
                        <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold text-violet">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-alt text-[8px]">
                            {initials(deal.owner.name)}
                          </span>
                          {deal.owner.name}
                          <StatusPill status={deal.owner.status} />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-ink">{eur(deal.value)}</span>
                        {deal.nextActionDate && (
                          <span className="text-[10.5px] font-semibold text-warning">
                            {new Date(deal.nextActionDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
