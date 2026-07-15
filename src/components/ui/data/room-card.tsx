import { cn } from "@/utils/cn";

/*
 * RoomCard — room/bed occupancy tile (rebuild).
 * `occupied`/`total` drives the bed dots and the derived status pill
 * (empty → green, partial → amber, full → red), matching the app's colour
 * semantics for capacity.
 */

type RoomStatus = "empty" | "partial" | "full";

function statusOf(occupied: number, total: number): RoomStatus {
  if (occupied <= 0) return "empty";
  if (occupied >= total) return "full";
  return "partial";
}

const statusStyle: Record<RoomStatus, { label: string; pill: string; dot: string }> = {
  empty: {
    label: "Empty",
    pill: "border-[#4ade80] text-[#4ade80] bg-[color:var(--success-soft)]",
    dot: "bg-[color:var(--success)]",
  },
  partial: {
    label: "Partial",
    pill: "border-[#facc15] text-[#facc15] bg-[color:var(--warning-soft)]",
    dot: "bg-[color:var(--warning)]",
  },
  full: {
    label: "Full",
    pill: "border-[#ef4444] text-[#f87171] bg-[color:var(--error-soft)]",
    dot: "bg-[color:var(--error)]",
  },
};

export function RoomCard({
  roomNumber,
  occupied,
  total,
  onClick,
  className,
}: {
  roomNumber: string;
  occupied: number;
  total: number;
  onClick?: () => void;
  className?: string;
}) {
  const status = statusOf(occupied, total);
  const s = statusStyle[status];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-3 text-left shadow-[var(--shadow-1)] disabled:cursor-default",
        onClick && "hover:border-[color:var(--border-strong)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[length:var(--text-sm-size)] font-bold text-[color:var(--fg-primary)]">
          {roomNumber}
        </span>
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", s.pill)}>
          {s.label}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 w-2 rounded-full",
              i < occupied ? s.dot : "bg-[color:var(--surface-strong)]",
            )}
          />
        ))}
      </div>
      <span className="text-[length:var(--text-xs-size)] tabular-nums text-[color:var(--fg-tertiary)]">
        {occupied}/{total} beds
      </span>
    </button>
  );
}
