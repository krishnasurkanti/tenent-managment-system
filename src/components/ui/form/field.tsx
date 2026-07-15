import { useId } from "react";
import { cn } from "@/utils/cn";

/*
 * FormField — consistent label / control / helper / error wrapper (rebuild).
 * Wire the generated id into the control via the render-prop so label + error
 * are correctly associated for screen readers.
 */

export function FormField({
  label,
  required = false,
  error,
  helper,
  className,
  children,
}: {
  label?: string;
  required?: boolean;
  error?: string | null;
  helper?: string;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  const invalid = Boolean(error);
  const describedBy = error ? helpId : helper ? helpId : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={id}
          className="text-[length:var(--text-xs-size)] font-medium tracking-[0.04em] text-[color:var(--fg-secondary)]"
        >
          {label}
          {required ? <span className="ml-0.5 text-[color:var(--error)]">*</span> : null}
        </label>
      ) : null}
      {children({ id, describedBy, invalid })}
      {error ? (
        <p id={helpId} className="text-[length:var(--text-xs-size)] text-[color:var(--error)]">
          {error}
        </p>
      ) : helper ? (
        <p id={helpId} className="text-[length:var(--text-xs-size)] text-[color:var(--fg-tertiary)]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/** Shared input surface used by every text-like control in the rebuild. */
export const inputSurface =
  "w-full min-h-11 rounded-[var(--radius-md)] border bg-[color:var(--surface-soft)] text-[color:var(--fg-primary)] text-[length:var(--text-sm-size)] outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-standard)] placeholder:text-[color:var(--fg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed";

export function inputBorder(invalid?: boolean) {
  return invalid
    ? "border-[color:var(--error)] focus:border-[color:var(--error)] focus:shadow-[0_0_0_2px_var(--error-soft)]"
    : "border-[color:var(--border-strong)] focus:border-[color:color-mix(in_srgb,var(--brand)_70%,transparent)] focus:shadow-[0_0_0_2px_var(--brand-soft)]";
}
