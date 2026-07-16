import { cn } from "@/utils/cn";

/*
 * Spinner — circular loading indicator (rebuild).
 * Sizes map to the type/icon scale. Respects prefers-reduced-motion via the
 * global rule that neutralises animation duration.
 */

const sizeMap = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-9 w-9 border-[3px]",
} as const;

export function Spinner({
  size = "md",
  className,
  label = "Loading",
}: {
  size?: keyof typeof sizeMap;
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block animate-spin rounded-full border-[color:var(--border-strong)] border-t-[color:var(--brand)]",
        sizeMap[size],
        className,
      )}
    />
  );
}
