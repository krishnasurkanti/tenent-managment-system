import { cn } from "@/lib/utils";

const buttonStyles = {
  primary:
    "border border-indigo-300/40 bg-[var(--action-gradient)] text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:text-white hover:opacity-95",
  secondary:
    "border border-[var(--border)] bg-[var(--surface-gradient)] text-slate-800 shadow-sm hover:border-[var(--border-strong)] hover:bg-[var(--pill-gradient)] hover:text-slate-900",
  ghost:
    "text-slate-600 hover:bg-[var(--muted)] hover:text-slate-900",
  danger:
    "border border-rose-300 bg-[linear-gradient(90deg,#fb7185_0%,#f43f5e_100%)] text-white shadow-[0_14px_30px_rgba(244,63,94,0.2)] hover:-translate-y-0.5 hover:text-white hover:opacity-95",
} as const;

export function Button({
  children,
  className,
  variant = "primary",
  onClick,
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof buttonStyles;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60",
        buttonStyles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
