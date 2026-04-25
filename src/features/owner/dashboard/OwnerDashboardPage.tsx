"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CalendarClock, CreditCard, DoorOpen, ReceiptText, TrendingUp, Users } from "lucide-react";
import { useHostelContext } from "@/store/hostel-context";
import { Card } from "@/components/ui/card";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { ownerStatusClass } from "@/components/ui/owner-theme";
import { formatPaymentDate, getDueStatus } from "@/utils/payment";
import { getHostelOccupancySummary } from "@/utils/hostel-occupancy";
import { TenantRentSearch } from "@/features/payments/components/TenantRentSearch";

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { currentHostel, currentHostelId, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants(currentHostelId);

  useEffect(() => {
    if (!hostelLoading && !currentHostel) {
      router.replace("/owner/create-hostel");
    }
  }, [hostelLoading, currentHostel, router]);

  if (hostelLoading) {
    return <LoadingState />;
  }

  if (!currentHostel) {
    return <LoadingState />;
  }

  if (tenantLoading) {
    return <LoadingState />;
  }

  const tenants = allTenants.filter((tenant) => tenant.assignment?.hostelId === currentHostel.id);
  const isResidence = currentHostel.type === "RESIDENCE";
  const occupancy = getHostelOccupancySummary(currentHostel, tenants);
  const totalRooms = occupancy.totalRooms;
  const totalBeds = occupancy.totalBeds;
  const occupiedBeds = isResidence ? occupancy.occupiedUnits : occupancy.occupiedBeds;
  const availableBeds = isResidence ? occupancy.vacantUnits : occupancy.vacantBeds;
  const totalCollected = tenants.reduce((sum, tenant) => sum + tenant.rentPaid, 0);
  const dueSoon = tenants.filter((tenant) => {
    const tone = getDueStatus(tenant.nextDueDate).tone;
    return tone === "orange" || tone === "yellow";
  });
  const overdue = tenants.filter((tenant) => getDueStatus(tenant.nextDueDate).tone === "red");
  const paid = tenants.filter((tenant) => getDueStatus(tenant.nextDueDate).tone === "green");
  const recentDueItems = tenants
    .map((tenant) => ({ tenant, status: getDueStatus(tenant.nextDueDate) }))
    .sort((left, right) => left.status.priority - right.status.priority)
    .slice(0, 4);
  const capacityBase = isResidence ? totalRooms : totalBeds;
  const occupancyPercent = capacityBase > 0 ? Math.round((tenants.length / capacityBase) * 100) : 0;
  const expectedRevenue = tenants.reduce((sum, tenant) => sum + tenant.monthlyRent, 0);
  const collectionRate = expectedRevenue > 0 ? Math.round((totalCollected / expectedRevenue) * 100) : 0;
  const paymentHealthScore = Math.max(0, Math.min(100, Math.round(occupancyPercent * 0.4 + collectionRate * 0.6 - overdue.length * 4)));
  const attentionCount = dueSoon.length + overdue.length;
  const urgentShare = tenants.length > 0 ? Math.round((attentionCount / tenants.length) * 100) : 0;
  const snapshotRows = [
    { label: "Collection rate", value: `${collectionRate}%` },
    { label: "Payment health", value: `${paymentHealthScore}/100` },
    { label: "Paid on track", value: String(paid.length) },
    { label: "Needs attention", value: `${attentionCount} (${urgentShare}%)` },
    { label: isResidence ? "Vacant units" : "Vacant beds", value: String(availableBeds) },
    { label: "Monthly expected", value: `Rs ${expectedRevenue.toLocaleString("en-IN")}` },
  ];

  return (
    <div className={`space-y-3 transition-opacity lg:space-y-3 ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <section className="grid gap-3 lg:hidden">
        <Card className="nestiq-grid-bg overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_34%),linear-gradient(160deg,#111114_0%,#09090b_62%,#131324_100%)] p-4 shadow-[0_18px_46px_rgba(0,0,0,0.34)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Live snapshot</p>
              <h1 className="font-display mt-1 text-xl font-bold text-white">{currentHostel.hostelName}</h1>
              <p className="mt-1 truncate text-xs text-[color:var(--fg-secondary)]">{currentHostel.address}</p>
            </div>
            <span className="rounded-full border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.14)] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)]">
              {occupancyPercent}% full
            </span>
          </div>
          <div className="mt-3 grid grid-cols-[1.5fr_1fr] gap-2.5">
            <div className="rounded-[18px] bg-[linear-gradient(180deg,#6366f1_0%,#4f46e5_100%)] px-3 py-3 text-white shadow-[0_18px_40px_rgba(99,102,241,0.28)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-100/80">Collected this cycle</p>
              <p className="mt-1 text-[1.65rem] font-semibold leading-none">Rs {totalCollected.toLocaleString("en-IN")}</p>
              <p className="mt-2 text-[11px] text-indigo-100/70">{collectionRate}% of expected revenue logged</p>
            </div>
            <div className="grid gap-2">
              <MetricTile label="Due" value={String(dueSoon.length)} tone="warning" />
              <MetricTile label="Overdue" value={String(overdue.length)} tone="danger" />
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
            <MiniMetric label={isResidence ? "Units" : "Beds"} value={String(isResidence ? totalRooms : totalBeds)} />
            <MiniMetric label="Free" value={String(availableBeds)} />
            <MiniMetric label={isResidence ? "Floors" : "Rooms"} value={String(isResidence ? currentHostel.floors.length : totalRooms)} />
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <InlineStat label="Payment health" value={`${paymentHealthScore}/100`} icon={TrendingUp} />
            <InlineStat label="Attention load" value={`${attentionCount} tenants`} icon={CalendarClock} />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2.5">
          <ActionTile href="/owner/payments" icon={CreditCard} label="Pay Rent" note="Record collection" variant="mobile" />
          <ActionTile href="/owner/payments" icon={ReceiptText} label="Due List" note={`${dueSoon.length} due soon`} variant="mobile" />
          <ActionTile href="/owner/notifications" icon={AlertTriangle} label="Overdue" note={`${overdue.length} need action`} variant="mobile" />
          <ActionTile href="/owner/payments" icon={Users} label="History" note="Latest payments" variant="mobile" />
        </div>

        <Card className="p-3 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Recent Activity</p>
              <h2 className="font-display text-sm font-semibold text-white">Next actions</h2>
            </div>
            <Link href="/owner/payments?filter=due" className="text-[11px] font-semibold text-[var(--accent)]">
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
                    <span className={ownerStatusClass(status.tone)}>{status.label}</span>
                  </div>
                  {status.tone !== "green" ? (
                    <div className="mt-2.5 flex justify-end">
                      <Link
                        href={`/owner/payments?action=pay-rent&tenantId=${tenant.tenantId}`}
                        className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[rgba(99,102,241,0.4)] bg-[linear-gradient(180deg,#6366f1_0%,#4f46e5_100%)] px-3 text-[11px] font-semibold text-white shadow-[0_10px_22px_rgba(99,102,241,0.24)]"
                      >
                        Collect
                        <ArrowRight className="h-3.5 w-3.5" />
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
        <div className="nestiq-grid-bg relative overflow-hidden rounded-[22px] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.24),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.16),transparent_26%),linear-gradient(180deg,#111114_0%,#18181c_100%)] p-5 text-white shadow-[0_28px_70px_rgba(0,0,0,0.38)]">
          <div className="pointer-events-none absolute -right-12 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.24)_0%,rgba(255,255,255,0)_70%)] blur-2xl animate-[dashboard-glow_8s_ease-in-out_infinite]" />
          <div className="pointer-events-none absolute bottom-[-6rem] left-[-3rem] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.18)_0%,rgba(245,158,11,0)_70%)] blur-3xl" />
          <div className="relative grid items-start gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-100/70">Owner dashboard</p>
              <h1 className="font-display mt-1.5 max-w-2xl text-[2.35rem] font-bold leading-[0.94] tracking-[-0.05em] text-white xl:text-[2.55rem]">{currentHostel.hostelName}</h1>
              <p className="mt-2 max-w-xl text-[13px] leading-5 text-zinc-300">{currentHostel.address}</p>
              <div className="mt-4 inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                {paymentHealthScore}/100 health score • {attentionCount} collections need attention
              </div>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-4">
                <DesktopMetric icon={CreditCard} label="Collected" value={`Rs ${totalCollected.toLocaleString("en-IN")}`} />
                <DesktopMetric icon={TrendingUp} label="Collection Rate" value={`${collectionRate}%`} />
                <DesktopMetric icon={Users} label={isResidence ? "Occupied Units" : "Occupied"} value={String(occupiedBeds)} />
                <DesktopMetric icon={DoorOpen} label="At Risk" value={String(attentionCount)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <ActionTile href="/owner/tenants?action=add-tenant" icon={Users} label="Add Tenant" note="New check-in" variant="desktop" />
              <ActionTile href="/owner/payments" icon={CreditCard} label="Pay Rent" note="Collect rent" variant="desktop" />
              <ActionTile href="/owner/rooms?view=available" icon={DoorOpen} label="Available" note={isResidence ? "Vacant units" : "Open beds"} variant="desktop" />
              <ActionTile href="/owner/notifications" icon={AlertTriangle} label="Alerts" note={`${overdue.length} overdue`} variant="desktop" />
            </div>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-[color:var(--border)] px-4 py-2.5">
              <h2 className="font-display text-[15px] font-semibold text-white">Upcoming dues</h2>
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
                          <span className={ownerStatusClass(status.tone)}>{status.label}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {status.tone !== "green" ? (
                            <Link
                              href={`/owner/payments?action=pay-rent&tenantId=${tenant.tenantId}`}
                              className="inline-flex min-h-8 items-center justify-center gap-1 rounded-xl border border-[rgba(99,102,241,0.4)] bg-[linear-gradient(180deg,#6366f1_0%,#4f46e5_100%)] px-3 text-[11px] font-semibold text-white shadow-[0_10px_22px_rgba(99,102,241,0.24)]"
                            >
                              Collect
                              <ArrowRight className="h-3.5 w-3.5" />
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Performance snapshot</p>
            <div className="mt-2.5 grid gap-2.5">
              {snapshotRows.map((row) => (
                <SnapshotRow key={row.label} label={row.label} value={row.value} />
              ))}
            </div>
          </Card>
        </div>
      </section>

      <TenantRentSearch tenants={tenants} hideButton />
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
          ? "rounded-[8px] border border-white/12 bg-white/10 px-3 py-2.5 text-white shadow-[0_14px_30px_rgba(8,18,37,0.1)] backdrop-blur transition hover:-translate-y-1 hover:bg-white/14"
          : "rounded-[8px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 shadow-[0_10px_24px_rgba(2,6,23,0.16)] transition hover:-translate-y-0.5"
      }
    >
      <div className="flex items-start gap-3">
        <div className={variant === "desktop" ? "rounded-2xl bg-white/12 p-2 text-sky-200 ring-1 ring-white/10" : "rounded-2xl bg-[color:var(--brand-soft)] p-2.5 text-[color:var(--accent-electric)]"}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className={variant === "desktop" ? "text-[15px] font-semibold text-white" : "text-sm font-semibold text-[color:var(--fg-primary)]"}>{label}</p>
          <p className={variant === "desktop" ? "mt-0.5 text-[10px] text-blue-100/78" : "mt-1 text-[11px] text-[color:var(--fg-secondary)]"}>{note}</p>
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
      className={`rounded-[6px] px-3 py-2.5 ${
        tone === "warning"
          ? "border border-[rgba(245,158,11,0.35)] bg-[linear-gradient(180deg,rgba(245,158,11,0.24)_0%,rgba(120,53,15,0.42)_100%)] text-amber-100 shadow-[0_18px_36px_rgba(245,158,11,0.14)]"
          : "border border-[rgba(239,68,68,0.35)] bg-[linear-gradient(180deg,rgba(239,68,68,0.22)_0%,rgba(127,29,29,0.42)_100%)] text-white shadow-[0_18px_36px_rgba(220,38,38,0.18)]"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75">{label}</p>
      <p className="mt-1 text-[1.3rem] font-semibold leading-none">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="nestiq-stat rounded-[14px] px-2 py-2 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function InlineStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="nestiq-stat flex items-center gap-2 rounded-[16px] px-3 py-2.5">
      <div className="rounded-xl bg-white/8 p-2 text-[var(--accent)]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">{label}</p>
        <p className="truncate text-sm font-semibold text-white">{value}</p>
      </div>
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
    <div className="nestiq-stat rounded-[18px] px-3.5 py-3 shadow-[0_16px_34px_rgba(8,18,37,0.12)]">
      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-white/10 p-1.5 text-indigo-200 ring-1 ring-white/8">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">{label}</p>
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
    <div className="space-y-3">
      {/* mobile skeleton — mirrors lg:hidden section */}
      <section className="grid gap-3 lg:hidden">
        <Card className="p-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#422006] shadow-[0_10px_22px_rgba(250,204,21,0.24)]">
            <span className="h-2 w-2 rounded-full bg-[var(--cta)] animate-[status-breathe_1s_ease-in-out_infinite]" />
            Preparing dashboard
          </div>
          <SkeletonBlock className="mt-4 h-4 w-24" />
          <SkeletonBlock className="mt-2 h-7 w-44" />
          <div className="mt-4 grid grid-cols-[1.5fr_1fr] gap-2.5">
            <SkeletonBlock className="h-24 rounded-[8px]" />
            <div className="grid gap-2">
              <SkeletonBlock className="h-11 rounded-[6px]" />
              <SkeletonBlock className="h-11 rounded-[6px]" />
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-12 rounded-[6px]" />
            ))}
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20 rounded-[8px]" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-16 rounded-[8px]" />
          ))}
        </div>
      </section>

      {/* desktop skeleton — mirrors hidden lg:grid section */}
      <section className="hidden gap-3 lg:grid">
        {/* hero banner */}
        <div className="rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#422006] shadow-[0_10px_22px_rgba(250,204,21,0.24)]">
            <span className="h-2 w-2 rounded-full bg-[var(--cta)] animate-[status-breathe_1s_ease-in-out_infinite]" />
            Preparing dashboard
          </div>
          <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="mt-2 h-10 w-72" />
              <SkeletonBlock className="mt-2 h-3.5 w-56" />
              <SkeletonBlock className="mt-3 h-6 w-64 rounded-full" />
              <div className="mt-4 grid grid-cols-4 gap-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-20 rounded-[8px]" />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-20 rounded-[8px]" />
              ))}
            </div>
          </div>
        </div>

        {/* table + snapshot row */}
        <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-[color:var(--border)] px-4 py-2.5">
              <SkeletonBlock className="h-4 w-32" />
            </div>
            <div className="space-y-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4 border-t border-[color:var(--border)] px-4 py-3">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-4 w-12" />
                  <SkeletonBlock className="h-4 w-20" />
                  <SkeletonBlock className="h-4 w-16" />
                  <SkeletonBlock className="ml-auto h-4 w-16" />
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-3.5">
            <SkeletonBlock className="h-3 w-28" />
            <div className="mt-2.5 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-10 rounded-[8px]" />
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
