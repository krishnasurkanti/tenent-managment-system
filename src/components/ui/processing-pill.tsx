import { cn } from "@/utils/cn";

export function ProcessingPill({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#422006] shadow-[0_10px_22px_rgba(250,204,21,0.24)]",
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-[var(--cta)] animate-[status-breathe_1s_ease-in-out_infinite]" />
      {label}
    </div>
  );
}
