import { cn } from "@/utils/cn";
import { ownerMetricToneClass } from "@/components/ui/owner-theme";

/*
 * StatCard — single metric tile (rebuild).
 * `tone="plain"` renders the neutral surface card; other tones use the shared
 * metric tone gradients so colour semantics stay consistent app-wide.
 */

export function StatCard({
  label,
  value,
  helper,
  icon,
  tone = "plain",
  className,
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon?: React.ReactNode;
  tone?: "plain" | "default" | "warning" | "danger" | "success";
  className?: string;
}) {
  const toned = tone !== "plain";
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-0.5 rounded-[var(--radius-lg)] border px-3 py-2.5 lg:px-4 lg:py-3",
        toned
          ? ownerMetricToneClass(tone)
          : "border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.045)_0%,rgba(255,255,255,0.02)_100%)] text-[color:var(--fg-primary)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "text-[9px] font-semibold uppercase tracking-[0.14em] lg:text-[10px]",
            toned ? "opacity-80" : "text-[color:var(--fg-secondary)]",
          )}
        >
          {label}
        </p>
        {icon ? <span className="shrink-0 opacity-80">{icon}</span> : null}
      </div>
      <p className="mt-0.5 text-lg font-bold leading-tight lg:text-xl">{value}</p>
      {helper ? (
        <p className={cn("text-[10px] lg:text-[11px]", toned ? "opacity-75" : "text-[color:var(--fg-tertiary)]")}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}
