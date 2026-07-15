import { cn } from "@/utils/cn";
import { ownerStatusClass } from "@/components/ui/owner-theme";

/*
 * StatusBadge — payment/occupancy status pill (rebuild).
 * Semantic status → the shared owner status gradient, so every screen renders
 * the same colours for the same meaning.
 */

export type StatusTone = "paid" | "active" | "due" | "due-soon" | "overdue" | "neutral";

function toneKey(status: StatusTone): string {
  switch (status) {
    case "overdue":
      return "red";
    case "due":
      return "orange";
    case "due-soon":
      return "yellow";
    case "neutral":
      return "neutral";
    default:
      return "green";
  }
}

export function StatusBadge({
  status,
  children,
  className,
}: {
  status: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  if (status === "neutral") {
    return (
      <span
        className={cn(
          "inline-flex h-fit items-center rounded-full border border-[color:var(--border)] bg-[color:var(--muted)] px-2.5 py-1 text-[10px] font-semibold text-[color:var(--fg-secondary)]",
          className,
        )}
      >
        {children}
      </span>
    );
  }
  return <span className={cn(ownerStatusClass(toneKey(status)), className)}>{children}</span>;
}
