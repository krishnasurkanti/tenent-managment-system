import { cn } from "@/utils/cn";
import { inputSurface, inputBorder } from "@/components/ui/form/field";

/*
 * PhoneInput — phone control with a fixed country-code prefix (rebuild).
 * Strips non-digits on change and caps length so callers always receive a
 * clean national number. Default prefix +91 (India — primary market).
 */

export function PhoneInput({
  countryCode = "+91",
  value,
  onValueChange,
  maxDigits = 10,
  invalid = false,
  className,
  ...props
}: {
  countryCode?: string;
  value: string;
  onValueChange: (digits: string) => void;
  maxDigits?: number;
  invalid?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange">) {
  return (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-3 flex items-center gap-1 text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-secondary)]">
        {countryCode}
        <span className="h-4 w-px bg-[color:var(--border-strong)]" />
      </span>
      <input
        {...props}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(e) => onValueChange(e.target.value.replace(/\D/g, "").slice(0, maxDigits))}
        className={cn(inputSurface, inputBorder(invalid), "pl-[4.25rem] pr-3 tracking-wide", className)}
      />
    </div>
  );
}
