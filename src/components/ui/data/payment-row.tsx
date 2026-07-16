import { CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";

/*
 * PaymentRow — a single settled-payment line for history lists (rebuild).
 * Green check leading icon, tenant + meta on the left, amount on the right.
 */

export function PaymentRow({
  name,
  meta,
  amountLabel,
  onClick,
  className,
}: {
  name: string;
  meta?: string;
  amountLabel: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-3 py-2.5 text-left disabled:cursor-default",
        onClick && "hover:border-[color:var(--border-strong)]",
        className,
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--success-soft)] text-[color:var(--success)]">
        <CheckCircle2 size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[length:var(--text-sm-size)] font-medium text-[color:var(--fg-primary)]">
          {name}
        </p>
        {meta ? (
          <p className="truncate text-[length:var(--text-xs-size)] text-[color:var(--fg-tertiary)]">
            {meta}
          </p>
        ) : null}
      </div>
      <span className="shrink-0 text-[length:var(--text-sm-size)] font-bold tabular-nums text-[color:var(--success)]">
        {amountLabel}
      </span>
    </button>
  );
}
