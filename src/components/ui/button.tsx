import { cn } from "@/utils/cn";

/*
 * Button — core action primitive (rebuild).
 *
 * Variants: default(=primary) | secondary | ghost | destructive(=danger) | brand
 * Sizes:    small | medium | large | icon
 * States:   default, hover, pressed (active:scale), focused (global ring),
 *           disabled, loading (aria-busy + spinner).
 *
 * `primary`/`danger` are kept as aliases of `default`/`destructive` so existing
 * callers keep working while the rebuild migrates to the spec names.
 */

const baseVariants = {
  default:
    "border border-[color:color-mix(in_srgb,var(--brand)_45%,transparent)] bg-[linear-gradient(90deg,var(--cta)_0%,var(--cta-strong)_100%)] text-white shadow-[var(--shadow-brand)] hover:-translate-y-0.5 hover:brightness-[1.05]",
  secondary:
    "border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)] shadow-[var(--shadow-1)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--muted)]",
  ghost:
    "text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]",
  destructive:
    "border border-[color:var(--error)] bg-[linear-gradient(90deg,var(--error)_0%,#b91c1c_100%)] text-white shadow-[0_14px_30px_color-mix(in_srgb,var(--error)_22%,transparent)] hover:-translate-y-0.5 hover:opacity-95",
  brand:
    "bg-[color:var(--brand)] text-white shadow-[var(--shadow-brand)] hover:brightness-[1.06]",
} as const;

// Legacy aliases → keep old call sites compiling.
const variantStyles = {
  ...baseVariants,
  primary: baseVariants.default,
  danger: baseVariants.destructive,
} as const;

const sizeStyles = {
  small: "min-h-9 px-3 text-xs rounded-[var(--radius-sm)]",
  medium: "min-h-11 px-4 text-[13px] rounded-[var(--radius-md)]",
  large: "min-h-12 px-5 text-sm rounded-[var(--radius-md)]",
  icon: "h-11 w-11 p-0 rounded-[var(--radius-md)]",
} as const;

export function Button({
  children,
  className,
  variant = "default",
  size = "medium",
  fullWidth = false,
  onClick,
  disabled = false,
  loading = false,
  type = "button",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  fullWidth?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick" | "disabled" | "className">) {
  return (
    <button
      {...props}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-[var(--duration-normal)] ease-[var(--ease-standard)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60",
        fullWidth && "w-full",
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
