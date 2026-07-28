import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { SESSION_COOKIE } from "../../../lib/session";
import { LogoutButton } from "../../../components/logout-button";
import { TenantBadge } from "../../../components/tenant-badge";
import { StatusPill } from "../../../components/status-pill";

interface Affectation {
  id: string;
  society: string;
  department: string;
  position: string;
  manager: string | null;
  entryDate: string;
  exitDate: string | null;
  status: string;
  replacement: string | null;
}

interface DirectoryPerson {
  personId: string;
  name: string;
  email: string;
  phone: string | null;
  affectations: Affectation[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function RhAnnuairePage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const people = await apiFetch<DirectoryPerson[]>("/people", { token });

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-deep font-mono text-xs font-bold text-white">
            A
          </div>
          <span className="text-sm font-bold tracking-tight text-ink">ATFM OS Capital — Annuaire (Core Directory)</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/crm" className="text-xs font-semibold text-ink-soft hover:text-ink">
            CRM
          </a>
          <a href="/projets" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Projets
          </a>
          <a href="/finance" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Finance
          </a>
          <LogoutButton />
        </div>
      </header>

      <main className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-ink">Personnes ({people.length})</h1>
        </div>

        <div className="overflow-hidden rounded-atfm border border-border bg-surface">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-alt text-left text-[11px] uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-2.5">Nom</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Affectations actives</th>
                <th className="px-4 py-2.5">Historique</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => {
                const active = person.affectations.filter((a) => !a.exitDate);
                const past = person.affectations.filter((a) => a.exitDate);
                return (
                  <tr key={person.personId} className="border-b border-border last:border-none">
                    <td className="flex items-center gap-2.5 px-4 py-3 font-semibold text-ink">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-alt text-[10px] font-bold text-violet">
                        {initials(person.name)}
                      </span>
                      {person.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-soft">{person.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {active.map((a) => (
                          <div key={a.id} className="flex items-center gap-1.5">
                            <TenantBadge society={a.society} />
                            <span className="text-xs text-ink-soft">{a.position}</span>
                            <StatusPill status={a.status} />
                          </div>
                        ))}
                        {active.length === 0 && <span className="text-xs text-ink-soft">Aucune affectation active</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-soft">{past.length} affectation(s) clôturée(s)</td>
                  </tr>
                );
              })}
              {people.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-soft">
                    Aucune personne dans le Core Directory pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
