"use client";

import { AlertCircle, Bell, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/ui/data/status-badge";
import { useHostelContext } from "@/store/hostel-context";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { formatPaymentDate, getDueStatus } from "@/utils/payment";

function toStatusTone(tone: string): StatusTone {
  if (tone === "red") return "overdue";
  if (tone === "orange") return "due";
  if (tone === "yellow") return "due-soon";
  return "paid";
}

export default function OwnerNotificationsPage() {
  const router = useRouter();
  const { currentHostel, currentHostelId, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants(currentHostelId);

  if (hostelLoading || tenantLoading) return <LoadingState />;

  if (!currentHostel) {
    return (
      <Card className="p-6">
        <EmptyState
          title="No hostel selected"
          description="Create a hostel to see alerts."
          action={<Button onClick={() => router.push("/owner/create-hostel")}>Create Hostel</Button>}
        />
      </Card>
    );
  }

  const alerts = allTenants
    .filter((tenant) => tenant.assignment?.hostelId === currentHostel.id)
    .map((tenant) => ({ tenant, status: getDueStatus(tenant.nextDueDate) }))
    .filter(({ status }) => status.tone === "red" || status.tone === "orange")
    .sort((left, right) => left.status.priority - right.status.priority);

  const overdue = alerts.filter(({ status }) => status.tone === "red").length;
  const dueSoon = alerts.filter(({ status }) => status.tone === "orange").length;

  return (
    <div className={`flex flex-col gap-4 transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Notifications</p>
          <h1 className="font-display mt-0.5 text-[clamp(1.35rem,4.5vw,1.75rem)] font-bold text-[color:var(--fg-primary)]">Alert centre</h1>
          <p className="text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">
            {alerts.length === 0 ? "All clear — nothing urgent." : `${alerts.length} alert${alerts.length !== 1 ? "s" : ""} need attention.`}
          </p>
        </div>
        <span
          className={`mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
            alerts.length === 0
              ? "border-[color:color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color:var(--success-soft)] text-[color:var(--success)]"
              : "border-[color:color-mix(in_srgb,var(--error)_40%,transparent)] bg-[color:var(--error-soft)] text-[color:var(--error)]"
          }`}
        >
          <Bell size={12} />
          {alerts.length === 0 ? "All clear" : `${alerts.length}`}
        </span>
      </header>

      {alerts.length > 0 ? (
        <section className="grid grid-cols-2 gap-2.5">
          <StatCard label="Overdue" value={overdue} helper="Act now" tone={overdue ? "danger" : "plain"} />
          <StatCard label="Due soon" value={dueSoon} helper="Collect before due date" tone={dueSoon ? "warning" : "plain"} />
        </section>
      ) : null}

      {alerts.length === 0 ? (
        <Card>
          <EmptyState icon={<CheckCircle2 size={28} className="text-[color:var(--success)]" />} title="No active notifications" description="No overdue or urgent alerts right now." />
        </Card>
      ) : (
        <section className="grid gap-2.5 sm:grid-cols-2">
          {alerts.map(({ tenant, status }) => (
            <div key={tenant.tenantId} className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-3 shadow-[var(--shadow-1)]">
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
                    status.tone === "red"
                      ? "bg-[color:var(--error-soft)] text-[color:var(--error)]"
                      : "bg-[color:var(--warning-soft)] text-[color:var(--warning)]"
                  }`}
                >
                  <AlertCircle size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[color:var(--fg-primary)]">{tenant.fullName}</p>
                      <p className="truncate text-[11px] text-[color:var(--fg-secondary)]">Room {tenant.assignment?.roomNumber} · {tenant.phone}</p>
                    </div>
                    <StatusBadge status={toStatusTone(status.tone)}>{status.label}</StatusBadge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-[color:var(--fg-secondary)]">Due {formatPaymentDate(tenant.nextDueDate)}</span>
                    <Button size="small" onClick={() => router.push(`/owner/payments?action=pay-rent&tenantId=${tenant.tenantId}`)}>
                      Pay now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-14 animate-pulse rounded-[var(--radius-lg)] bg-[color:var(--surface-soft)]" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-[color:var(--surface-soft)]" />
      ))}
    </div>
  );
}
