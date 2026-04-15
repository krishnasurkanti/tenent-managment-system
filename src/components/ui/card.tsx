import { cn } from "@/utils/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--bg-surface)_92%,white)_0%,var(--bg-surface)_100%)] text-[color:var(--fg-primary)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </section>
  );
}
