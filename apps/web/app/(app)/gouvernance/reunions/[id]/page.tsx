import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "../../../../../lib/api";
import { SESSION_COOKIE } from "../../../../../lib/session";
import { LogoutButton } from "../../../../../components/logout-button";

interface Resolution {
  id: string;
  text: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  status: string;
}

interface MeetingDetail {
  id: string;
  type: "ca" | "ag";
  title: string;
  date: string;
  status: string;
  agenda: string[];
  minutes: string;
  resolutions: Resolution[];
}

const MEETING_TYPE_LABELS: Record<string, string> = { ca: "Conseil d'administration", ag: "Assemblée générale" };
const RESOLUTION_COLORS: Record<string, string> = { "Adoptée": "#1F9D64", "Rejetée": "#D64545", "En délibération": "#C98A1B" };

function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const meeting = await apiFetch<MeetingDetail>(`/governance/meetings/${params.id}`, { token });

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5">
        <a href="/gouvernance" className="text-xs font-semibold text-ink-soft hover:text-ink">
          ← Gouvernance
        </a>
        <LogoutButton />
      </header>

      <div className="border-b border-border bg-surface px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-bold text-ink">{meeting.title}</h1>
          <span
            className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
            style={{
              background: meeting.status === "Tenue" ? "#1F9D6420" : "#C98A1B20",
              color: meeting.status === "Tenue" ? "#1F9D64" : "#C98A1B",
            }}
          >
            {meeting.status}
          </span>
        </div>
        <p className="text-xs text-ink-soft">
          {MEETING_TYPE_LABELS[meeting.type]} · {fmtDateLong(meeting.date)}
        </p>
      </div>

      <main className="space-y-8 p-6">
        <section>
          <h2 className="mb-2.5 text-sm font-bold text-ink">Ordre du jour</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-ink">
            {meeting.agenda.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-bold text-ink">Résolutions & votes</h2>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-alt text-left text-[11px] uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-2">Résolution</th>
                  <th className="px-4 py-2">Pour</th>
                  <th className="px-4 py-2">Contre</th>
                  <th className="px-4 py-2">Abstention</th>
                  <th className="px-4 py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {meeting.resolutions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-ink-soft">
                      Aucune résolution.
                    </td>
                  </tr>
                )}
                {meeting.resolutions.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-none">
                    <td className="px-4 py-2.5 text-sm text-ink">{r.text}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink">{r.votesFor}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink">{r.votesAgainst}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink">{r.votesAbstain}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                        style={{ background: `${RESOLUTION_COLORS[r.status] ?? "#5B6270"}20`, color: RESOLUTION_COLORS[r.status] ?? "#5B6270" }}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-bold text-ink">Procès-verbal (PV)</h2>
          {meeting.minutes ? (
            <p className="whitespace-pre-wrap rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed text-ink">
              {meeting.minutes}
            </p>
          ) : (
            <p className="text-xs text-ink-soft">Aucun procès-verbal enregistré pour l&apos;instant.</p>
          )}
        </section>
      </main>
    </div>
  );
}
