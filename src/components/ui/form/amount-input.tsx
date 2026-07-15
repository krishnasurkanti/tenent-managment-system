import { cn } from "@/utils/cn";
import { inputSurface, inputBorder } from "@/components/ui/form/field";

/*
 * AmountInput — currency amount control (rebuild).
 * Renders the currency symbol inside the field and forces the numeric keypad
 * on mobile. Value stays a plain number string; formatting is the caller's job.
 */

export function AmountInput({
  currency = "₹",
  invalid = false,
  className,
  ...props
}: {
  currency?: string;
  invalid?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-3 flex text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-secondary)]">
        {currency}
      </span>
      <input
        {...props}
        type="text"
        inputMode="decimal"
        aria-invalid={invalid || undefined}
        className={cn(inputSurface, inputBorder(invalid), "pl-8 pr-3 font-semibold tabular-nums", className)}
      />
    </div>
  );
}
