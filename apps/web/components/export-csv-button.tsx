"use client";

function buildCsv(rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  return "﻿" + csv;
}

export function ExportCsvButton({ filename, rows }: { filename: string; rows: (string | number)[][] }) {
  function handleClick() {
    const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleClick}
      className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink"
    >
      Export CSV
    </button>
  );
}
