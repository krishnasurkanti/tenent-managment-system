import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";
import { inputSurface, inputBorder } from "@/components/ui/form/field";

/*
 * SelectInput — styled native select (rebuild).
 * Native <select> keeps mobile pickers/keyboard behaviour correct; we only
 * restyle the surface and supply our own chevron.
 */

export type SelectOption = { value: string; label: string; disabled?: boolean };

export function SelectInput({
  options,
  placeholder,
  invalid = false,
  className,
  ...props
}: {
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative flex items-center">
      <select
        {...props}
        aria-invalid={invalid || undefined}
        className={cn(
          inputSurface,
          inputBorder(invalid),
          "cursor-pointer appearance-none pl-3 pr-9 [&>option]:bg-[color:var(--bg-elevated)] [&>option]:text-[color:var(--fg-primary)]",
          className,
        )}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 text-[color:var(--fg-tertiary)]"
      />
    </div>
  );
}
