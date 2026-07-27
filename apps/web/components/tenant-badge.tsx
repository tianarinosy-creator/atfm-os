import { tenantColors } from "@atfm/ui";

export function TenantBadge({ society }: { society: string }) {
  const color = tenantColors[society] ?? "#5B6270";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {society}
    </span>
  );
}
