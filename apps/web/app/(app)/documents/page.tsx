import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { tenantColors, tenantNames } from "@atfm/ui";
import { apiFetch } from "../../../lib/api";
import { SESSION_COOKIE } from "../../../lib/session";
import { decodeJwtPayload } from "../../../lib/jwt";
import { LogoutButton } from "../../../components/logout-button";

interface JwtPayload {
  societies: string[];
}

interface EmployeeView {
  personId: string;
  name: string;
  status: string;
}

interface DocumentRow {
  id: string;
  name: string;
  category: "Contrats" | "Gouvernance" | "Finance" | "RH" | "Projets";
  version: number;
  updatedDate: string;
  permissions: string;
  archived: boolean;
  signatureStatus: string | null;
  owner: EmployeeView | null;
}

const CATEGORIES = ["Contrats", "Gouvernance", "Finance", "RH", "Projets"] as const;

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { society?: string; category?: string; archived?: string };
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
          Aucune affectation active ne vous donne accès aux documents d&apos;une société.
        </p>
      </div>
    );
  }

  const category = CATEGORIES.includes(searchParams.category as (typeof CATEGORIES)[number])
    ? (searchParams.category as (typeof CATEGORIES)[number])
    : undefined;
  const showArchived = searchParams.archived === "true";

  const activeDocs = await apiFetch<DocumentRow[]>(`/documents?society=${encodeURIComponent(society)}`, { token });

  const tableQs = new URLSearchParams({ society, archived: String(showArchived) });
  if (category) tableQs.set("category", category);
  const tableDocs = await apiFetch<DocumentRow[]>(`/documents?${tableQs.toString()}`, { token });

  const activeCount = activeDocs.length;
  const pendingSignatures = activeDocs.filter((d) => d.signatureStatus === "En attente").length;

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-deep font-mono text-xs font-bold text-white">
            A
          </div>
          <span className="text-sm font-bold tracking-tight text-ink">ATFM OS Capital — Documents</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-ink-soft">
            {activeCount} actif{activeCount > 1 ? "s" : ""}
            {pendingSignatures > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-warning">{pendingSignatures} signature{pendingSignatures > 1 ? "s" : ""} en attente</span>
              </>
            )}
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
          <a href="/finance" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Finance
          </a>
          <a href="/gouvernance" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Gouvernance
          </a>
          <a href="/investissements" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Investissements
          </a>
          <a href="/bi" className="text-xs font-semibold text-ink-soft hover:text-ink">
            BI
          </a>
          <LogoutButton />
        </div>
      </header>

      <div className="flex items-center gap-2 border-b border-border bg-surface px-6 py-2.5">
        {societies.map((s) => (
          <a
            key={s}
            href={`/documents?society=${s}`}
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

      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-2.5">
        <div className="flex items-center gap-2">
          <a
            href={`/documents?society=${society}&archived=${showArchived}`}
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: !category ? "#F3F4F7" : "transparent", color: !category ? "#10141C" : "#5B6270" }}
          >
            Tous
          </a>
          {CATEGORIES.map((c) => (
            <a
              key={c}
              href={`/documents?society=${society}&category=${c}&archived=${showArchived}`}
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: category === c ? "#F3F4F7" : "transparent", color: category === c ? "#10141C" : "#5B6270" }}
            >
              {c}
            </a>
          ))}
        </div>
        <a
          href={`/documents?society=${society}${category ? `&category=${category}` : ""}&archived=${!showArchived}`}
          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-ink-soft hover:text-ink"
        >
          {showArchived ? "Voir les actifs" : "Voir les archives"}
        </a>
      </div>

      <main className="p-6">
        {tableDocs.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucun document ne correspond à ces critères.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-alt text-left text-[11px] uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-2.5">Document</th>
                  <th className="px-4 py-2.5">Catégorie</th>
                  <th className="px-4 py-2.5">Version</th>
                  <th className="px-4 py-2.5">Dernière mise à jour</th>
                  <th className="px-4 py-2.5">Propriétaire</th>
                  <th className="px-4 py-2.5">Permissions</th>
                  <th className="px-4 py-2.5">Signature</th>
                </tr>
              </thead>
              <tbody>
                {tableDocs.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-none">
                    <td className="px-4 py-3 text-sm font-semibold text-ink">{d.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                        {d.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink">v{d.version}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-soft">{fmtDate(d.updatedDate)}</td>
                    <td className="px-4 py-3">
                      {d.owner ? (
                        <div className="flex items-center gap-1.5 text-xs text-ink">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-alt text-[9px] font-bold text-violet">
                            {initials(d.owner.name)}
                          </span>
                          {d.owner.name}
                        </div>
                      ) : (
                        <span className="text-xs text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10.5px] font-semibold text-ink-soft">
                        🔒 {d.permissions}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {d.signatureStatus ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                          style={{
                            background: d.signatureStatus === "Signé" ? "#1F9D6420" : "#C98A1B20",
                            color: d.signatureStatus === "Signé" ? "#1F9D64" : "#C98A1B",
                          }}
                        >
                          {d.signatureStatus}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-soft">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
