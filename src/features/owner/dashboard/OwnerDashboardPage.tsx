"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowRight, BedDouble, CalendarClock, CreditCard,
  DoorOpen, ReceiptText, Sofa, TrendingUp, Users,
} from "lucide-react";
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

  if (hostelLoading || !currentHostel || tenantLoading) {
    return <LoadingState />;
  }

  const tenants = allTenants.filter((t) => t.assignment?.hostelId === currentHostel.id);
  const isResidence = currentHostel.type === "RESIDENCE";
  const occupancy = getHostelOccupancySummary(currentHostel, tenants);
  const totalRooms = occupancy.totalRooms;
  const totalBeds = occupancy.totalBeds;
  const occupiedBeds = isResidence ? occupancy.occupiedUnits : occupancy.occupiedBeds;
  const availableBeds = isResidence ? occupancy.vacantUnits : occupancy.vacantBeds;
  const totalCollected = tenants.reduce((sum, t) => sum + t.rentPaid, 0);
  const dueSoon = tenants.filter((t) => {
    const tone = getDueStatus(t.nextDueDate).tone;
    return tone === "orange" || tone === "yellow";
  });
  const overdue = tenants.filter((t) => getDueStatus(t.nextDueDate).tone === "red");
  const paid = tenants.filter((t) => getDueStatus(t.nextDueDate).tone === "green");
  const dueAmount = dueSoon.reduce((sum, t) => sum + t.monthlyRent, 0);
  const overdueAmount = overdue.reduce((sum, t) => sum + t.monthlyRent, 0);
  const recentDueItems = tenants
    .map((t) => ({ tenant: t, status: getDueStatus(t.nextDueDate) }))
    .sort((a, b) => a.status.priority - b.status.priority)
    .slice(0, 4);
  const capacityBase = isResidence ? totalRooms : totalBeds;
  const occupancyPercent = capacityBase > 0 ? Math.round((tenants.length / capacityBase) * 100) : 0;
  const expectedRevenue = tenants.reduce((sum, t) => sum + t.monthlyRent, 0);
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

      {/* ── MOBILE LAYOUT ── */}
      <section className="grid gap-3 lg:hidden">

        {/* 1. Platform Trust Card */}
        <div className="relative overflow-hidden rounded-[18px] border border-[rgba(99,102,241,0.35)] bg-[linear-gradient(135deg,rgba(99,102,241,0.12)_0%,rgba(99,102,241,0.04)_100%)] px-3 py-3 shadow-[0_0_0_1px_rgba(99,102,241,0.1),0_8px_32px_rgba(99,102,241,0.14)]">
          {/* live dot */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#22c55e]">Live</span>
          </div>

          <div className="flex items-center gap-3">
            {/* building illustration */}
            <div className="shrink-0">
              <BuildingIllustration />
            </div>

            {/* stats */}
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-3 gap-2">
                <TrustStat value="18" label="Owners" />
                <TrustStat value="42" label="Hostels" />
                <TrustStat value="1,240" label="Tenants" />
              </div>
              <p className="mt-2 text-[10px] italic text-white/30">Trusted by owners across India</p>
            </div>
          </div>
        </div>

        {/* 2. Action Tiles */}
        <div className="grid grid-cols-2 gap-2.5">
          <ActionTile href="/owner/payments" icon={CreditCard} label="Pay Rent" note="Record collection" variant="mobile" />
          <ActionTile href="/owner/payments" icon={ReceiptText} label="Due List" note={`${dueSoon.length} due soon`} variant="mobile" tone="neutral" />
          <ActionTile href="/owner/notifications" icon={AlertTriangle} label="Overdue" note={`${overdue.length} need action`} variant="mobile" tone="danger" />
          <ActionTile href="/owner/payments" icon={Users} label="History" note="Latest payments" variant="mobile" />
        </div>

        {/* 3. Live Snapshot */}
        <Card className="nestiq-grid-bg overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_34%),linear-gradient(160deg,#111114_0%,#09090b_62%,#131324_100%)] p-0 shadow-[0_18px_46px_rgba(0,0,0,0.34)]">

          {/* header */}
          <div className="flex items-start justify-between gap-3 px-3 pt-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6366f1] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#6366f1]" />
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Live Snapshot</p>
              </div>
              <h1 className="font-display mt-1 text-xl font-bold text-white">{currentHostel.hostelName}</h1>
              <p className="mt-0.5 truncate text-xs text-[color:var(--fg-secondary)]">{currentHostel.address}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="rounded-full border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.14)] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)]">
                {occupancyPercent}% full
              </span>
            </div>
          </div>

          {/* collected | due | overdue — flat 3-col */}
          <div className="mt-3 grid grid-cols-3 divide-x divide-white/8 border-y border-white/8">
            <div className="px-3 py-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Collected</p>
              <p className="mt-1 text-base font-semibold leading-none text-[#22c55e]">
                ₹{totalCollected.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-[9px] text-[color:var(--fg-secondary)]">{collectionRate}% of expected</p>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-400/70">Due</p>
              <p className="mt-1 text-base font-semibold leading-none text-amber-400">
                ₹{dueAmount.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-[9px] text-[color:var(--fg-secondary)]">{dueSoon.length} tenants</p>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-red-400/70">Overdue</p>
              <p className="mt-1 text-base font-semibold leading-none text-red-400">
                ₹{overdueAmount.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-[9px] text-[color:var(--fg-secondary)]">{overdue.length} tenants</p>
            </div>
          </div>

          {/* beds | free | rooms */}
          <div className="grid grid-cols-3 gap-2 px-3 pt-2.5">
            <CompactMetric icon={BedDouble} label={isResidence ? "Units" : "Beds"} value={String(isResidence ? totalRooms : totalBeds)} />
            <CompactMetric icon={Sofa} label="Free" value={String(availableBeds)} />
            <CompactMetric icon={DoorOpen} label="Rooms" value={String(isResidence ? currentHostel.floors.length : totalRooms)} />
          </div>

          {/* payment health | attention */}
          <div className="grid grid-cols-2 gap-2 px-3 pb-3 pt-2">
            <CompactInlineStat icon={TrendingUp} label="Payment health" value={`${paymentHealthScore}/100`} color="indigo" />
            <CompactInlineStat icon={CalendarClock} label="Attention" value={String(attentionCount)} color="amber" />
          </div>
        </Card>

        {/* 4. Recent Activity */}
        <Card className="p-3 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Recent Activity</p>
              <h2 className="font-display text-sm font-semibold text-white">Next actions</h2>
            </div>
            <Link href="/owner/payments?filter=due" className="text-[11px] font-semibold text-[var(--accent)]">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentDueItems.length === 0 ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-4 text-center text-sm text-[color:var(--fg-secondary)]">
                No dues yet for this hostel.
              </div>
            ) : (
              recentDueItems.map(({ tenant, status }) => (
                <div key={tenant.tenantId} className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5">
                  {/* initials avatar */}
                  <div className="h-9 w-9 shrink-0 rounded-full bg-[linear-gradient(135deg,#6366f1,#4f46e5)] flex items-center justify-center text-xs font-bold text-white uppercase">
                    {tenant.fullName.slice(0, 1)}
                  </div>
                  <Link href={`/owner/tenants/${tenant.tenantId}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{tenant.fullName}</p>
                    <p className="truncate text-[11px] text-[color:var(--fg-secondary)]">
                      Room {tenant.assignment?.roomNumber ?? "-"} · {formatPaymentDate(tenant.nextDueDate)}
                    </p>
                  </Link>
                  {status.tone !== "green" ? (
                    <Link
                      href={`/owner/payments?action=pay-rent&tenantId=${tenant.tenantId}`}
                      className="inline-flex h-8 shrink-0 items-center justify-center rounded-xl border border-[rgba(99,102,241,0.4)] bg-[linear-gradient(180deg,#6366f1_0%,#4f46e5_100%)] px-3 text-[11px] font-semibold text-white shadow-[0_10px_22px_rgba(99,102,241,0.24)]"
                    >
                      Collect
                    </Link>
                  ) : (
                    <span className="inline-flex h-8 shrink-0 items-center justify-center rounded-xl border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.1)] px-3 text-[11px] font-semibold text-[#22c55e]">
                      ✓ Paid
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      {/* ── DESKTOP LAYOUT (unchanged) ── */}
      <section className="hidden gap-3 lg:grid">
        <div className="nestiq-grid-bg relative overflow-hidden rounded-[22px] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.24),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.16),transparent_26%),linear-gradient(180deg,#111114_0%,#18181c_100%)] p-3 sm:p-4 text-white shadow-[0_28px_70px_rgba(0,0,0,0.38)]">
          <div className="pointer-events-none absolute -right-12 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.24)_0%,rgba(255,255,255,0)_70%)] blur-2xl animate-[dashboard-glow_8s_ease-in-out_infinite]" />
          <div className="pointer-events-none absolute bottom-[-6rem] left-[-3rem] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.18)_0%,rgba(245,158,11,0)_70%)] blur-3xl" />
          <div className="relative grid items-start gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-100/70">Owner dashboard</p>
              <h1 className="font-display mt-1.5 max-w-2xl text-[clamp(1.5rem,8vw,2rem)] font-bold leading-tight text-white xl:text-[2.25rem]">{currentHostel.hostelName}</h1>
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
            <div className="overflow-x-auto touch-action-pan-x">
              <table className="min-w-[520px] text-left text-[13px]">
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
                      <td colSpan={5} className="px-4 py-5 text-center text-[color:var(--fg-secondary)]">No upcoming dues.</td>
                    </tr>
                  ) : (
                    recentDueItems.map(({ tenant, status }) => (
                      <tr key={tenant.tenantId} className="border-t border-[color:var(--border)]">
                        <td className="px-4 py-2.5 font-medium text-white">{tenant.fullName}</td>
                        <td className="px-4 py-2.5 text-[color:var(--fg-secondary)]">{tenant.assignment?.roomNumber ?? "-"}</td>
                        <td className="px-4 py-2.5 text-[color:var(--fg-secondary)]">{formatPaymentDate(tenant.nextDueDate)}</td>
                        <td className="px-4 py-2.5"><span className={ownerStatusClass(status.tone)}>{status.label}</span></td>
                        <td className="px-4 py-2.5 text-right">
                          {status.tone !== "green" ? (
                            <Link
                              href={`/owner/payments?action=pay-rent&tenantId=${tenant.tenantId}`}
                              className="inline-flex min-h-8 items-center justify-center gap-1 rounded-xl border border-[rgba(99,102,241,0.4)] bg-[linear-gradient(180deg,#6366f1_0%,#4f46e5_100%)] px-3 text-[11px] font-semibold text-white shadow-[0_10px_22px_rgba(99,102,241,0.24)]"
                            >
                              Collect <ArrowRight className="h-3.5 w-3.5" />
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

// ── Trust card sub-components ──────────────────────────────────────────

function BuildingIllustration() {
  return (
    <svg viewBox="0 0 72 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-16 w-[72px]">
      {/* back-left building */}
      <rect x="2" y="22" width="20" height="42" fill="#111114" rx="2" />
      <rect x="5" y="26" width="5" height="4" rx="1" fill="#6366f1" fillOpacity="0.5" />
      <rect x="13" y="26" width="5" height="4" rx="1" fill="#6366f1" fillOpacity="0.25" />
      <rect x="5" y="34" width="5" height="4" rx="1" fill="#6366f1" fillOpacity="0.35" />
      <rect x="13" y="34" width="5" height="4" rx="1" fill="#6366f1" fillOpacity="0.6" />
      <rect x="5" y="42" width="5" height="4" rx="1" fill="#6366f1" fillOpacity="0.2" />
      <rect x="13" y="42" width="5" height="4" rx="1" fill="#6366f1" fillOpacity="0.45" />

      {/* back-right building */}
      <rect x="50" y="18" width="20" height="46" fill="#0d0d10" rx="2" />
      <rect x="53" y="22" width="5" height="4" rx="1" fill="#818cf8" fillOpacity="0.4" />
      <rect x="61" y="22" width="5" height="4" rx="1" fill="#818cf8" fillOpacity="0.2" />
      <rect x="53" y="30" width="5" height="4" rx="1" fill="#818cf8" fillOpacity="0.55" />
      <rect x="61" y="30" width="5" height="4" rx="1" fill="#818cf8" fillOpacity="0.3" />
      <rect x="53" y="38" width="5" height="4" rx="1" fill="#818cf8" fillOpacity="0.15" />
      <rect x="61" y="38" width="5" height="4" rx="1" fill="#818cf8" fillOpacity="0.5" />

      {/* front building */}
      <rect x="18" y="10" width="36" height="54" fill="#18181c" rx="2" />
      {/* windows row 1 */}
      <rect x="22" y="15" width="6" height="5" rx="1" fill="#6366f1" fillOpacity="0.7" />
      <rect x="32" y="15" width="6" height="5" rx="1" fill="#6366f1" fillOpacity="0.4" />
      <rect x="42" y="15" width="6" height="5" rx="1" fill="#6366f1" fillOpacity="0.65" />
      {/* windows row 2 */}
      <rect x="22" y="25" width="6" height="5" rx="1" fill="#6366f1" fillOpacity="0.3" />
      <rect x="32" y="25" width="6" height="5" rx="1" fill="#6366f1" fillOpacity="0.75" />
      <rect x="42" y="25" width="6" height="5" rx="1" fill="#6366f1" fillOpacity="0.5" />
      {/* windows row 3 */}
      <rect x="22" y="35" width="6" height="5" rx="1" fill="#6366f1" fillOpacity="0.55" />
      <rect x="32" y="35" width="6" height="5" rx="1" fill="#6366f1" fillOpacity="0.2" />
      <rect x="42" y="35" width="6" height="5" rx="1" fill="#6366f1" fillOpacity="0.6" />
      {/* door */}
      <rect x="31" y="50" width="10" height="14" rx="1" fill="#6366f1" fillOpacity="0.2" />
      {/* rooftop water tank */}
      <rect x="28" y="6" width="8" height="5" rx="1" fill="#18181c" stroke="#6366f1" strokeOpacity="0.3" strokeWidth="0.5" />
      <rect x="33" y="2" width="1.5" height="5" fill="#6366f1" fillOpacity="0.4" />

      {/* ground glow */}
      <ellipse cx="36" cy="64" rx="30" ry="3" fill="#6366f1" fillOpacity="0.18" />
    </svg>
  );
}

function TrustStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[10px] border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.1)] px-2 py-1.5 text-center">
      <p className="text-sm font-bold leading-none text-white">{value}</p>
      <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/45">{label}</p>
    </div>
  );
}

// ── Compact snapshot sub-components ───────────────────────────────────

function CompactMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="nestiq-stat flex items-center gap-1.5 rounded-[10px] px-2 py-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--accent)] opacity-70" />
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/50">{label}</p>
        <p className="text-xs font-semibold leading-none text-white">{value}</p>
      </div>
    </div>
  );
}

function CompactInlineStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: "indigo" | "amber";
}) {
  const iconColor = color === "indigo" ? "text-[var(--accent)]" : "text-amber-400";
  const valColor = color === "indigo" ? "text-white" : "text-amber-300";
  return (
    <div className="nestiq-stat flex items-center gap-2 rounded-[10px] px-2.5 py-2">
      <div className={`rounded-lg bg-white/8 p-1.5 ${iconColor}`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/50">{label}</p>
        <p className={`text-xs font-semibold leading-none ${valColor}`}>{value}</p>
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────

function ActionTile({
  href,
  icon: Icon,
  label,
  note,
  variant,
  tone = "neutral",
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  note: string;
  variant: "mobile" | "desktop";
  tone?: "neutral" | "danger";
}) {
  if (variant === "desktop") {
    return (
      <Link
        href={href}
        className="rounded-[8px] border border-white/12 bg-white/10 px-3 py-2.5 text-white shadow-[0_14px_30px_rgba(8,18,37,0.1)] backdrop-blur transition hover:-translate-y-1 hover:bg-white/14"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white/12 p-2 text-sky-200 ring-1 ring-white/10">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-white">{label}</p>
            <p className="mt-0.5 text-[10px] text-blue-100/78">{note}</p>
          </div>
        </div>
      </Link>
    );
  }

  const iconBg = tone === "danger"
    ? "bg-[rgba(239,68,68,0.15)] text-red-400"
    : "bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]";

  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 shadow-[0_10px_24px_rgba(2,6,23,0.16)] transition hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-[10px] p-2.5 ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[color:var(--fg-primary)]">{label}</p>
          <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">{note}</p>
        </div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/25" />
    </Link>
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
      <p className="mt-2 text-xl font-semibold leading-none text-white sm:text-2xl">{value}</p>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5">
      <span className="min-w-0 truncate text-sm text-[color:var(--fg-secondary)]">{label}</span>
      <span className="shrink-0 text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
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
              <SkeletonBlock key={i} className="h-10 rounded-[6px]" />
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

      <section className="hidden gap-3 lg:grid">
        <div className="rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3 sm:p-4">
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
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
