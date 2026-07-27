"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      Déconnexion
    </button>
  );
}
