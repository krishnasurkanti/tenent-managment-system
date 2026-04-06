import { cn } from "@/lib/utils";

const buttonStyles = {
  primary: "border border-white/70 bg-[var(--action-gradient)] text-white shadow-[var(--shadow-soft)] hover:opacity-95",
  secondary: "border border-[var(--border)] bg-[var(--surface-gradient)] text-[var(--foreground)] shadow-sm hover:border-[var(--border-strong)] hover:bg-[var(--pill-gradient)]",
  ghost: "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
  danger: "border border-rose-300 bg-[linear-gradient(90deg,#ff8ca6_0%,#ff6e8d_100%)] text-white shadow-[0_14px_30px_rgba(255,110,141,0.2)] hover:opacity-95",
} as const;

export function Button({
  children,
  className,
  variant = "primary",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof buttonStyles;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2.5 text-[13px] font-semibold transition active:scale-[0.99]",
        buttonStyles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
