import { cn } from "@/utils/cn";

export function AtomicInput({
  value,
  placeholder = "you@example.com",
  disabled = false,
  focused = false,
  requiredMessage,
}: {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  focused?: boolean;
  requiredMessage?: string;
}) {
  return (
    <div className="w-full max-w-md">
      <input
        type="email"
        value={value ?? ""}
        readOnly
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "min-h-11 w-full rounded-[14px] border bg-[color:var(--bg-elevated)] px-4 text-sm text-[color:var(--fg-primary)] outline-none",
          "transition-[border-color,box-shadow,opacity] duration-[var(--motion-small)] ease-[var(--ease-standard)] placeholder:text-[color:var(--fg-secondary)]",
          disabled ? "cursor-not-allowed border-[color:var(--border)] opacity-50" : "border-[color:var(--border)]",
          focused ? "border-[color:var(--brand)] shadow-[0_0_0_3px_rgba(99,102,241,0.18)]" : "",
        )}
      />
      {requiredMessage ? <p className="mt-2 text-xs font-medium text-[color:var(--error)]">{requiredMessage}</p> : null}
    </div>
  );
}
