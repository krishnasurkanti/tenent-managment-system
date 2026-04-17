import { cn } from "@/utils/cn";

const variantStyles = {
  primary:
    "border border-[color:color-mix(in_srgb,var(--warning)_60%,transparent)] bg-[linear-gradient(90deg,var(--cta)_0%,var(--cta-strong)_100%)] text-white shadow-[0_18px_38px_color-mix(in_srgb,var(--cta)_28%,transparent)] hover:-translate-y-0.5 hover:brightness-[1.02]",
  secondary:
    "border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)] shadow-sm hover:border-[color:var(--border-strong)] hover:bg-[color:var(--muted)]",
  ghost:
    "text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]",
  danger:
    "border border-[color:var(--error)] bg-[linear-gradient(90deg,var(--error)_0%,#b91c1c_100%)] text-white shadow-[0_14px_30px_color-mix(in_srgb,var(--error)_22%,transparent)] hover:-translate-y-0.5 hover:opacity-95",
  brand:
    "bg-[color:var(--brand)] text-white shadow-[0_18px_36px_rgba(56,189,248,0.28)] hover:brightness-[1.06]",
} as const;

const sizeStyles = {
  small: "min-h-9 px-3 text-xs rounded-[10px]",
  medium: "min-h-11 px-4 text-[13px] rounded-[var(--radius-pill)]",
  large: "min-h-12 px-5 text-sm rounded-[var(--radius-pill)]",
} as const;

export function Button({
  children,
  className,
  variant = "primary",
  size = "medium",
  onClick,
  disabled = false,
  loading = false,
  type = "button",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
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
      aria-busy={loading}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-[var(--motion-small)] ease-[var(--ease-standard)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60",
        sizeStyles[size],
        variantStyles[variant],
        className,
      )}
    >
      {loading ? (
        <span
          aria-hidden
          className="mr-2 h-2.5 w-2.5 rounded-full bg-current opacity-80 animate-[status-breathe_1s_ease-in-out_infinite]"
        />
      ) : null}
      {children}
    </button>
  );
}
