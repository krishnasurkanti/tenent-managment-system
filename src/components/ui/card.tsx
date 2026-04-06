import { cn } from "@/lib/utils";

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
        "rounded-[28px] border border-[var(--border)] bg-[var(--surface-gradient)] shadow-[var(--shadow-card)] backdrop-blur",
        className,
      )}
    >
      {children}
    </section>
  );
}
