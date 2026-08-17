"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Affectation {
  id: string;
  department: string;
  position: string;
  manager: string | null;
  salary: number | null;
  exitDate: string | null;
}

interface PersonDetail {
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  phone: string | null;
  address: string | null;
  birthDate: string | null;
  nationalId: string | null;
  nationalIdDate: string | null;
  nationalIdPlace: string | null;
  affectations: Affectation[];
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

/// Édite la fiche personne + la première affectation active trouvée (le formulaire
/// ne couvre pas encore le cas d'une personne active dans plusieurs sociétés à la
/// fois — rare dans les données actuelles).
export function EditPersonPanel({ personId }: { personId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [affectation, setAffectation] = useState<Affectation | null>(null);

  async function handleOpen() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/people/${personId}`);
      if (!res.ok) throw new Error("Impossible de charger la fiche.");
      const data: PersonDetail = await res.json();
      setPerson(data);
      setAffectation(data.affectations.find((a) => !a.exitDate) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!person) return;
    setSaving(true);
    setError(null);
    try {
      const personRes = await fetch(`/api/people/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: person.firstName,
          lastName: person.lastName,
          gender: person.gender,
          email: person.email,
          phone: person.phone || undefined,
          address: person.address || undefined,
          birthDate: person.birthDate || undefined,
          nationalId: person.nationalId || undefined,
          nationalIdDate: person.nationalIdDate || undefined,
          nationalIdPlace: person.nationalIdPlace || undefined,
        }),
      });
      if (!personRes.ok) {
        const body = await personRes.json().catch(() => ({}));
        throw new Error(body.message ?? "Échec de la mise à jour de la fiche.");
      }

      if (affectation) {
        const affRes = await fetch(`/api/people/${personId}/affectations/${affectation.id}/details`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            department: affectation.department,
            position: affectation.position,
            manager: affectation.manager || undefined,
            salary: affectation.salary ?? undefined,
          }),
        });
        if (!affRes.ok) {
          const body = await affRes.json().catch(() => ({}));
          throw new Error(body.message ?? "Échec de la mise à jour de l'affectation.");
        }
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="rounded-md bg-surface-alt px-2 py-1 text-[11px] font-semibold text-ink-soft hover:text-ink"
      >
        Modifier
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-atfm border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Modifier la fiche</h2>
          <button onClick={() => setOpen(false)} className="text-xs text-ink-soft hover:text-ink">
            Fermer
          </button>
        </div>

        {loading && <p className="text-xs text-ink-soft">Chargement…</p>}

        {!loading && person && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom(s)" value={person.firstName} onChange={(v) => setPerson({ ...person, firstName: v })} />
              <Field label="Nom" value={person.lastName} onChange={(v) => setPerson({ ...person, lastName: v })} />
            </div>
            <Field label="Genre" value={person.gender} onChange={(v) => setPerson({ ...person, gender: v })} />
            <Field label="Email" type="email" value={person.email} onChange={(v) => setPerson({ ...person, email: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Téléphone" value={person.phone ?? ""} onChange={(v) => setPerson({ ...person, phone: v })} />
              <Field
                label="Date de naissance"
                type="date"
                value={toDateInput(person.birthDate)}
                onChange={(v) => setPerson({ ...person, birthDate: v })}
              />
            </div>
            <Field label="Adresse" value={person.address ?? ""} onChange={(v) => setPerson({ ...person, address: v })} />

            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Identité nationale (sensible)</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="N° CIN" value={person.nationalId ?? ""} onChange={(v) => setPerson({ ...person, nationalId: v })} />
              <Field
                label="Date CIN"
                type="date"
                value={toDateInput(person.nationalIdDate)}
                onChange={(v) => setPerson({ ...person, nationalIdDate: v })}
              />
            </div>
            <Field label="Lieu CIN" value={person.nationalIdPlace ?? ""} onChange={(v) => setPerson({ ...person, nationalIdPlace: v })} />

            {affectation && (
              <>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Affectation en cours</p>
                <Field
                  label="Poste"
                  value={affectation.position}
                  onChange={(v) => setAffectation({ ...affectation, position: v })}
                />
                <Field
                  label="Département"
                  value={affectation.department}
                  onChange={(v) => setAffectation({ ...affectation, department: v })}
                />
                <Field
                  label="Manager"
                  value={affectation.manager ?? ""}
                  onChange={(v) => setAffectation({ ...affectation, manager: v })}
                />
                <Field
                  label="Salaire (sensible)"
                  type="number"
                  value={affectation.salary?.toString() ?? ""}
                  onChange={(v) => setAffectation({ ...affectation, salary: v ? Number(v) : null })}
                />
              </>
            )}

            {error && <p className="text-xs font-medium text-danger">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="mt-2 rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</label>
      <input
        type={type}
        className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-ink outline-none focus:border-violet"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
