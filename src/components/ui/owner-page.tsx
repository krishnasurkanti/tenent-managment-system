import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";

export function OwnerPageHero({
  eyebrow,
  title,
  description,
  badge,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "nestiq-grid-bg overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_30%),linear-gradient(180deg,#111114_0%,#09090b_100%)] p-3 lg:p-3 sm:p-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
        <div className="min-w-0 max-w-3xl">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)] lg:text-[10px]">{eyebrow}</p>
          <h1 className="font-display mt-1 text-[1.35rem] font-bold tracking-[-0.04em] text-white lg:mt-2 lg:text-[2.5rem]">{title}</h1>
          {description ? <p className="mt-1 text-[12px] leading-5 text-[color:var(--fg-secondary)] lg:mt-2 lg:text-sm lg:leading-6">{description}</p> : null}
          {badge ? <div className="mt-2 lg:mt-3">{badge}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </Card>
  );
}

export function OwnerQuickStat({
  label,
  value,
  helper,
  className,
}: {
  label: string;
  value: string;
  helper?: string;
  className?: string;
}) {
  return (
    <div className={cn("nestiq-stat min-w-0 rounded-[14px] px-3 py-2.5 lg:rounded-[18px] lg:px-4 lg:py-3", className)}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/55 lg:text-[10px]">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-white lg:mt-1 lg:text-xl">{value}</p>
      {helper ? <p className="mt-0.5 text-[10px] text-[color:var(--fg-secondary)] lg:mt-1 lg:text-[11px]">{helper}</p> : null}
    </div>
  );
}

export function OwnerComingSoon({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]">
        {icon}
      </div>
      <div>
        <p className="font-display text-base font-semibold text-white">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-[color:var(--fg-secondary)]">{body}</p>
      </div>
    </Card>
  );
}
