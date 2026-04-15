import { cn } from "@/utils/cn";

const variantStyles = {
  primary:
    "bg-[color:var(--brand)] text-white shadow-[0_18px_36px_rgba(99,102,241,0.28)] hover:brightness-[1.06]",
  secondary:
    "border border-[color:var(--border)] bg-[color:var(--bg-elevated)] text-[color:var(--fg-primary)] hover:bg-[color:var(--muted)]",
  ghost:
    "bg-transparent text-[color:var(--fg-primary)] hover:bg-[color:var(--muted)]",
  destructive:
    "bg-[color:var(--error)] text-white shadow-[0_18px_36px_rgba(239,68,68,0.22)] hover:brightness-[1.04]",
} as const;

const sizeStyles = {
  small: "min-h-9 px-3 text-xs",
  medium: "min-h-11 px-4 text-sm",
  large: "min-h-12 px-5 text-base",
} as const;

export function AtomicButton({
  children,
  variant = "primary",
  size = "medium",
  className,
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-[14px] font-semibold transition-[transform,background-color,color,box-shadow,opacity] duration-[var(--motion-small)] ease-[var(--ease-standard)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </button>
  );
}
