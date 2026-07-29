"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ImportButton({ society }: { society: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/odoo/import?society=${encodeURIComponent(society)}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Échec de l'import.");
      }
      router.push(`/integrations?society=${society}&step=import`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={running}
        className="rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {running ? "Import en cours…" : "▶ Lancer l'import en un clic"}
      </button>
      {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
