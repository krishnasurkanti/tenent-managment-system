import { cn } from "@/utils/cn";
import { inputSurface, inputBorder } from "@/components/ui/form/field";

/*
 * Textarea — multi-line control with optional character count (rebuild).
 * When `maxLength` is set and `showCount` is true, a live counter renders
 * below the field.
 */

export function Textarea({
  invalid = false,
  showCount = false,
  value,
  maxLength,
  className,
  ...props
}: {
  invalid?: boolean;
  showCount?: boolean;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const count = typeof value === "string" ? value.length : 0;
  return (
    <div className="flex flex-col gap-1">
      <textarea
        {...props}
        value={value}
        maxLength={maxLength}
        aria-invalid={invalid || undefined}
        className={cn(inputSurface, inputBorder(invalid), "min-h-[88px] resize-y px-3 py-2 leading-relaxed", className)}
      />
      {showCount && maxLength ? (
        <span className="self-end text-[length:var(--text-xs-size)] tabular-nums text-[color:var(--fg-tertiary)]">
          {count}/{maxLength}
        </span>
      ) : null}
    </div>
  );
}
