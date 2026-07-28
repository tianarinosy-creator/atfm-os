import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { tenantColors, tenantNames } from "@atfm/ui";
import { apiFetch } from "../../../lib/api";
import { SESSION_COOKIE } from "../../../lib/session";
import { decodeJwtPayload } from "../../../lib/jwt";
import { eur } from "../../../components/eur";
import { LogoutButton } from "../../../components/logout-button";

interface JwtPayload {
  societies: string[];
}

interface ProjectCard {
  id: string;
  name: string;
  client: string | null;
  status: string;
  startDate: string;
  endDate: string;
  budget: number;
  progress: number;
  spent: number;
  hasOpenHighRisk: boolean;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default async function ProjectsPage({ searchParams }: { searchParams: { society?: string } }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const payload = decodeJwtPayload<JwtPayload>(token);
  const societies = payload?.societies ?? [];
  const society = searchParams.society && societies.includes(searchParams.society) ? searchParams.society : societies[0];

  if (!society) {
    return (
      <div className="min-h-screen bg-bg p-6">
        <p className="text-sm text-ink-soft">
          Aucune affectation active ne vous donne accès aux projets d&apos;une société.
        </p>
      </div>
    );
  }

  const projects = await apiFetch<ProjectCard[]>(`/projects?society=${encodeURIComponent(society)}`, { token });
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const activeCount = projects.filter((p) => p.status === "actif").length;

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-deep font-mono text-xs font-bold text-white">
            A
          </div>
          <span className="text-sm font-bold tracking-tight text-ink">ATFM OS Capital — Projets</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-ink-soft">
            {activeCount} actif{activeCount > 1 ? "s" : ""} · <span className="font-semibold text-ink">{eur(totalBudget)}</span>
          </span>
          <a href="/crm" className="text-xs font-semibold text-ink-soft hover:text-ink">
            CRM
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
          <LogoutButton />
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-border bg-surface px-6 py-2.5">
        {societies.map((s) => (
          <a
            key={s}
            href={`/projets?society=${s}`}
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

      <main className="p-6">
        {projects.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucun projet pour l&apos;instant.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
            {projects.map((p) => (
              <a
                key={p.id}
                href={`/projets/${p.id}`}
                className="rounded-lg border border-border border-t-[3px] bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderTopColor: tenantColors[society] ?? "#5B6270" }}
              >
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">{p.name}</span>
                  {p.hasOpenHighRisk && <span title="Risque élevé ouvert" className="text-danger">▲</span>}
                </div>
                <div className="mb-3 text-xs text-ink-soft">{p.client}</div>
                <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${p.progress}%`, background: tenantColors[society] ?? "#5B6270" }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-ink-soft">
                  <span>
                    {fmtDate(p.startDate)} → {fmtDate(p.endDate)}
                  </span>
                  <span className="font-mono font-semibold text-ink">
                    {eur(p.spent)} / {eur(p.budget)}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
