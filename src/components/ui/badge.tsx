import { cn } from "@/lib/utils";

const badgeStyles = {
  neutral: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  success: "bg-emerald-500/12 text-emerald-600",
  danger: "bg-rose-500/12 text-rose-600",
  warning: "bg-amber-500/12 text-amber-600",
  info: "bg-sky-500/12 text-sky-600",
} as const;

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof badgeStyles;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
        badgeStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
