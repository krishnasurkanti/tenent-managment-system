import { cn } from "@/utils/cn";

/*
 * EmptyState — zero-data state with optional icon + action (rebuild).
 * Component form of the `.ui-empty` class so screens compose it consistently.
 */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 py-10 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-1 text-[color:var(--fg-tertiary)] opacity-60">{icon}</div>
      ) : null}
      <p className="text-[length:var(--text-base-size)] font-semibold text-[color:var(--fg-primary)]">
        {title}
      </p>
      {description ? (
        <p className="max-w-sm text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
