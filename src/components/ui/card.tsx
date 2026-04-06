import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)]", className)}>
      {children}
    </section>
  );
}
