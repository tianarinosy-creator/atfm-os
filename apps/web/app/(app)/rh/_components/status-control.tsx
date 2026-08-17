"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  personId: string;
  affectationId: string;
  currentStatus: string;
}

const STATUSES = ["Actif", "Inactif", "Suspendu"];

export function StatusControl({ personId, affectationId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [replacement, setReplacement] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/people/${personId}/affectations/${affectationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, replacement: status === "Inactif" ? replacement || undefined : undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Échec de la mise à jour du statut.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-1.5">
      <select
        className="rounded-md border border-border bg-surface-alt px-1.5 py-1 text-[11px] text-ink outline-none focus:border-violet"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {status === "Inactif" && (
        <input
          className="w-32 rounded-md border border-border bg-surface-alt px-1.5 py-1 text-[11px] text-ink outline-none focus:border-violet"
          placeholder="Relais"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
        />
      )}
      <button
        type="submit"
        disabled={saving || status === currentStatus}
        className="rounded-md bg-surface-alt px-2 py-1 text-[11px] font-semibold text-ink-soft hover:text-ink disabled:opacity-40"
      >
        {saving ? "…" : "OK"}
      </button>
      {error && <span className="text-[10px] font-medium text-danger">{error}</span>}
    </form>
  );
}
