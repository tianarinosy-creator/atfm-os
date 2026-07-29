"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  society: string;
  initialUrl: string;
  initialDatabase: string;
  initialUsername: string;
}

export function ConnectionForm({ society, initialUrl, initialDatabase, initialUsername }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [database, setDatabase] = useState(initialDatabase);
  const [username, setUsername] = useState(initialUsername);
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/odoo/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ society, url, database, username, apiKey }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Connexion refusée.");
      }
      setApiKey("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md rounded-lg border border-border bg-surface p-6">
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-soft">URL de l&apos;instance</label>
      <input
        className="mb-3 w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-ink outline-none focus:border-violet"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://monentreprise.odoo.com"
        required
      />
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-soft">Base de données</label>
      <input
        className="mb-3 w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-ink outline-none focus:border-violet"
        value={database}
        onChange={(e) => setDatabase(e.target.value)}
        placeholder="monentreprise-prod"
        required
      />
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-soft">Utilisateur</label>
      <input
        className="mb-3 w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-ink outline-none focus:border-violet"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="admin@monentreprise.com"
        required
      />
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-soft">Clé API</label>
      <input
        type="password"
        className="mb-1 w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-ink outline-none focus:border-violet"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="••••••••••••••••"
        required
      />
      <p className="mb-4 text-[11px] text-ink-soft">
        Chiffrée avant écriture en base et jamais renvoyée ensuite au navigateur.
      </p>

      {error && <p className="mb-3 text-xs font-medium text-danger">{error}</p>}

      <button
        type="submit"
        disabled={connecting}
        className="rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {connecting ? "Connexion en cours…" : "Se connecter"}
      </button>
    </form>
  );
}
