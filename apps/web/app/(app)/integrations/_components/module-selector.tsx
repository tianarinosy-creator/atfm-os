"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface ModuleConfig {
  id: string;
  label: string;
  odooModel: string;
}

interface Props {
  society: string;
  modules: ModuleConfig[];
  initialSelected: string[];
}

export function ModuleSelector({ society, modules, initialSelected }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id];
    setSelected(next);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/odoo/selection?society=${encodeURIComponent(society)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleIds: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Échec de la sélection.");
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setSelected(selected);
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    }
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {modules.map((m) => {
          const isSelected = selected.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              disabled={isPending}
              className="rounded-lg border bg-surface p-4 text-left transition"
              style={{ borderColor: isSelected ? "#6E56CF" : undefined, boxShadow: isSelected ? "0 0 0 1px #6E56CF" : undefined }}
            >
              <div className="mb-2.5 flex items-center justify-between text-violet">
                <span className="text-xs font-bold uppercase tracking-wide">{m.label}</span>
                <span
                  className="flex h-4.5 w-4.5 items-center justify-center rounded border text-[10px] text-white"
                  style={{ borderColor: isSelected ? "#6E56CF" : "#E4E6EB", background: isSelected ? "#6E56CF" : "transparent" }}
                >
                  {isSelected ? "✓" : ""}
                </span>
              </div>
              <div className="font-mono text-[10.5px] text-ink-soft">{m.odooModel}</div>
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
