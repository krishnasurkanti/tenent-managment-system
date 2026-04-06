import { cn } from "@/lib/utils";

const buttonStyles = {
  primary: "bg-[var(--accent)] text-white hover:opacity-90",
  secondary: "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]",
  ghost: "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
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
        "inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-[13px] font-semibold transition",
        buttonStyles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
