"use client";

import Link from "next/link";
import { BedDouble, CreditCard, DoorOpen, HousePlus, UserPlus, Users } from "lucide-react";
import { HostelMiniScene } from "@/components/hostel-mini-scene";
import { RemoveTenantSearch } from "@/components/remove-tenant-search";
import { TenantRentSearch } from "@/components/tenant-rent-search";
import { useHostelContext } from "@/components/hostel-context-provider";
import { Card } from "@/components/ui/card";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { getDueStatus } from "@/lib/payment-utils";

export default function OwnerDashboardPage() {
  const { currentHostel, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants();

  if (hostelLoading || tenantLoading) {
    return <LoadingCard label="Loading dashboard..." />;
  }

  if (!currentHostel) {
    return (
      <EmptyWorkspace
        title="No hostel found."
        description="Create your first hostel to start using the dashboard."
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
  const vacantBeds = Math.max(totalBeds - occupiedBeds, 0);
  const monthlyIncome = tenants.reduce((sum, tenant) => sum + tenant.monthlyRent, 0);
  const upcoming = tenants
    .map((tenant) => ({ tenant, status: getDueStatus(tenant.nextDueDate) }))
    .sort((a, b) => a.status.priority - b.status.priority)
    .slice(0, 4);
  const occupiedPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return (
    <div className={`space-y-3.5 transition-opacity sm:space-y-4 ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <Card className="border-slate-200 bg-white px-4 py-4 shadow-[0_12px_34px_rgba(148,163,184,0.12)] sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Dashboard</p>
            <h1 className="mt-1 text-[1.35rem] font-semibold tracking-tight text-slate-800 sm:text-[1.55rem]">
              Welcome back, Surya Krishna
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-[12px] font-medium text-slate-700">{currentHostel.hostelName}</p>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-flex" />
              <p className="text-[12px] text-slate-500">Today&apos;s overview for your selected hostel</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:w-[420px] lg:grid-cols-2">
            <Link
              href="/owner/tenants?action=add-tenant"
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-center text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Tenant
            </Link>

            <div className="flex min-h-9 items-center justify-center">
              <TenantRentSearch tenants={tenants} />
            </div>

            <div className="flex min-h-9 items-center justify-center">
              <RemoveTenantSearch tenants={tenants} />
            </div>

            <Link
              href="/owner/rooms?view=available"
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-center text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <HousePlus className="h-3.5 w-3.5" />
              Available
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard icon={DoorOpen} label="Rooms" value={String(totalRooms)} hint={`${currentHostel.floors.length} floors`} tone="blue" />
        <StatCard icon={Users} label="Tenants" value={String(tenants.length)} hint={`${occupiedBeds} occupied`} tone="green" />
        <StatCard icon={CreditCard} label="Income" value={`₹${monthlyIncome.toLocaleString("en-IN")}`} hint="This hostel" tone="amber" />
        <StatCard icon={BedDouble} label="Vacant" value={String(vacantBeds)} hint="Beds open" tone="rose" />
      </div>

      {tenants.length === 0 ? (
        <EmptyWorkspace
          title={`No tenants in ${currentHostel.hostelName} yet.`}
          description="Add your first tenant to start seeing occupancy, revenue, and payment insights."
          ctaHref="/owner/tenants?action=add-tenant"
          ctaLabel="Add First Tenant"
        />
      ) : (
        <div className="grid gap-3.5 xl:grid-cols-[1.02fr_1.08fr]">
          <Card className="border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Occupancy</p>
                <h2 className="mt-1 text-base font-semibold text-slate-800">Live Bed Status</h2>
              </div>
              <div className="text-right">
                <p className="text-[1.25rem] font-semibold tracking-tight text-slate-800">{occupiedPercent}%</p>
                <p className="text-[11px] text-slate-500">occupied</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
              <div className="hidden rounded-[18px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef5ff_100%)] p-3 lg:block">
                <HostelMiniScene className="h-auto w-full" />
              </div>

              <div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniMetric label="Occupied" value={occupiedBeds} tone="emerald" />
                  <MiniMetric label="Vacant" value={vacantBeds} tone="blue" />
                  <MiniMetric label="Beds" value={totalBeds} tone="slate" />
                </div>

                <div className="mt-4">
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#10b981_0%,#3b82f6_100%)]"
                      style={{ width: `${occupiedPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Due Tracker</p>
                <h2 className="mt-1 text-base font-semibold text-slate-800">Upcoming Events</h2>
              </div>
              <Link href="/owner/payments" className="text-[12px] font-semibold text-violet-600 hover:text-violet-700">
                View All
              </Link>
            </div>

            <div className="mt-3 grid gap-2">
              {upcoming.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  No tenant dues available yet for this hostel.
                </div>
              ) : (
                upcoming.map(({ tenant, status }) => (
                  <div key={tenant.tenantId} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/owner/tenants/${tenant.tenantId}`}
                          className="text-[13px] font-semibold text-slate-800 hover:text-violet-600"
                        >
                          {tenant.fullName}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Room {tenant.assignment?.roomNumber} • ₹{tenant.monthlyRent.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                          status.tone === "red"
                            ? "bg-rose-100 text-rose-600"
                            : status.tone === "orange"
                              ? "bg-orange-100 text-orange-600"
                              : status.tone === "yellow"
                                ? "bg-amber-100 text-amber-600"
                                : "bg-emerald-100 text-emerald-600"
                        }`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return <Card className="border-slate-200 bg-white p-4 text-center text-sm text-slate-600">{label}</Card>;
}

function EmptyWorkspace({
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
    <Card className="border-slate-200 bg-white p-5 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1.5 text-sm text-slate-500">{description}</p>
      <Link
        href={ctaHref}
        className="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        {ctaLabel}
      </Link>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  tone: "blue" | "green" | "amber" | "rose";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-100 text-blue-600"
      : tone === "green"
        ? "bg-emerald-100 text-emerald-600"
        : tone === "amber"
          ? "bg-amber-100 text-amber-600"
          : "bg-rose-100 text-rose-600";
  const hintClass = tone === "rose" ? "text-rose-500" : "text-slate-500";

  return (
    <Card className="border-slate-200 bg-white p-3.5">
      <div className="flex items-center gap-2.5">
        <div className={`rounded-lg p-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-0.5 text-[1.05rem] font-semibold tracking-tight text-slate-800 sm:text-[1.2rem]">{value}</p>
          <p className={`mt-0.5 text-[11px] ${hintClass}`}>{hint}</p>
        </div>
      </div>
    </Card>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "blue" | "slate";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : tone === "blue"
        ? "bg-blue-50 border-blue-200 text-blue-700"
        : "bg-slate-50 border-slate-200 text-slate-700";

  return (
    <div className={`rounded-lg border px-2.5 py-2 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-0.5 text-[13px] font-semibold">{value}</p>
    </div>
  );
}
