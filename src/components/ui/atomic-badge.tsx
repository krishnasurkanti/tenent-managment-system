import { cn } from "@/utils/cn";

const atomicBadgeStyles = {
  new: "bg-[color:var(--brand-soft)] text-[color:var(--brand)]",
  active: "border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] text-white shadow-[0_10px_22px_rgba(34,197,94,0.24)]",
  pending: "border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] text-[#422006] shadow-[0_10px_22px_rgba(250,204,21,0.24)]",
  error: "border border-[#ef4444] bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] text-white shadow-[0_10px_22px_rgba(220,38,38,0.24)]",
} as const;

export function AtomicBadge({
  children,
  variant,
  className,
}: {
  children: React.ReactNode;
  variant: keyof typeof atomicBadgeStyles;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        atomicBadgeStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
