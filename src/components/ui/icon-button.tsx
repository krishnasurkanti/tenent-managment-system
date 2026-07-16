import { cn } from "@/utils/cn";

/*
 * IconButton — icon-only action with a required accessible label (rebuild).
 * Always meets the 44px touch-target minimum on `md`. `label` is mandatory so
 * the control is never unlabelled for screen readers.
 */

const variantStyles = {
  ghost:
    "text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]",
  subtle:
    "border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-primary)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-strong)]",
  destructive:
    "text-[color:var(--error)] hover:bg-[color:var(--error-soft)]",
} as const;

const sizeStyles = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
} as const;

export function IconButton({
  children,
  label,
  variant = "ghost",
  size = "md",
  className,
  onClick,
  disabled = false,
  type = "button",
  ...props
}: {
  children: React.ReactNode;
  label: string;
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick" | "disabled" | "className">) {
  return (
    <button
      {...props}
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-[background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50",
        sizeStyles[size],
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
