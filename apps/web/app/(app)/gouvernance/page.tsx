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

interface BoardMember {
  id: string;
  name: string;
  role: "presidence" | "direction" | "administrateur";
  title: string;
  since: string;
}

interface Shareholder {
  id: string;
  name: string;
  type: string;
  percentage: number;
  value: number;
}

interface CapTable {
  valuation: number;
  totalPct: number;
  shareholders: Shareholder[];
}

interface Meeting {
  id: string;
  type: "ca" | "ag";
  title: string;
  date: string;
  status: string;
  resolutions: { id: string }[];
}

interface Decision {
  id: string;
  text: string;
  status: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
}

const ROLE_TIERS = [
  { id: "presidence", label: "Présidence" },
  { id: "direction", label: "Direction générale" },
  { id: "administrateur", label: "Administrateurs" },
];

const MEETING_TYPE_LABELS: Record<string, string> = { ca: "Conseil d'administration", ag: "Assemblée générale" };
const RESOLUTION_COLORS: Record<string, string> = { "Adoptée": "#1F9D64", "Rejetée": "#D64545", "En délibération": "#C98A1B" };
const CAP_PALETTE = ["#14224A", "#6E56CF", "#1F6F8B", "#B08A3E", "#2F8F5B", "#B5482D", "#7A3B69"];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function GouvernancePage({ searchParams }: { searchParams: { society?: string } }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const payload = decodeJwtPayload<JwtPayload>(token);
  const societies = payload?.societies ?? [];
  const society = searchParams.society && societies.includes(searchParams.society) ? searchParams.society : societies[0];

  if (!society) {
    return (
      <div className="min-h-screen bg-bg p-6">
        <p className="text-sm text-ink-soft">
          Aucune affectation active ne vous donne accès à la gouvernance d&apos;une société.
        </p>
      </div>
    );
  }

  const qs = `society=${encodeURIComponent(society)}`;
  const [board, capTable, meetings, decisions] = await Promise.all([
    apiFetch<BoardMember[]>(`/governance/board?${qs}`, { token }),
    apiFetch<CapTable>(`/governance/cap-table?${qs}`, { token }),
    apiFetch<Meeting[]>(`/governance/meetings?${qs}`, { token }),
    apiFetch<Decision[]>(`/governance/decisions?${qs}`, { token }),
  ]);

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-deep font-mono text-xs font-bold text-white">
            A
          </div>
          <span className="text-sm font-bold tracking-tight text-ink">ATFM OS Capital — Gouvernance</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-ink-soft">
            Valorisation : <span className="font-semibold text-ink">{eur(capTable.valuation)}</span>
          </span>
          <a href="/finance" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Finance
          </a>
          <a href="/projets" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Projets
          </a>
          <a href="/crm" className="text-xs font-semibold text-ink-soft hover:text-ink">
            CRM
          </a>
          <a href="/rh" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Annuaire
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
            href={`/gouvernance?society=${s}`}
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
        <section>
          <h2 className="mb-3 text-sm font-bold text-ink">Organigramme du Conseil</h2>
          <div
            className="mb-2.5 inline-block rounded-lg border-2 px-4 py-2 text-sm font-bold text-ink"
            style={{ borderColor: tenantColors[society] ?? "#5B6270" }}
          >
            {tenantNames[society] ?? society}
          </div>
          <div className="flex flex-col gap-5">
            {ROLE_TIERS.map((tier) => {
              const members = board.filter((b) => b.role === tier.id);
              if (members.length === 0) return null;
              return (
                <div key={tier.id}>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">{tier.label}</div>
                  <div className="flex flex-wrap gap-3">
                    {members.map((m) => (
                      <div key={m.id} className="w-44 rounded-lg border border-border bg-surface p-3 text-center">
                        <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt text-xs font-bold text-violet">
                          {initials(m.name)}
                        </span>
                        <div className="mt-2 text-sm font-bold text-ink">{m.name}</div>
                        <div className="text-xs text-ink-soft">{m.title}</div>
                        <div className="mt-1 text-[10.5px] text-ink-soft">Depuis {m.since}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {board.length === 0 && <p className="text-xs text-ink-soft">Aucun membre enregistré pour cette société.</p>}
          </div>
        </section>

        <section>
          <div className="mb-2.5 flex items-center gap-8">
            <h2 className="text-sm font-bold text-ink">Actionnariat & Capital</h2>
            <span className="font-mono text-xs" style={{ color: capTable.totalPct === 100 ? "#1F9D64" : "#C98A1B" }}>
              Capital réparti : {capTable.totalPct}%
            </span>
          </div>
          <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-surface-alt">
            {capTable.shareholders.map((s, i) => (
              <div
                key={s.id}
                style={{ width: `${s.percentage}%`, background: CAP_PALETTE[i % CAP_PALETTE.length] }}
                title={`${s.name} — ${s.percentage}%`}
              />
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-alt text-left text-[11px] uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-2">Actionnaire</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Participation</th>
                  <th className="px-4 py-2">Valeur estimée</th>
                </tr>
              </thead>
              <tbody>
                {capTable.shareholders.map((s, i) => (
                  <tr key={s.id} className="border-b border-border last:border-none">
                    <td className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAP_PALETTE[i % CAP_PALETTE.length] }} />
                      {s.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-semibold text-ink-soft">{s.type}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink">{s.percentage}%</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink">{eur(s.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-bold text-ink">Assemblées & Réunions</h2>
          {meetings.length === 0 ? (
            <p className="text-xs text-ink-soft">Aucune réunion enregistrée.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
              {meetings.map((m) => (
                <a
                  key={m.id}
                  href={`/gouvernance/reunions/${m.id}`}
                  className="rounded-lg border border-border bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-bold text-ink">{m.title}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                      style={{
                        background: m.status === "Tenue" ? "#1F9D6420" : "#C98A1B20",
                        color: m.status === "Tenue" ? "#1F9D64" : "#C98A1B",
                      }}
                    >
                      {m.status}
                    </span>
                  </div>
                  <div className="mb-3 text-xs text-ink-soft">{MEETING_TYPE_LABELS[m.type]}</div>
                  <div className="flex items-center justify-between text-[11px] text-ink-soft">
                    <span>{fmtDateLong(m.date)}</span>
                    <span className="rounded-full bg-surface-alt px-2 py-0.5 font-semibold">
                      {m.resolutions.length} résolution{m.resolutions.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-bold text-ink">Historique des décisions</h2>
          {decisions.length === 0 ? (
            <p className="text-xs text-ink-soft">Aucune décision enregistrée pour l&apos;instant.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {decisions.map((d) => (
                <a
                  key={d.id}
                  href={`/gouvernance/reunions/${d.meetingId}`}
                  className="block rounded-lg border border-border bg-surface p-3.5"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{d.text}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: `${RESOLUTION_COLORS[d.status] ?? "#5B6270"}20`, color: RESOLUTION_COLORS[d.status] ?? "#5B6270" }}
                    >
                      {d.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-soft">
                    {d.meetingTitle} · {fmtDateLong(d.meetingDate)} · Pour {d.votesFor} / Contre {d.votesAgainst} / Abstention {d.votesAbstain}
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
