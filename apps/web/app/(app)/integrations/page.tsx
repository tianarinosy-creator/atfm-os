import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { tenantColors, tenantNames } from "@atfm/ui";
import { apiFetch } from "../../../lib/api";
import { SESSION_COOKIE } from "../../../lib/session";
import { decodeJwtPayload } from "../../../lib/jwt";
import { LogoutButton } from "../../../components/logout-button";
import { ConnectionForm } from "./_components/connection-form";
import { ModuleSelector } from "./_components/module-selector";
import { MappingFieldInput } from "./_components/mapping-field-input";
import { ImportButton } from "./_components/import-button";

interface JwtPayload {
  societies: string[];
}

interface ConnectionStatus {
  society: string;
  url: string;
  database: string;
  username: string;
  connected: boolean;
  lastConnectedAt: string | null;
  lastError: string | null;
  selectedModules: string[];
}

interface CatalogField {
  odoo: string;
  atfmLabel: string;
}

interface ModuleConfig {
  id: string;
  label: string;
  odooModel: string;
  fields: CatalogField[];
}

interface MappingField {
  odooField: string;
  atfmLabel: string;
}

interface MigrationReport {
  id: string;
  moduleId: string;
  available: number;
  imported: number;
  truncated: boolean;
  errors: string[];
  runAt: string;
}

const STEPS = [
  { id: "connexion", label: "1. Connexion" },
  { id: "selection", label: "2. Modules" },
  { id: "mapping", label: "3. Correspondance" },
  { id: "import", label: "4. Import & Rapport" },
] as const;

