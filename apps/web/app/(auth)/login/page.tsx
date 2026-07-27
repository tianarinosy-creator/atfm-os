"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Identifiants invalides.");
      }
      router.push("/rh");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-atfm border border-border bg-surface p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet font-mono text-sm font-bold text-white">
            A
          </div>
          <span className="text-sm font-bold tracking-tight text-blue-deep">ATFM OS Capital</span>
        </div>

        <h1 className="mb-1 text-lg font-bold text-ink">Connexion</h1>
        <p className="mb-6 text-sm text-ink-soft">Accédez à votre espace de travail.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-soft">
              Identifiant
            </label>
            <input
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-ink outline-none focus:border-violet"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-soft">
              Mot de passe
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-ink outline-none focus:border-violet"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="text-xs font-medium text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
