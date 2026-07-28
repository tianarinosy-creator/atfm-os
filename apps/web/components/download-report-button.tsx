"use client";

export function DownloadReportButton({ filename, lines }: { filename: string; lines: string[] }) {
  function handleClick() {
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8;" });
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
      className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-violet px-3 py-1.5 text-xs font-semibold text-white"
    >
      ↓ Télécharger (.txt)
    </button>
  );
}
