"use client";

import Link from "next/link";
import { BedDouble, CreditCard, DoorOpen, Home, UserMinus, UserPlus, Users } from "lucide-react";
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
    <div className={`space-y-4 transition-opacity sm:space-y-5 ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <div className="lg:hidden">
        <MobileHeroCard
          hostelName={currentHostel.hostelName}
          floorCount={currentHostel.floors.length}
          totalRooms={totalRooms}
          occupiedPercent={occupiedPercent}
          address={currentHostel.address}
        />
      </div>
      <div className="hidden lg:block">
        <DesktopHeroCard
          hostelName={currentHostel.hostelName}
          address={currentHostel.address}
          floorCount={currentHostel.floors.length}
          totalRooms={totalRooms}
          occupiedPercent={occupiedPercent}
          totalBeds={totalBeds}
          vacantBeds={vacantBeds}
        />
      </div>

      <QuickActionPanel />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={BedDouble} label="Total Beds" value={String(totalBeds)} hint={`${currentHostel.floors.length} floors in hostel`} tone="gold" />
        <StatCard icon={Users} label="Occupied" value={String(occupiedBeds)} hint={`${occupiedPercent}% occupied`} tone="violet" />
        <StatCard icon={CreditCard} label="Payments" value={`Rs ${monthlyIncome.toLocaleString("en-IN")}`} hint="Monthly rent total" tone="rose" />
        <StatCard icon={DoorOpen} label="Available Rooms" value={String(vacantBeds)} hint={`${totalRooms} total rooms`} tone="orange" />
      </div>

      {tenants.length === 0 ? (
        <EmptyWorkspace
          title={`No tenants in ${currentHostel.hostelName} yet.`}
          description="Add your first tenant to start seeing occupancy, revenue, and payment insights."
          ctaHref="/owner/tenants?action=add-tenant"
          ctaLabel="Add First Tenant"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_1.05fr]">
          <Card className="overflow-hidden border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(246,243,255,0.92)_100%)] p-4 shadow-[0_18px_42px_rgba(193,181,255,0.12)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Live Status</p>
                <h2 className="mt-1 text-base font-semibold text-slate-800">Occupancy Overview</h2>
              </div>
              <div className="rounded-full bg-[rgba(124,92,255,0.1)] px-3 py-1 text-[12px] font-semibold text-violet-700">
                {occupiedPercent}% full
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniMetric label="Occupied" value={occupiedBeds} tone="violet" />
              <MiniMetric label="Vacant" value={vacantBeds} tone="sky" />
              <MiniMetric label="Total Rooms" value={totalRooms} tone="gold" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <SummaryStrip label="Floors" value={currentHostel.floors.length} helper="Active building levels" tone="violet" />
              <SummaryStrip label="Rooms" value={totalRooms} helper="Ready for tenant assignment" tone="sky" />
              <SummaryStrip label="Vacancy" value={vacantBeds} helper="Beds available right now" tone="gold" />
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Occupied beds</span>
                <span>
                  {occupiedBeds}/{totalBeds}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[rgba(124,92,255,0.1)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8b7bff_0%,#ff9bb0_50%,#ffc786_100%)]"
                  style={{ width: `${occupiedPercent}%` }}
                />
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(255,246,250,0.94)_100%)] p-4 shadow-[0_18px_42px_rgba(244,180,211,0.16)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Upcoming Events</p>
                <h2 className="mt-1 text-base font-semibold text-slate-800">Due Tracker</h2>
              </div>
              <Link href="/owner/payments" className="text-[12px] font-semibold text-violet-600 hover:text-violet-700">
                View All
              </Link>
            </div>

            <div className="mt-3 grid gap-2.5">
              {upcoming.length === 0 ? (
                <div className="rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#fff7fb_0%,#f8f4ff_100%)] px-3 py-4 text-sm text-slate-500">
                  No tenant dues available yet for this hostel.
                </div>
              ) : (
                upcoming.map(({ tenant, status }) => (
                  <div
                    key={tenant.tenantId}
                    className="rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,245,250,0.95)_0%,rgba(247,243,255,0.95)_100%)] px-3 py-3 shadow-[0_12px_28px_rgba(193,181,255,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/owner/tenants/${tenant.tenantId}`}
                          className="text-[13px] font-semibold text-slate-800 hover:text-violet-600"
                        >
                          {tenant.fullName}
                        </Link>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Room {tenant.assignment?.roomNumber} - Rs {tenant.monthlyRent.toLocaleString("en-IN")}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">{tenant.phone}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          status.tone === "red"
                            ? "bg-rose-500 text-white"
                            : status.tone === "orange"
                              ? "bg-orange-400 text-white"
                              : status.tone === "yellow"
                                ? "bg-amber-300 text-amber-900"
                                : "bg-emerald-400 text-white"
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

