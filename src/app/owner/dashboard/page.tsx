"use client";

import Link from "next/link";
import { AlertTriangle, BedDouble, CreditCard, DoorOpen, ReceiptText, Users } from "lucide-react";
import { useHostelContext } from "@/components/hostel-context-provider";
import { Card } from "@/components/ui/card";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { formatPaymentDate, getDueStatus } from "@/lib/payment-utils";

export default function OwnerDashboardPage() {
  const { currentHostel, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants();

  if (hostelLoading || tenantLoading) {
    return <LoadingState />;
  }

  if (!currentHostel) {
    return (
      <EmptyState
        title="No hostel found"
        description="Create your first hostel to start tracking tenants, dues, and rooms."
        ctaHref="/owner/create-hostel"
        ctaLabel="Create Hostel"
      />
    );
  }

  const tenants = allTenants.filter((tenant) => tenant.assignment?.hostelId === currentHostel.id);
  const totalRooms = currentHostel.floors.reduce((sum, floor) => sum + floor.rooms.length, 0);
  const totalBeds = currentHostel.floors.reduce(
    (sum, floor) => sum + floor.rooms.reduce((roomSum, room) => roomSum + room.bedCount, 0),
    0,
  );
  const occupiedBeds = tenants.length;
  const availableBeds = Math.max(totalBeds - occupiedBeds, 0);
  const totalCollected = tenants.reduce((sum, tenant) => sum + tenant.rentPaid, 0);
  const dueSoon = tenants.filter((tenant) => {
    const tone = getDueStatus(tenant.nextDueDate).tone;
    return tone === "orange" || tone === "yellow";
  });
  const overdue = tenants.filter((tenant) => getDueStatus(tenant.nextDueDate).tone === "red");
  const recentDueItems = tenants
    .map((tenant) => ({ tenant, status: getDueStatus(tenant.nextDueDate) }))
    .sort((left, right) => left.status.priority - right.status.priority)
    .slice(0, 4);
  const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return (
    <div className={`space-y-3 transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <section className="grid gap-3 lg:hidden">
        <Card className="overflow-hidden rounded-[24px] border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#eff6ff_100%)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{currentHostel.hostelName}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{currentHostel.address}</p>
          <div className="mt-3 grid grid-cols-[1.5fr_1fr] gap-2.5">
            <div className="rounded-[20px] bg-[var(--action-gradient)] px-3 py-3 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-100">Collected</p>
              <p className="mt-1 text-[1.65rem] font-semibold leading-none">Rs {totalCollected.toLocaleString("en-IN")}</p>
              <p className="mt-2 text-[11px] text-blue-100">{occupancyPercent}% occupied</p>
            </div>
            <div className="grid gap-2">
              <MetricTile label="Due" value={String(dueSoon.length)} tone="warning" />
              <MetricTile label="Overdue" value={String(overdue.length)} tone="danger" />
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
            <MiniMetric label="Beds" value={String(totalBeds)} />
            <MiniMetric label="Free" value={String(availableBeds)} />
            <MiniMetric label="Rooms" value={String(totalRooms)} />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2.5">
          <ActionTile href="/owner/payments?action=pay-rent" icon={CreditCard} label="Pay Rent" note="Record collection" />
          <ActionTile href="/owner/payments" icon={ReceiptText} label="Due List" note={`${dueSoon.length} due soon`} />
          <ActionTile href="/owner/notifications" icon={AlertTriangle} label="Overdue" note={`${overdue.length} need action`} />
          <ActionTile href="/owner/payments" icon={Users} label="History" note="Latest payments" />
        </div>

        <Card className="rounded-[24px] border-slate-100 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Recent Activity</p>
              <h2 className="text-sm font-semibold text-slate-900">Next actions</h2>
            </div>
            <Link href="/owner/payments" className="text-[11px] font-semibold text-[var(--accent)]">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentDueItems.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">No dues yet for this hostel.</div>
            ) : (
              recentDueItems.map(({ tenant, status }) => (
                <Link
                  key={tenant.tenantId}
                  href={`/owner/tenants/${tenant.tenantId}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-slate-100 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{tenant.fullName}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      Room {tenant.assignment?.roomNumber ?? "-"} • Due {formatPaymentDate(tenant.nextDueDate)}
                    </p>
                  </div>
                  <span className={statusChip(status.tone)}>{status.label}</span>
                </Link>
              ))
            )}
          </div>
        </Card>
      </section>

      <section className="hidden gap-4 lg:grid">
        <Card className="overflow-hidden border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#eff6ff_100%)] p-5">
          <div className="grid items-start gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Dashboard</p>
              <h1 className="mt-1 text-[2rem] font-semibold tracking-tight text-slate-900">{currentHostel.hostelName}</h1>
              <p className="mt-1 text-sm text-slate-500">{currentHostel.address}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <DesktopMetric icon={CreditCard} label="Collected" value={`Rs ${totalCollected.toLocaleString("en-IN")}`} />
                <DesktopMetric icon={Users} label="Occupied" value={String(occupiedBeds)} />
                <DesktopMetric icon={BedDouble} label="Beds" value={String(totalBeds)} />
                <DesktopMetric icon={DoorOpen} label="Free" value={String(availableBeds)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ActionTile href="/owner/tenants?action=add-tenant" icon={Users} label="Add Tenant" note="New check-in" />
              <ActionTile href="/owner/payments" icon={CreditCard} label="Payments" note="Ledger and dues" />
              <ActionTile href="/owner/rooms?view=available" icon={DoorOpen} label="Available" note="Open beds" />
              <ActionTile href="/owner/notifications" icon={AlertTriangle} label="Alerts" note={`${overdue.length} overdue`} />
            </div>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden border-white/70 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Upcoming dues</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tenant</th>
                    <th className="px-4 py-3 font-medium">Room</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDueItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                        No upcoming dues.
                      </td>
                    </tr>
                  ) : (
                    recentDueItems.map(({ tenant, status }) => (
                      <tr key={tenant.tenantId} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">{tenant.fullName}</td>
                        <td className="px-4 py-3 text-slate-600">{tenant.assignment?.roomNumber ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{formatPaymentDate(tenant.nextDueDate)}</td>
                        <td className="px-4 py-3">
                          <span className={statusChip(status.tone)}>{status.label}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="border-white/70 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Hostel snapshot</p>
            <div className="mt-3 grid gap-3">
              <SnapshotRow label="Floors" value={String(currentHostel.floors.length)} />
              <SnapshotRow label="Rooms" value={String(totalRooms)} />
              <SnapshotRow label="Beds" value={String(totalBeds)} />
              <SnapshotRow label="Vacancy" value={`${availableBeds} beds`} />
              <SnapshotRow label="Due soon" value={String(dueSoon.length)} />
              <SnapshotRow label="Overdue" value={String(overdue.length)} />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function ActionTile({
  href,
  icon: Icon,
  label,
  note,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  note: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[20px] border border-slate-100 bg-white px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[var(--pill-gradient)] p-2.5 text-[var(--accent)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-[11px] text-slate-500">{note}</p>
        </div>
      </div>
    </Link>
  );
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "warning" | "danger";
}) {
  return (
    <div
      className={`rounded-[18px] px-3 py-2.5 ${
        tone === "warning" ? "bg-[var(--warning-soft)] text-amber-700" : "bg-[var(--danger-soft)] text-rose-700"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-1 text-[1.3rem] font-semibold leading-none">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-white px-2 py-2 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function DesktopMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-[var(--pill-gradient)] p-2 text-[var(--accent)]">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      </div>
      <p className="mt-3 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function EmptyState({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <Card className="rounded-[24px] border-slate-100 bg-white p-5 text-center">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <Link
        href={ctaHref}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--action-gradient)] px-4 text-sm font-semibold text-white"
      >
        {ctaLabel}
      </Link>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-3">
      <Card className="rounded-[24px] border-slate-100 bg-white p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-7 w-44 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="h-24 animate-pulse rounded-[20px] bg-slate-100" />
          <div className="grid gap-2">
            <div className="h-11 animate-pulse rounded-[18px] bg-slate-100" />
            <div className="h-11 animate-pulse rounded-[18px] bg-slate-100" />
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-[20px] bg-slate-100" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-[20px] bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

function statusChip(tone: string) {
  if (tone === "red") return "inline-flex rounded-full bg-[var(--danger-soft)] px-2.5 py-1 text-[10px] font-semibold text-rose-700";
  if (tone === "orange" || tone === "yellow") {
    return "inline-flex rounded-full bg-[var(--warning-soft)] px-2.5 py-1 text-[10px] font-semibold text-amber-700";
  }
  return "inline-flex rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[10px] font-semibold text-emerald-700";
}
