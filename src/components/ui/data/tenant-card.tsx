import { Phone } from "lucide-react";
import { cn } from "@/utils/cn";
import { TenantAvatar } from "@/components/ui/tenant-avatar";
import { StatusBadge, type StatusTone } from "@/components/ui/data/status-badge";

/*
 * TenantCard — tenant summary row for directory/lists (rebuild).
 * Presentational: the screen maps a TenantRecord into these explicit props so
 * the card stays decoupled from data shape. `onCollect` renders the full-width
 * collect CTA for unpaid tenants.
 */

export function TenantCard({
  tenantId,
  name,
  location,
  phone,
  rentLabel,
  status,
  statusLabel,
  onOpen,
  onCollect,
  collectLabel,
  className,
}: {
  tenantId: string;
  name: string;
  location?: string;
  phone?: string;
  rentLabel: string;
  status: StatusTone;
  statusLabel: string;
  onOpen?: () => void;
  onCollect?: () => void;
  collectLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-3 shadow-[var(--shadow-2)]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <TenantAvatar tenantId={tenantId} size="md" readOnly />
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          className="min-w-0 flex-1 text-left disabled:cursor-default"
        >
          <p className="truncate text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-primary)]">
            {name}
          </p>
          {location ? (
            <p className="truncate text-[length:var(--text-xs-size)] text-[color:var(--fg-secondary)]">
              {location}
            </p>
          ) : null}
          {phone ? (
            <p className="mt-0.5 flex items-center gap-1 text-[length:var(--text-xs-size)] text-[color:var(--fg-tertiary)]">
              <Phone size={11} /> {phone}
            </p>
          ) : null}
        </button>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[length:var(--text-sm-size)] font-bold tabular-nums text-[color:var(--fg-primary)]">
            {rentLabel}
          </span>
          <StatusBadge status={status}>{statusLabel}</StatusBadge>
        </div>
      </div>
      {onCollect ? (
        <button
          type="button"
          onClick={onCollect}
          className="w-full rounded-[var(--radius-md)] bg-[linear-gradient(90deg,#b45309_0%,#d97706_100%)] py-2 text-[length:var(--text-sm-size)] font-semibold text-white shadow-[var(--shadow-2)] active:scale-[0.99]"
        >
          {collectLabel ?? `Collect ${rentLabel}`}
        </button>
      ) : null}
    </div>
  );
}
