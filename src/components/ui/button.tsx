import { cn } from "@/utils/cn";

const buttonStyles = {
  primary:
    "border border-[color:color-mix(in_srgb,var(--warning)_60%,transparent)] bg-[linear-gradient(90deg,var(--cta)_0%,var(--cta-strong)_100%)] text-white shadow-[0_18px_38px_color-mix(in_srgb,var(--cta)_28%,transparent)] hover:-translate-y-0.5 hover:text-white hover:brightness-[1.02]",
  secondary:
    "border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)] shadow-sm hover:border-[color:var(--border-strong)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]",
  ghost:
    "text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]",
  danger:
    "border border-[color:var(--error)] bg-[linear-gradient(90deg,var(--error)_0%,#b91c1c_100%)] text-white shadow-[0_14px_30px_color-mix(in_srgb,var(--error)_22%,transparent)] hover:-translate-y-0.5 hover:text-white hover:opacity-95",
} as const;

export function Button({
  children,
  className,
  variant = "primary",
  onClick,
  disabled = false,
  loading = false,
  type = "button",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof buttonStyles;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-pill)] px-4 py-2.5 text-[13px] font-semibold transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-[var(--motion-small)] ease-[var(--ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--brand)_45%,white)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60",
        buttonStyles[variant],
        className,
      )}
    >
      {loading ? <span className="mr-2 h-2.5 w-2.5 rounded-full bg-white/90 animate-[status-breathe_1s_ease-in-out_infinite]" /> : null}
      {children}
    </button>
  );
}
