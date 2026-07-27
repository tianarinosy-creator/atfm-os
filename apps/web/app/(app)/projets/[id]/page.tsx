import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "../../../../lib/api";
import { SESSION_COOKIE } from "../../../../lib/session";
import { eur } from "../../../../components/eur";
import { LogoutButton } from "../../../../components/logout-button";

interface EmployeeView {
  personId: string;
  name: string;
  status: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface Task {
  id: string;
  title: string;
  column: string;
  sprint: string | null;
  dueDate: string | null;
  timeLoggedH: number;
  checklist: ChecklistItem[];
  assignee: EmployeeView | null;
}

interface ProjectDetail {
  id: string;
  name: string;
  client: string | null;
  startDate: string;
  endDate: string;
  budget: number;
  members: { person: EmployeeView | null }[];
  tasks: Task[];
  expenses: { amount: number }[];
  risks: { text: string; level: string; status: string }[];
}

const COLUMNS = [
  { id: "todo", label: "À faire" },
  { id: "inprogress", label: "En cours" },
  { id: "review", label: "En revue" },
  { id: "done", label: "Terminé" },
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default async function ProjectWorkspacePage({ params }: { params: { id: string } }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const project = await apiFetch<ProjectDetail>(`/projects/${params.id}`, { token });
  const spent = project.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <a href="/projets" className="text-xs font-semibold text-ink-soft hover:text-ink">
            ← Tous les projets
          </a>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-ink-soft">
            Budget : <span className="font-semibold text-ink">{eur(spent)} / {eur(project.budget)}</span>
          </span>
          <LogoutButton />
        </div>
      </header>

      <div className="border-b border-border bg-surface px-6 py-3.5">
        <h1 className="text-lg font-bold text-ink">{project.name}</h1>
        <p className="text-xs text-ink-soft">
          {project.client} · {fmtDate(project.startDate)} → {fmtDate(project.endDate)}
        </p>
      </div>

      {project.risks.some((r) => r.status === "Ouvert" && (r.level === "Élevé" || r.level === "Critique")) && (
        <div className="mx-6 mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          Risque {project.risks.find((r) => r.status === "Ouvert")?.level.toLowerCase()} ouvert : {project.risks.find((r) => r.status === "Ouvert")?.text}
        </div>
      )}

      <main className="overflow-x-auto p-6">
        <div className="flex items-start gap-3.5" style={{ minWidth: COLUMNS.length * 260 }}>
          {COLUMNS.map((col) => {
            const items = project.tasks.filter((t) => t.column === col.id);
            return (
              <div key={col.id} className="w-64 flex-shrink-0">
                <div className="mb-2.5 flex items-center justify-between px-1.5">
                  <span className="text-xs font-bold text-ink">{col.label}</span>
                  <span className="rounded-full bg-surface-alt px-2 py-0.5 font-mono text-[11px] text-ink-soft">
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-2.5 text-center text-xs text-ink-soft">
                      Aucune tâche
                    </div>
                  )}
                  {items.map((task) => {
                    const doneCl = task.checklist.filter((c) => c.done).length;
                    return (
                      <div key={task.id} className="rounded-lg border border-border bg-surface p-3 shadow-sm">
                        <div className="mb-1.5 text-[13px] font-semibold text-ink">{task.title}</div>
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          {task.sprint && (
                            <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                              {task.sprint}
                            </span>
                          )}
                          {task.checklist.length > 0 && (
                            <span className="text-[10.5px] text-ink-soft">
                              ✓ {doneCl}/{task.checklist.length}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          {task.assignee ? (
                            <span
                              className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-alt text-[9px] font-bold text-violet"
                              title={task.assignee.name}
                            >
                              {initials(task.assignee.name)}
                            </span>
                          ) : (
                            <span />
                          )}
                          {task.dueDate && (
                            <span className="text-[10.5px] font-semibold text-warning">{fmtDate(task.dueDate)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <h2 className="mb-2.5 text-sm font-bold text-ink">Équipe</h2>
          <div className="flex flex-wrap gap-2">
            {project.members.map((m, i) =>
              m.person ? (
                <div key={m.person.personId} className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-alt text-[9px] font-bold text-violet">
                    {initials(m.person.name)}
                  </span>
                  <span className="text-xs font-semibold text-ink">{m.person.name}</span>
                </div>
              ) : (
                <div key={i} className="text-xs text-ink-soft">
                  —
                </div>
              ),
            )}
            {project.members.length === 0 && <p className="text-xs text-ink-soft">Aucun membre affecté à ce projet.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
