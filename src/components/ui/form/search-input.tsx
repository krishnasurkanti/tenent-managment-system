import { Search, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { inputSurface, inputBorder } from "@/components/ui/form/field";

/*
 * SearchInput — search control with leading icon + clear button (rebuild).
 * Controlled: pass value + onValueChange. Debouncing is left to the caller
 * (see use-debounced-value) so this stays a pure presentational control.
 */

export function SearchInput({
  value,
  onValueChange,
  placeholder = "Search…",
  className,
  ...props
}: {
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <div className="relative flex items-center">
      <Search size={16} className="pointer-events-none absolute left-3 text-[color:var(--fg-tertiary)]" />
      <input
        {...props}
        type="search"
        role="searchbox"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(inputSurface, inputBorder(false), "pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden", className)}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onValueChange("")}
          className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--fg-tertiary)] hover:bg-[color:var(--muted)] hover:text-[color:var(--fg-primary)]"
        >
          <X size={15} />
        </button>
      ) : null}
    </div>
  );
}
