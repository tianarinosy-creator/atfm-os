"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tenantNames } from "@atfm/ui";

const SOCIETIES = Object.keys(tenantNames);

const EMPTY = {
  firstName: "",
  lastName: "",
  gender: "Non précisé",
  email: "",
  phone: "",
  address: "",
  birthDate: "",
  society: SOCIETIES[0],
  department: "",
  position: "",
  manager: "",
  entryDate: "",
  salary: "",
  nationalId: "",
  nationalIdDate: "",
  nationalIdPlace: "",
};

export function CreatePersonForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: form.phone || undefined,
          address: form.address || undefined,
          birthDate: form.birthDate || undefined,
          manager: form.manager || undefined,
          entryDate: form.entryDate || undefined,
          salary: form.salary ? Number(form.salary) : undefined,
          nationalId: form.nationalId || undefined,
          nationalIdDate: form.nationalIdDate || undefined,
          nationalIdPlace: form.nationalIdPlace || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Échec de la création.");
      }
      const body = await res.json();
      setTempPassword(body.tempPassword ?? null);
      setForm(EMPTY);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg bg-violet px-3 py-1.5 text-xs font-semibold text-white">
        + Nouvelle personne
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-atfm border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Nouvelle personne</h2>
          <button
            onClick={() => {
              setOpen(false);
              setTempPassword(null);
            }}
            className="text-xs text-ink-soft hover:text-ink"
          >
            Fermer
          </button>
        </div>

        {tempPassword ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink">Personne créée. Mot de passe temporaire à lui communiquer :</p>
            <p className="rounded-lg border border-border bg-surface-alt px-3 py-2 font-mono text-sm text-ink">{tempPassword}</p>
            <button
              onClick={() => {
                setOpen(false);
                setTempPassword(null);
              }}
              className="rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom(s)" value={form.firstName} onChange={(v) => set("firstName", v)} required />
              <Field label="Nom" value={form.lastName} onChange={(v) => set("lastName", v)} required />
            </div>
            <Field label="Genre" value={form.gender} onChange={(v) => set("gender", v)} required />
            <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} required />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Téléphone" value={form.phone} onChange={(v) => set("phone", v)} />
              <Field label="Date de naissance" type="date" value={form.birthDate} onChange={(v) => set("birthDate", v)} />
            </div>
            <Field label="Adresse" value={form.address} onChange={(v) => set("address", v)} />

            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Affectation</p>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-soft">Société</label>
              <select
                className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-ink outline-none focus:border-violet"
                value={form.society}
                onChange={(e) => set("society", e.target.value)}
              >
                {SOCIETIES.map((s) => (
                  <option key={s} value={s}>
                    {tenantNames[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Poste" value={form.position} onChange={(v) => set("position", v)} required />
              <Field label="Département" value={form.department} onChange={(v) => set("department", v)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Manager" value={form.manager} onChange={(v) => set("manager", v)} />
              <Field label="Date d'entrée" type="date" value={form.entryDate} onChange={(v) => set("entryDate", v)} />
            </div>
            <Field label="Salaire (sensible)" type="number" value={form.salary} onChange={(v) => set("salary", v)} />

            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Identité nationale (sensible, optionnel)</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="N° CIN" value={form.nationalId} onChange={(v) => set("nationalId", v)} />
              <Field label="Date CIN" type="date" value={form.nationalIdDate} onChange={(v) => set("nationalIdDate", v)} />
            </div>
            <Field label="Lieu CIN" value={form.nationalIdPlace} onChange={(v) => set("nationalIdPlace", v)} />

            {error && <p className="text-xs font-medium text-danger">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="mt-2 rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Création…" : "Créer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</label>
      <input
        type={type}
        className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-ink outline-none focus:border-violet"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}