function MobileHeroCard({
  hostelName,
  floorCount,
  totalRooms,
  occupiedPercent,
  address,
}: {
  hostelName: string;
  floorCount: number;
  totalRooms: number;
  occupiedPercent: number;
  address: string;
}) {
  return (
    <Card className="overflow-hidden border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,242,255,0.96)_100%)] p-0 shadow-[0_22px_50px_rgba(193,181,255,0.2)]">
      <div className="relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(90deg,rgba(141,120,255,0.2)_0%,rgba(255,158,204,0.18)_48%,rgba(255,214,143,0.16)_100%)]" />
        <div className="absolute -left-10 top-20 h-32 w-32 rounded-full bg-[rgba(255,196,226,0.22)] blur-3xl" />
        <div className="absolute -right-8 top-8 h-32 w-32 rounded-full bg-[rgba(152,192,255,0.22)] blur-3xl" />

        <div className="relative rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(225,205,255,0.95)_0%,rgba(255,240,248,0.88)_100%)] p-3 shadow-[0_18px_40px_rgba(174,160,255,0.16)]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[13px] font-semibold text-slate-700 shadow-sm">
              <span className="rounded-full bg-[linear-gradient(135deg,#7c5cff_0%,#ff9b8e_100%)] p-1 text-white">
                <Home className="h-3.5 w-3.5" />
              </span>
              Hostels
            </div>
            <div className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
              {floorCount} floors
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(255,247,251,0.92)_100%)] p-3">
            <div className="rounded-[18px] bg-[linear-gradient(180deg,#fff7fb_0%,#f8f4ff_100%)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-[1.35rem] font-semibold tracking-tight text-slate-800 sm:text-[1.55rem]">{hostelName}</h1>
                  <p className="mt-1 text-[12px] text-slate-500">{address}</p>
                </div>
                <div className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-violet-700 shadow-sm">
                  {occupiedPercent}% occupied
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <HeroMetric label="Floors" value={String(floorCount)} tone="violet" />
                <HeroMetric label="Rooms" value={String(totalRooms)} tone="sky" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DesktopHeroCard({
  hostelName,
  address,
  floorCount,
  totalRooms,
  occupiedPercent,
  totalBeds,
  vacantBeds,
}: {
  hostelName: string;
  address: string;
  floorCount: number;
  totalRooms: number;
  occupiedPercent: number;
  totalBeds: number;
  vacantBeds: number;
}) {
  return (
    <Card className="overflow-hidden border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(248,242,255,0.96)_100%)] p-0 shadow-[0_22px_50px_rgba(193,181,255,0.18)]">
      <div className="relative overflow-hidden px-6 py-6">
        <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(90deg,rgba(141,120,255,0.16)_0%,rgba(255,158,204,0.12)_50%,rgba(255,214,143,0.12)_100%)]" />
        <div className="absolute -right-8 top-10 h-44 w-44 rounded-full bg-[rgba(152,192,255,0.18)] blur-3xl" />
        <div className="absolute left-20 top-24 h-40 w-40 rounded-full bg-[rgba(255,196,226,0.16)] blur-3xl" />

        <div className="relative grid items-center gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[12px] font-semibold text-slate-700 shadow-sm">
              <span className="rounded-full bg-[linear-gradient(135deg,#7c5cff_0%,#ff9b8e_100%)] p-1 text-white">
                <Home className="h-3.5 w-3.5" />
              </span>
              Hostel Dashboard
            </div>

            <div>
              <h1 className="text-[2rem] font-semibold tracking-tight text-slate-800 xl:text-[2.35rem]">{hostelName}</h1>
              <p className="mt-2 max-w-xl text-[14px] text-slate-500">{address}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <DesktopPill label="Floors" value={String(floorCount)} tone="violet" />
              <DesktopPill label="Rooms" value={String(totalRooms)} tone="sky" />
              <DesktopPill label="Occupancy" value={`${occupiedPercent}%`} tone="gold" />
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(255,247,251,0.92)_100%)] p-4 shadow-[0_18px_34px_rgba(193,181,255,0.12)]">
            <div className="rounded-[22px] bg-[linear-gradient(180deg,#fff7fb_0%,#f8f4ff_100%)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Hostel Snapshot</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SummaryStrip label="Total Beds" value={totalBeds} helper="Across all rooms" tone="violet" />
                <SummaryStrip label="Vacant Beds" value={vacantBeds} helper="Ready for check-in" tone="gold" />
                <SummaryStrip label="Floor Setup" value={floorCount} helper="Levels configured" tone="sky" />
                <SummaryStrip label="Room Setup" value={totalRooms} helper="Rooms available in system" tone="violet" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function QuickActionPanel() {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/72 p-3.5 shadow-[0_16px_38px_rgba(193,181,255,0.12)] backdrop-blur">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Quick Actions</p>
          <h2 className="mt-1 text-[1.05rem] font-semibold text-slate-800">Manage this hostel</h2>
        </div>
        <p className="text-[11px] text-slate-500">4 shortcuts</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <ActionCard href="/owner/tenants?action=add-tenant" icon={UserPlus} label="Add Tenant" note="Register new tenant" tone="peach" />
        <ActionCard href="/owner/tenants?action=remove-tenant" icon={UserMinus} label="Remove Tenant" note="Vacate a room" tone="rose" />
        <ActionCard href="/owner/payments" icon={CreditCard} label="Payments" note="Track rent status" tone="violet" />
        <ActionCard href="/owner/rooms?view=available" icon={DoorOpen} label="Available Rooms" note="See empty beds" tone="sky" />
      </div>
    </div>
  );
}

function DesktopPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "violet" | "sky" | "gold";
}) {
  const toneClass =
    tone === "violet"
      ? "bg-[linear-gradient(180deg,#f5efff_0%,#ede6ff_100%)] text-violet-700"
      : tone === "sky"
        ? "bg-[linear-gradient(180deg,#edf7ff_0%,#e2f0ff_100%)] text-sky-700"
        : "bg-[linear-gradient(180deg,#fff6e8_0%,#ffedd1_100%)] text-amber-700";

  return (
    <div className={`rounded-[22px] border border-white/70 px-4 py-3 shadow-sm ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="mt-1 text-[1.35rem] font-semibold leading-none">{value}</p>
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
    <Card className="border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,242,255,0.92)_100%)] p-5 text-center shadow-[0_16px_38px_rgba(193,181,255,0.12)]">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1.5 text-sm text-slate-500">{description}</p>
      <Link
        href={ctaHref}
        className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-[linear-gradient(90deg,#8b7bff_0%,#ff9bb0_100%)] px-4 text-[12px] font-semibold text-white shadow-[0_14px_28px_rgba(193,181,255,0.22)] transition hover:opacity-95"
      >
        {ctaLabel}
      </Link>
    </Card>
  );
}

function ActionCard({
  href,
  icon: Icon,
  label,
  note,
  tone,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  note: string;
  tone: "peach" | "rose" | "violet" | "sky";
}) {
  const toneClass =
    tone === "peach"
      ? "bg-[linear-gradient(180deg,#fff1e4_0%,#ffe7d4_100%)] text-orange-700"
      : tone === "rose"
        ? "bg-[linear-gradient(180deg,#ffeaf3_0%,#ffdce9_100%)] text-rose-700"
        : tone === "violet"
          ? "bg-[linear-gradient(180deg,#f1ebff_0%,#e5ddff_100%)] text-violet-700"
          : "bg-[linear-gradient(180deg,#ebf5ff_0%,#dbeeff_100%)] text-sky-700";

  return (
    <Link
      href={href}
      className={`rounded-[20px] border border-white/70 p-3 shadow-[0_12px_26px_rgba(193,181,255,0.08)] transition hover:-translate-y-0.5 ${toneClass}`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white/80 p-2.5 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{label}</p>
          <p className="mt-1 text-[11px] opacity-80">{note}</p>
        </div>
      </div>
    </Link>
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
  tone: "gold" | "violet" | "rose" | "orange";
}) {
  const toneClass =
    tone === "gold"
      ? "bg-[linear-gradient(180deg,#fff2de_0%,#ffe5c1_100%)] text-amber-700"
      : tone === "violet"
        ? "bg-[linear-gradient(180deg,#f1ebff_0%,#e5ddff_100%)] text-violet-700"
        : tone === "rose"
          ? "bg-[linear-gradient(180deg,#ffe8f0_0%,#ffdbe7_100%)] text-rose-700"
          : "bg-[linear-gradient(180deg,#fff1e5_0%,#ffe2c4_100%)] text-orange-700";

  return (
    <Card className={`overflow-hidden border-white/70 p-3.5 shadow-[0_16px_34px_rgba(193,181,255,0.12)] ${toneClass}`}>
      <div className="flex items-start gap-2.5">
        <div className="rounded-2xl bg-white/75 p-2 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold">{label}</p>
          <p className="mt-1 text-[1.45rem] font-semibold leading-none tracking-tight">{value}</p>
          <p className="mt-2 text-[11px] opacity-80">{hint}</p>
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
  tone: "violet" | "sky" | "gold";
}) {
  const toneClass =
    tone === "violet"
      ? "border-violet-100 bg-[linear-gradient(180deg,#f5efff_0%,#ede6ff_100%)] text-violet-700"
      : tone === "sky"
        ? "border-sky-100 bg-[linear-gradient(180deg,#edf7ff_0%,#e2f0ff_100%)] text-sky-700"
        : "border-amber-100 bg-[linear-gradient(180deg,#fff6e8_0%,#ffedd1_100%)] text-amber-700";

  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-1 text-[1.05rem] font-semibold">{value}</p>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "violet" | "sky";
}) {
  return (
    <div
      className={`rounded-2xl border border-white/80 px-3 py-3 shadow-sm ${
        tone === "violet"
          ? "bg-[linear-gradient(180deg,#f5efff_0%,#ede6ff_100%)] text-violet-700"
          : "bg-[linear-gradient(180deg,#edf7ff_0%,#e2f0ff_100%)] text-sky-700"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-1 text-[1.05rem] font-semibold leading-none">{value}</p>
    </div>
  );
}

function SummaryStrip({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone: "violet" | "sky" | "gold";
}) {
  const toneClass =
    tone === "violet"
      ? "border-violet-100 bg-[linear-gradient(180deg,#f5efff_0%,#ede6ff_100%)] text-violet-700"
      : tone === "sky"
        ? "border-sky-100 bg-[linear-gradient(180deg,#edf7ff_0%,#e2f0ff_100%)] text-sky-700"
        : "border-amber-100 bg-[linear-gradient(180deg,#fff6e8_0%,#ffedd1_100%)] text-amber-700";

  return (
    <div className={`rounded-[20px] border px-3.5 py-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-1 text-[1.25rem] font-semibold leading-none">{value}</p>
      <p className="mt-1.5 text-[11px] opacity-80">{helper}</p>
    </div>
  );
}
