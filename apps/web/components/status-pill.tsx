const STATUS_COLORS: Record<string, string> = {
  Actif: "#1F9D64",
  Inactif: "#D64545",
  Suspendu: "#C98A1B",
};

export function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#5B6270";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
      style={{ background: `${color}20`, color }}
    >
      {status}
    </span>
  );
}
