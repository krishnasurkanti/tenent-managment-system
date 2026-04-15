import { cn } from "@/utils/cn";

const badgeStyles = {
  neutral: "bg-[color:var(--muted)] text-[var(--muted-foreground)]",
  success: "border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] text-white shadow-[0_10px_22px_rgba(34,197,94,0.24)]",
  danger: "border border-[#ef4444] bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] text-white shadow-[0_10px_22px_rgba(220,38,38,0.24)]",
  warning: "border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] text-[#422006] shadow-[0_10px_22px_rgba(250,204,21,0.24)]",
  info: "bg-[color:var(--brand-soft)] text-[color:var(--brand)]",
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
