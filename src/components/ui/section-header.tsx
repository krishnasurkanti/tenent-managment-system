export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">{eyebrow}</p> : null}
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">{title}</h1>
          <p className="max-w-2xl text-sm text-[var(--muted-foreground)]">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