function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: { society?: string; step?: string };
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
          Aucune affectation active ne vous donne accès aux intégrations d&apos;une société.
        </p>
      </div>
    );
  }

  const [connection, modules] = await Promise.all([
    apiFetch<ConnectionStatus | null>(`/integrations/odoo/connection?society=${encodeURIComponent(society)}`, { token }),
    apiFetch<ModuleConfig[]>("/integrations/odoo/modules", { token }),
  ]);

  const defaultStep = !connection?.connected ? "connexion" : connection.selectedModules.length === 0 ? "selection" : "mapping";
  const step = STEPS.some((s) => s.id === searchParams.step) ? (searchParams.step as string) : defaultStep;

  let mapping: Partial<Record<string, MappingField[]>> = {};
  if (step === "mapping" && connection?.connected && connection.selectedModules.length > 0) {
    mapping = await apiFetch(`/integrations/odoo/mapping?society=${encodeURIComponent(society)}`, { token });
  }

  let reports: MigrationReport[] = [];
  if (step === "import") {
    reports = await apiFetch<MigrationReport[]>(`/integrations/odoo/report?society=${encodeURIComponent(society)}`, { token });
  }

  const moduleLabel = (id: string) => modules.find((m) => m.id === id)?.label ?? id;

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-deep font-mono text-xs font-bold text-white">
            A
          </div>
          <span className="text-sm font-bold tracking-tight text-ink">ATFM OS Capital — Intégrations</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-ink-soft">
            Statut Odoo :{" "}
            <span className="font-semibold" style={{ color: connection?.connected ? "#1F9D64" : "#5B6270" }}>
              {connection?.connected ? "Connecté" : "Non connecté"}
            </span>
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
          <a href="/documents" className="text-xs font-semibold text-ink-soft hover:text-ink">
            Documents
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
            href={`/integrations?society=${s}`}
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
        {STEPS.map((s) => (
          <a
            key={s.id}
            href={`/integrations?society=${society}&step=${s.id}`}
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: s.id === step ? "#F3F4F7" : "transparent", color: s.id === step ? "#10141C" : "#5B6270" }}
          >
            {s.label}
          </a>
        ))}
      </div>

      <main className="p-6">
        {step === "connexion" && (
          <div>
            {connection?.lastError && (
              <p className="mb-4 max-w-md rounded-lg border border-danger/30 bg-surface p-3 text-xs text-danger" style={{ borderColor: "#D6454533" }}>
                Dernière tentative échouée : {connection.lastError}
              </p>
            )}
            <ConnectionForm
              society={society}
              initialUrl={connection?.url ?? ""}
              initialDatabase={connection?.database ?? ""}
              initialUsername={connection?.username ?? ""}
            />
            <div
              className="mt-4 flex max-w-md items-start gap-2 rounded-lg p-3 text-xs"
              style={{ background: "#6E56CF15", color: "#6E56CF", border: "1px solid #6E56CF33" }}
            >
              ✦ La connexion appelle réellement l&apos;API JSON-RPC d&apos;Odoo (authentification via clé API) depuis ce backend —
              les identifiants ne transitent jamais côté navigateur au-delà de ce formulaire.
            </div>
          </div>
        )}

        {step === "selection" &&
          (!connection?.connected ? (
            <p className="text-sm text-ink-soft">Connectez-vous d&apos;abord à Odoo pour cette société.</p>
          ) : (
            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-ink-soft">
                Modules à importer depuis Odoo
              </label>
              <ModuleSelector society={society} modules={modules} initialSelected={connection.selectedModules} />
            </div>
          ))}

        {step === "mapping" &&
          (!connection?.connected || connection.selectedModules.length === 0 ? (
            <p className="text-sm text-ink-soft">Sélectionnez d&apos;abord au moins un module à l&apos;étape précédente.</p>
          ) : (
            <div>
              {connection.selectedModules.map((moduleId) => (
                <div key={moduleId} className="mb-6">
                  <div className="mb-2 text-sm font-bold text-ink">
                    {moduleLabel(moduleId)} <span className="font-mono text-xs font-normal text-ink-soft">({modules.find((m) => m.id === moduleId)?.odooModel})</span>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-border bg-surface">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-surface-alt text-left text-[11px] uppercase tracking-wide text-ink-soft">
                          <th className="px-4 py-2">Champ Odoo</th>
                          <th className="px-4 py-2"></th>
                          <th className="px-4 py-2">Champ ATFM OS Capital</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(mapping[moduleId] ?? []).map((f) => (
                          <tr key={f.odooField} className="border-b border-border last:border-none">
                            <td className="px-4 py-2 font-mono text-xs text-ink-soft">{f.odooField}</td>
                            <td className="px-4 py-2 text-center text-ink-soft">⇄</td>
                            <td className="px-4 py-2">
                              <MappingFieldInput society={society} moduleId={moduleId} odooField={f.odooField} initialLabel={f.atfmLabel} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              <ImportButton society={society} />
            </div>
          ))}

        {step === "import" &&
          (reports.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucun import n&apos;a encore été lancé pour cette société.</p>
          ) : (
            <div>
              <div className="mb-5">
                <ImportButton society={society} />
              </div>
              <label className="mb-2.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">Rapport détaillé</label>
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-alt text-left text-[11px] uppercase tracking-wide text-ink-soft">
                      <th className="px-4 py-2">Module</th>
                      <th className="px-4 py-2">Importés</th>
                      <th className="px-4 py-2">Disponibles</th>
                      <th className="px-4 py-2">Erreurs / avertissements</th>
                      <th className="px-4 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-none">
                        <td className="px-4 py-2.5 text-sm text-ink">{moduleLabel(r.moduleId)}</td>
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold" style={{ color: "#1F9D64" }}>
                          {r.imported}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">
                          {r.available}
                          {r.truncated && <span title="Plafond d'import atteint — davantage d'enregistrements existent sur Odoo"> ⚠</span>}
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          {r.errors.length === 0 ? (
                            <span className="text-ink-soft">Aucune</span>
                          ) : (
                            r.errors.map((e, i) => (
                              <div key={i} style={{ color: "#C98A1B" }}>
                                ⚠ {e}
                              </div>
                            ))
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">{fmtDateLong(r.runAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
      </main>
    </div>
  );
}
