import { AlertTriangle, Clock, CalendarClock } from "lucide-react";
import { cn } from "@/utils/cn";

/*
 * AlertCard — due/overdue/upcoming alert for the dashboard carousel (rebuild).
 * Tone drives the accent: critical (overdue, red), warning (due soon, amber),
 * upcoming (indigo). Sized as a fixed-width carousel card.
 */

type AlertTone = "critical" | "warning" | "upcoming";

const toneStyle: Record<AlertTone, { ring: string; icon: React.ReactNode; accent: string }> = {
  critical: {
    ring: "border-[color:color-mix(in_srgb,var(--error)_45%,transparent)] bg-[color:var(--error-soft)]",
    icon: <AlertTriangle size={16} />,
    accent: "text-[color:var(--error)]",
  },
  warning: {
    ring: "border-[color:color-mix(in_srgb,var(--warning)_45%,transparent)] bg-[color:var(--warning-soft)]",
    icon: <Clock size={16} />,
    accent: "text-[color:var(--warning)]",
  },
  upcoming: {
    ring: "border-[color:color-mix(in_srgb,var(--brand)_40%,transparent)] bg-[color:var(--brand-soft)]",
    icon: <CalendarClock size={16} />,
    accent: "text-[color:var(--accent)]",
  },
};

export function AlertCard({
  tone,
  title,
  message,
  amountLabel,
  action,
  className,
}: {
  tone: AlertTone;
  title: string;
  message?: string;
  amountLabel?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const s = toneStyle[tone];
  return (
    <div
      className={cn(
        "flex w-[82vw] max-w-xs flex-col gap-2 rounded-[var(--radius-lg)] border p-3 sm:w-72",
        s.ring,
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("shrink-0", s.accent)}>{s.icon}</span>
        <p className="min-w-0 flex-1 truncate text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-primary)]">
          {title}
        </p>
        {amountLabel ? (
          <span className={cn("shrink-0 text-[length:var(--text-sm-size)] font-bold tabular-nums", s.accent)}>
            {amountLabel}
          </span>
        ) : null}
      </div>
      {message ? (
        <p className="line-clamp-2 text-[length:var(--text-xs-size)] text-[color:var(--fg-secondary)]">
          {message}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
