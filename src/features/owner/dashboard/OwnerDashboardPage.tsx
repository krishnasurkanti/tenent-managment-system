"use client";

import Link from "next/link";
import { AlertTriangle, BedDouble, CreditCard, DoorOpen, ReceiptText, Users } from "lucide-react";
import { useHostelContext } from "@/store/hostel-context";
import { Card } from "@/components/ui/card";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { formatPaymentDate, getDueStatus } from "@/utils/payment";

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
    <div className={`space-y-3 transition-opacity lg:space-y-3 ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <section className="grid gap-3 lg:hidden">
        <Card className="overflow-hidden p-4 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">{currentHostel.hostelName}</p>
          <p className="mt-1 truncate text-xs text-[color:var(--fg-secondary)]">{currentHostel.address}</p>
          <div className="mt-3 grid grid-cols-[1.5fr_1fr] gap-2.5">
            <div className="rounded-[20px] bg-[linear-gradient(180deg,var(--cta)_0%,var(--cta-strong)_100%)] px-3 py-3 text-[#1c1400] shadow-[0_16px_34px_rgba(249,193,42,0.18)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5a4200]">Collected</p>
              <p className="mt-1 text-[1.65rem] font-semibold leading-none">Rs {totalCollected.toLocaleString("en-IN")}</p>
              <p className="mt-2 text-[11px] text-[#6c5000]">{occupancyPercent}% occupied</p>
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
          <ActionTile href="/owner/payments?action=pay-rent" icon={CreditCard} label="Pay Rent" note="Record collection" variant="mobile" />
          <ActionTile href="/owner/payments" icon={ReceiptText} label="Due List" note={`${dueSoon.length} due soon`} variant="mobile" />
          <ActionTile href="/owner/notifications" icon={AlertTriangle} label="Overdue" note={`${overdue.length} need action`} variant="mobile" />
          <ActionTile href="/owner/payments" icon={Users} label="History" note="Latest payments" variant="mobile" />
        </div>

        <Card className="p-3 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Recent Activity</p>
              <h2 className="text-sm font-semibold text-white">Next actions</h2>
            </div>
            <Link href="/owner/payments" className="text-[11px] font-semibold text-[var(--accent)]">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentDueItems.length === 0 ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-4 text-center text-sm text-[color:var(--fg-secondary)]">No dues yet for this hostel.</div>
            ) : (
              recentDueItems.map(({ tenant, status }) => (
                <div key={tenant.tenantId} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                    <Link href={`/owner/tenants/${tenant.tenantId}`} className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{tenant.fullName}</p>
                      <p className="truncate text-[11px] text-[color:var(--fg-secondary)]">
                        Room {tenant.assignment?.roomNumber ?? "-"} / Due {formatPaymentDate(tenant.nextDueDate)}
                      </p>
                    </Link>
                    <span className={statusChip(status.tone)}>{status.label}</span>
                  </div>
                  {status.tone !== "green" ? (
                    <div className="mt-2.5 flex justify-end">
                      <Link
                        href={`/owner/payments?action=pay-rent&tenantId=${tenant.tenantId}`}
                        className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] px-3 text-[11px] font-semibold text-[#422006] shadow-[0_10px_22px_rgba(250,204,21,0.24)]"
                      >
                        Pay now
                      </Link>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <section className="hidden gap-3 lg:grid">
        <div className="relative overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-[radial-gradient(circle_at_top_right,rgba(249,193,42,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.14),transparent_28%),linear-gradient(180deg,#16284d_0%,#1b43b4_100%)] p-5 text-white shadow-[0_28px_70px_rgba(29,78,216,0.24)]">
          <div className="pointer-events-none absolute -right-12 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,230,150,0.2)_0%,rgba(255,255,255,0)_70%)] blur-2xl animate-[dashboard-glow_8s_ease-in-out_infinite]" />
          <div className="pointer-events-none absolute bottom-[-6rem] left-[-3rem] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.24)_0%,rgba(56,189,248,0)_70%)] blur-3xl" />
          <div className="relative grid items-start gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/80">Dashboard</p>
              <h1 className="mt-1.5 max-w-2xl text-[2.35rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white xl:text-[2.55rem]">{currentHostel.hostelName}</h1>
              <p className="mt-2 max-w-xl text-[13px] leading-5 text-blue-50/90">{currentHostel.address}</p>
              <div className="mt-4 inline-flex items-center rounded-full border border-white/14 bg-white/12 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                {occupancyPercent}% occupancy / {dueSoon.length + overdue.length} collections need attention
              </div>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-4">
                <DesktopMetric icon={CreditCard} label="Collected" value={`Rs ${totalCollected.toLocaleString("en-IN")}`} />
                <DesktopMetric icon={Users} label="Occupied" value={String(occupiedBeds)} />
                <DesktopMetric icon={BedDouble} label="Beds" value={String(totalBeds)} />
                <DesktopMetric icon={DoorOpen} label="Free" value={String(availableBeds)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <ActionTile href="/owner/tenants?action=add-tenant" icon={Users} label="Add Tenant" note="New check-in" variant="desktop" />
              <ActionTile href="/owner/payments" icon={CreditCard} label="Payments" note="Ledger and dues" variant="desktop" />
              <ActionTile href="/owner/rooms?view=available" icon={DoorOpen} label="Available" note="Open beds" variant="desktop" />
              <ActionTile href="/owner/notifications" icon={AlertTriangle} label="Alerts" note={`${overdue.length} overdue`} variant="desktop" />
            </div>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-[color:var(--border)] px-4 py-2.5">
              <h2 className="text-[15px] font-semibold text-white">Upcoming dues</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className="bg-[color:var(--surface-strong)] text-[color:var(--fg-secondary)]">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Tenant</th>
                    <th className="px-4 py-2.5 font-medium">Room</th>
                    <th className="px-4 py-2.5 font-medium">Due</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDueItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-5 text-center text-[color:var(--fg-secondary)]">
                        No upcoming dues.
                      </td>
                    </tr>
                  ) : (
                    recentDueItems.map(({ tenant, status }) => (
                      <tr key={tenant.tenantId} className="border-t border-[color:var(--border)]">
                        <td className="px-4 py-2.5 font-medium text-white">{tenant.fullName}</td>
                        <td className="px-4 py-2.5 text-[color:var(--fg-secondary)]">{tenant.assignment?.roomNumber ?? "-"}</td>
                        <td className="px-4 py-2.5 text-[color:var(--fg-secondary)]">{formatPaymentDate(tenant.nextDueDate)}</td>
                        <td className="px-4 py-2.5">
                          <span className={statusChip(status.tone)}>{status.label}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {status.tone !== "green" ? (
                            <Link
                              href={`/owner/payments?action=pay-rent&tenantId=${tenant.tenantId}`}
                              className="inline-flex min-h-8 items-center justify-center rounded-xl border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] px-3 text-[11px] font-semibold text-[#422006] shadow-[0_10px_22px_rgba(250,204,21,0.24)]"
                            >
                              Pay now
                            </Link>
                          ) : (
                            <span className="text-[11px] font-semibold text-[color:var(--fg-secondary)]">Paid</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Hostel snapshot</p>
            <div className="mt-2.5 grid gap-2.5">
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
  variant,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  note: string;
  variant: "mobile" | "desktop";
}) {
  return (
    <Link
      href={href}
      className={
        variant === "desktop"
          ? "rounded-[22px] border border-white/12 bg-white/10 px-3 py-2.5 text-white shadow-[0_14px_30px_rgba(8,18,37,0.1)] backdrop-blur transition hover:-translate-y-1 hover:bg-white/14"
          : "rounded-[20px] border border-slate-100 bg-white px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5"
      }
    >
      <div className="flex items-start gap-3">
        <div className={variant === "desktop" ? "rounded-2xl bg-white/12 p-2 text-sky-200 ring-1 ring-white/10" : "rounded-2xl bg-blue-50 p-2.5 text-[var(--accent)]"}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className={variant === "desktop" ? "text-[15px] font-semibold text-white" : "text-sm font-semibold text-slate-900"}>{label}</p>
          <p className={variant === "desktop" ? "mt-0.5 text-[10px] text-blue-100/78" : "mt-1 text-[11px] text-slate-500"}>{note}</p>
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
        tone === "warning"
          ? "border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] text-[#422006] shadow-[0_18px_36px_rgba(250,204,21,0.24)]"
          : "border border-[#ef4444] bg-[linear-gradient(180deg,rgba(220,38,38,0.32)_0%,rgba(127,29,29,0.42)_100%)] text-white shadow-[0_18px_36px_rgba(220,38,38,0.18)]"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-1 text-[1.3rem] font-semibold leading-none">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[color:rgba(255,255,255,0.16)] bg-white/12 px-2 py-2 shadow-sm backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
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
    <div className="rounded-[22px] border border-white/12 bg-white/10 px-3.5 py-3 shadow-[0_16px_34px_rgba(8,18,37,0.12)] backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-white/12 p-1.5 text-sky-200 ring-1 ring-white/10">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100/70">{label}</p>
      </div>
      <p className="mt-2 text-[1.85rem] font-semibold leading-none text-white">{value}</p>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5">
      <span className="text-sm text-[color:var(--fg-secondary)]">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
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
    <Card className="p-5 text-center">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">{description}</p>
      <Link
        href={ctaHref}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[linear-gradient(90deg,var(--cta)_0%,var(--cta-strong)_100%)] px-4 text-sm font-semibold text-[#1c1400]"
      >
        {ctaLabel}
      </Link>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-3">
      <Card className="p-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#422006] shadow-[0_10px_22px_rgba(250,204,21,0.24)]">
          <span className="h-2 w-2 rounded-full bg-[var(--cta)] animate-[status-breathe_1s_ease-in-out_infinite]" />
          Preparing dashboard
        </div>
        <SkeletonBlock className="mt-4 h-4 w-24" />
        <SkeletonBlock className="mt-2 h-7 w-44" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <SkeletonBlock className="h-24 rounded-[20px]" />
          <div className="grid gap-2">
            <SkeletonBlock className="h-11 rounded-[18px]" />
            <SkeletonBlock className="h-11 rounded-[18px]" />
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-24 rounded-[20px]" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-16 rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}

function statusChip(tone: string) {
  if (tone === "red") return "inline-flex rounded-full border border-[#ef4444] bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_12px_24px_rgba(220,38,38,0.28)]";
  if (tone === "orange" || tone === "yellow") {
    return "inline-flex rounded-full border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] px-2.5 py-1 text-[10px] font-semibold text-[#422006] shadow-[0_12px_24px_rgba(250,204,21,0.24)]";
  }
  return "inline-flex rounded-full border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_12px_24px_rgba(34,197,94,0.24)]";
}
