"use client";

import { useState } from "react";

export function MappingFieldInput({
  society,
  moduleId,
  odooField,
  initialLabel,
}: {
  society: string;
  moduleId: string;
  odooField: string;
  initialLabel: string;
}) {
  const [value, setValue] = useState(initialLabel);
  const [saved, setSaved] = useState(true);

  async function handleBlur() {
    if (value === initialLabel) return;
    try {
      await fetch(`/api/integrations/odoo/mapping?society=${encodeURIComponent(society)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, odooField, atfmLabel: value }),
      });
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  return (
    <input
      className="w-full rounded-lg border border-border bg-surface-alt px-2.5 py-1.5 text-sm text-ink outline-none focus:border-violet"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        setSaved(false);
      }}
      onBlur={handleBlur}
      title={saved ? undefined : "Non enregistré"}
    />
  );
}
