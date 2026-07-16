"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BedDouble, Building2, DoorOpen, Users } from "lucide-react";
import { useHostelContext } from "@/store/hostel-context";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/ui/data/status-badge";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { ownerFilterLinkClass } from "@/components/ui/owner-theme";
import { getDueStatus } from "@/utils/payment";
import { buildHostelInventory, getHostelOccupancySummary } from "@/utils/hostel-occupancy";

export default function OwnerRoomsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <OwnerRoomsPageContent />
    </Suspense>
  );
}

function OwnerRoomsPageContent() {
  const { currentHostel, currentHostelId, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants(currentHostelId);
  const searchParams = useSearchParams();
  const showAvailableOnly = searchParams.get("view") === "available";

  if (hostelLoading || tenantLoading) return <LoadingState />;

  if (!currentHostel) {
    return (
      <Card className="p-6 text-center">
        <EmptyState title="No hostel yet" description="Create a hostel first to manage rooms." />
      </Card>
    );
  }

  const isResidence = currentHostel.type === "RESIDENCE";
  const tenants = allTenants.filter((tenant) => tenant.assignment?.hostelId === currentHostel.id);
  const inventory = buildHostelInventory(currentHostel, tenants);
  const occupancy = getHostelOccupancySummary(currentHostel, tenants);
  const totalRooms = occupancy.totalRooms;
  const totalBeds = occupancy.totalBeds;
  const occupiedBeds = isResidence ? occupancy.occupiedUnits : occupancy.occupiedBeds;
  const availableBeds = isResidence ? occupancy.vacantUnits : occupancy.vacantBeds;

  const displayRooms = inventory.rooms
    .map((room) => {
      const roomTenants = tenants.filter((tenant) => {
        const a = tenant.assignment;
        if (!a || a.hostelId !== currentHostel.id) return false;
        if (a.unitId && room.unitId) return a.unitId === room.unitId;
        return a.roomNumber === room.roomNumber;
      });
      const occupied = room.occupied;
      const available = Math.max(room.capacity - occupied, 0);
      const status = occupied === 0 ? "Available" : available === 0 ? "Full" : "Partly Occupied";
      return { room, occupied, available, roomTenants, status };
    })
    .filter((item) => !showAvailableOnly || item.available > 0);

  const availableRoomsCount = inventory.rooms.filter((room) => room.occupied < room.capacity).length;
  const vacantValue = showAvailableOnly || isResidence ? availableRoomsCount : availableBeds;

  return (
    <div className={`flex flex-col gap-4 transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      {/* ── Header ── */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Rooms</p>
          <h1 className="font-display mt-0.5 text-[clamp(1.35rem,4.5vw,1.75rem)] font-bold text-[color:var(--fg-primary)]">
            {showAvailableOnly ? "Available rooms" : "Room occupancy"}
          </h1>
          <p className="truncate text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">{currentHostel.hostelName}</p>
        </div>
        <div className="flex gap-2">
          <FilterLink href="/owner/rooms" active={!showAvailableOnly}>All</FilterLink>
          <FilterLink href="/owner/rooms?view=available" active={showAvailableOnly}>Vacant</FilterLink>
        </div>
      </header>

      {/* ── Summary ── */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard icon={<Building2 size={14} />} label={isResidence ? "Units" : "Rooms"} value={totalRooms} />
        <StatCard icon={<Users size={14} />} label="Occupied" value={occupiedBeds} tone="success" />
        <StatCard icon={<BedDouble size={14} />} label={isResidence ? "Total units" : "Beds"} value={isResidence ? totalRooms : totalBeds} />
        <StatCard icon={<DoorOpen size={14} />} label={isResidence ? "Vacant units" : "Open beds"} value={vacantValue} tone={vacantValue ? "warning" : "plain"} />
      </section>

      {/* ── Room grid ── */}
      {displayRooms.length === 0 ? (
        <Card><EmptyState icon={<DoorOpen size={28} />} title="No rooms to show" description={showAvailableOnly ? "Every room is currently full." : "Set up rooms in hostel settings."} /></Card>
      ) : (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {displayRooms.map(({ room, occupied, available, roomTenants, status }) => (
            <div key={room.id} className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-3 shadow-[var(--shadow-1)]">
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <h3 className="text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-primary)]">
                    {isResidence ? "Unit" : "Room"} {room.roomNumber}
                  </h3>
                  {!isResidence ? <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">{room.sharingType}</p> : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={roomStatusTone(status)}>{status}</StatusBadge>
                  <span className="text-[10px] tabular-nums text-[color:var(--fg-tertiary)]">
                    {occupied}/{isResidence ? 1 : room.capacity} · {available} free
                  </span>
                </div>
              </div>

              {isResidence ? (
                <OccupantBox tenant={roomTenants[0]} />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {(room.beds ?? []).map((bed, index) => {
                    const assignedTenant = roomTenants.find((t) => t.assignment?.bedId === bed.id);
                    const isOverdue = assignedTenant ? getDueStatus(assignedTenant.nextDueDate).tone === "red" : false;
                    return (
                      <div
                        key={`${room.id}-bed-${index + 1}`}
                        className={`rounded-[var(--radius-md)] border px-2.5 py-2 ${
                          assignedTenant
                            ? "border-[color:color-mix(in_srgb,var(--brand)_45%,transparent)] bg-[color:var(--brand-soft)]"
                            : "border-[color:color-mix(in_srgb,var(--success)_45%,transparent)] bg-[color:var(--success-soft)]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--fg-secondary)]">{bed.label}</p>
                          {isOverdue ? <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--warning)]" /> : null}
                        </div>
                        <p className={`mt-1 truncate text-[11px] font-semibold ${assignedTenant ? "text-[color:var(--accent-electric)]" : "text-[color:var(--success)]"}`}>
                          {assignedTenant ? assignedTenant.fullName : "Available"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {available > 0 ? (
                <Link
                  href={`/owner/tenants?action=add-tenant&hostelId=${currentHostel.id}&room=${room.roomNumber}&sharingType=${encodeURIComponent(room.sharingType ?? "")}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(90deg,var(--cta),var(--cta-strong))] px-3 text-[12px] font-semibold text-white shadow-[var(--shadow-brand)]"
                >
                  {isResidence ? "Assign tenant" : "Add tenant"}
                </Link>
              ) : null}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function OccupantBox({ tenant }: { tenant?: { fullName: string; nextDueDate: string } }) {
  if (!tenant) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--warning)_45%,transparent)] bg-[color:var(--warning-soft)] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">Status</p>
        <p className="mt-0.5 text-[11px] font-semibold text-[color:var(--warning)]">Vacant</p>
      </div>
    );
  }
  const tone = getDueStatus(tenant.nextDueDate).tone;
  const accent = tone === "red" ? "text-[color:var(--error)]" : tone === "orange" || tone === "yellow" ? "text-[color:var(--warning)]" : "text-[color:var(--success)]";
  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">Occupant</p>
      <p className={`mt-0.5 truncate text-[11px] font-semibold ${accent}`}>{tenant.fullName}</p>
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] px-3.5 text-[12px] font-semibold transition ${ownerFilterLinkClass(active)}`}
    >
      {children}
    </Link>
  );
}

function roomStatusTone(status: string): StatusTone {
  if (status === "Full") return "overdue";
  if (status === "Partly Occupied") return "paid";
  return "due";
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-16 animate-pulse rounded-[var(--radius-lg)] bg-[color:var(--surface-soft)]" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-[var(--radius-lg)] bg-[color:var(--surface-soft)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-[color:var(--surface-soft)]" />
        ))}
      </div>
    </div>
  );
}
