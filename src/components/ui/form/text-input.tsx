import { cn } from "@/utils/cn";
import { inputSurface, inputBorder } from "@/components/ui/form/field";

/*
 * TextInput — single-line text control with optional leading/trailing icons
 * (rebuild). Pass `invalid` to render the error border. Extends native input
 * props so type/inputMode/autoComplete/etc. pass straight through.
 */

export function TextInput({
  leadingIcon,
  trailingIcon,
  invalid = false,
  className,
  ...props
}: {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  invalid?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative flex items-center">
      {leadingIcon ? (
        <span className="pointer-events-none absolute left-3 flex text-[color:var(--fg-tertiary)]">
          {leadingIcon}
        </span>
      ) : null}
      <input
        {...props}
        aria-invalid={invalid || undefined}
        className={cn(
          inputSurface,
          inputBorder(invalid),
          leadingIcon ? "pl-10" : "pl-3",
          trailingIcon ? "pr-10" : "pr-3",
          className,
        )}
      />
      {trailingIcon ? (
        <span className="absolute right-3 flex text-[color:var(--fg-tertiary)]">{trailingIcon}</span>
      ) : null}
    </div>
  );
}
