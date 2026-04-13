"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BedDouble, Building2, ChevronDown, DoorOpen, Layers3, Users } from "lucide-react";
import { useHostelContext } from "@/components/hostel-context-provider";
import { Card } from "@/components/ui/card";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { getDueStatus } from "@/lib/payment-utils";

export default function OwnerRoomsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <OwnerRoomsPageContent />
    </Suspense>
  );
}

function OwnerRoomsPageContent() {
  const { currentHostel, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants();
  const searchParams = useSearchParams();
  const showAvailableOnly = searchParams.get("view") === "available";

  if (hostelLoading || tenantLoading) {
    return <LoadingState />;
  }

  if (!currentHostel) {
    return <Card className="rounded-[24px] p-4 text-center text-sm text-slate-600">Create a hostel first to manage rooms.</Card>;
  }

  const tenants = allTenants.filter((tenant) => tenant.assignment?.hostelId === currentHostel.id);
  const totalRooms = currentHostel.floors.reduce((sum, floor) => sum + floor.rooms.length, 0);
  const totalBeds = currentHostel.floors.reduce(
    (sum, floor) => sum + floor.rooms.reduce((roomSum, room) => roomSum + room.bedCount, 0),
    0,
  );
  const occupiedBeds = tenants.length;
  const availableBeds = Math.max(totalBeds - occupiedBeds, 0);
  const availableRoomsCount = currentHostel.floors.reduce(
    (sum, floor, floorIndex) =>
      sum +
      floor.rooms.filter((room) => {
        const occupied = tenants.filter(
          (tenant) =>
            tenant.assignment?.floorNumber === floorIndex + 1 &&
            tenant.assignment.roomNumber === room.roomNumber,
        ).length;
        return room.bedCount - occupied > 0;
      }).length,
    0,
  );

  return (
    <div className={`space-y-3 transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <section className="space-y-3 lg:hidden">
        <Card className="rounded-[24px] border-slate-100 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Rooms</p>
              <h1 className="mt-1 text-xl font-semibold text-slate-900">{showAvailableOnly ? "Available Rooms" : "Room Occupancy"}</h1>
              <p className="mt-1 text-xs text-slate-500">{currentHostel.hostelName}</p>
            </div>
            <div className="flex gap-2">
              <FilterLink href="/owner/rooms" active={!showAvailableOnly}>
                All
              </FilterLink>
              <FilterLink href="/owner/rooms?view=available" active={showAvailableOnly}>
                Free
              </FilterLink>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <MetricTile icon={Building2} label="Rooms" value={String(totalRooms)} />
            <MetricTile icon={Users} label="Occupied" value={String(occupiedBeds)} tone="success" />
            <MetricTile icon={BedDouble} label="Beds" value={String(totalBeds)} />
            <MetricTile
              icon={DoorOpen}
              label={showAvailableOnly ? "Open rooms" : "Open beds"}
              value={showAvailableOnly ? String(availableRoomsCount) : String(availableBeds)}
              tone="warning"
            />
          </div>
        </Card>

        <div className="space-y-2.5">
          {currentHostel.floors.map((floor, floorIndex) => {
            const floorRooms = floor.rooms
              .map((room) => {
                const roomTenants = tenants.filter(
                  (tenant) =>
                    tenant.assignment?.floorNumber === floorIndex + 1 &&
                    tenant.assignment.roomNumber === room.roomNumber,
                );
                const occupied = roomTenants.length;
                const available = Math.max(room.bedCount - occupied, 0);
                const status = occupied === 0 ? "Available" : available === 0 ? "Full" : "Partly Occupied";
                return { room, occupied, available, roomTenants, status };
              })
              .filter((item) => !showAvailableOnly || item.available > 0);

            if (floorRooms.length === 0) return null;

            return (
              <Card key={floor.id} className="overflow-hidden rounded-[22px] border-slate-100 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                <details open={floorIndex === 0}>
                  <summary className="list-none px-3 py-3 marker:hidden">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-xl bg-[var(--pill-gradient)] p-2 text-[var(--accent)]">
                          <Layers3 className="h-4 w-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold text-slate-900">{floor.floorLabel}</h2>
                          <p className="text-[11px] text-slate-500">{floorRooms.length} active room cards</p>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </div>
                  </summary>

                  <div className="border-t border-slate-100 px-3 py-3">
                    <div className="space-y-2.5">
                      {floorRooms.map(({ room, occupied, available, roomTenants, status }) => (
                        <div key={room.id} className="rounded-[20px] border border-slate-100 bg-slate-50 px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-slate-900">Room {room.roomNumber}</h3>
                                <span className={roomStatus(status)}>{status}</span>
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500">{room.sharingType}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-slate-800">
                                {occupied}/{room.bedCount}
                              </p>
                              <p className="text-[11px] text-slate-500">{available} free</p>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {Array.from({ length: room.bedCount }).map((_, index) => {
                              const assignedTenant = roomTenants[index];
                              const paymentStatus = assignedTenant ? getDueStatus(assignedTenant.nextDueDate) : null;
                              const toneClass = !assignedTenant
                                ? "bg-[var(--warning-soft)] text-amber-700"
                                : paymentStatus?.tone === "red"
                                  ? "bg-[var(--danger-soft)] text-rose-700"
                                  : paymentStatus?.tone === "orange" || paymentStatus?.tone === "yellow"
                                    ? "bg-[var(--warning-soft)] text-amber-700"
                                    : "bg-[var(--success-soft)] text-emerald-700";

                              return (
                                <div key={`${room.id}-bed-${index + 1}`} className={`rounded-2xl px-2.5 py-2 ${toneClass}`}>
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">Bed {index + 1}</p>
                                  <p className="mt-1 truncate text-[11px] font-semibold text-slate-800">
                                    {assignedTenant ? assignedTenant.fullName : "Available"}
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          {available > 0 ? (
                            <div className="mt-3">
                              <Link
                                href={`/owner/tenants?action=add-tenant&hostelId=${currentHostel.id}&floor=${floorIndex + 1}&room=${room.roomNumber}&sharingType=${encodeURIComponent(room.sharingType)}`}
                                className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-[var(--action-gradient)] px-3 text-sm font-semibold text-white"
                              >
                                Add tenant
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="hidden lg:block">
        <div className="rounded-[28px] border border-white/70 bg-[var(--surface-gradient)] px-4 py-4 shadow-[var(--shadow-card)] sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Rooms</p>
          <div className="mt-1 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[1.35rem] font-semibold tracking-tight text-slate-800 sm:text-[1.55rem]">
                {showAvailableOnly ? "Available Rooms" : "Room Occupancy"}
              </h1>
              <p className="mt-1 text-[12px] text-slate-500">
                {showAvailableOnly
                  ? `See every room with open beds in ${currentHostel.hostelName}.`
                  : `Track every floor, room, and bed for ${currentHostel.hostelName}.`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterLink href="/owner/rooms" active={!showAvailableOnly}>
                All Rooms
              </FilterLink>
              <FilterLink href="/owner/rooms?view=available" active={showAvailableOnly}>
                Available
              </FilterLink>
            </div>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile icon={Building2} label="Hostel" value={currentHostel.hostelName} />
          <MetricTile icon={DoorOpen} label="Total Rooms" value={String(totalRooms)} />
          <MetricTile icon={Users} label="Occupied Beds" value={String(occupiedBeds)} tone="success" />
          <MetricTile
            icon={BedDouble}
            label={showAvailableOnly ? "Available Rooms" : "Available Beds"}
            value={showAvailableOnly ? String(availableRoomsCount) : String(availableBeds)}
            tone="warning"
          />
        </div>

        <div className="space-y-2.5">
          {currentHostel.floors.map((floor, floorIndex) => {
            const floorRooms = floor.rooms
              .map((room) => {
                const roomTenants = tenants.filter(
                  (tenant) =>
                    tenant.assignment?.floorNumber === floorIndex + 1 &&
                    tenant.assignment.roomNumber === room.roomNumber,
                );
                const occupied = roomTenants.length;
                const available = Math.max(room.bedCount - occupied, 0);
                const status = occupied === 0 ? "Available" : available === 0 ? "Full" : "Partly Occupied";
                return { room, occupied, available, roomTenants, status };
              })
              .filter((item) => !showAvailableOnly || item.available > 0);

            if (floorRooms.length === 0) return null;

            return (
              <Card key={floor.id} className="overflow-hidden border-white/70 bg-white">
                <details className="group" open={floorIndex === 0}>
                  <summary className="list-none cursor-pointer bg-slate-50 px-3.5 py-2.5 marker:hidden">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">{floor.floorLabel}</h2>
                        <p className="text-[11px] text-slate-500">{floorRooms.length} room cards</p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="border-t border-slate-100 p-3">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {floorRooms.map(({ room, occupied, available, roomTenants, status }) => (
                        <div key={room.id} className="rounded-[20px] border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-2.5">
                            <div>
                              <h3 className="text-[13px] font-semibold text-slate-900">Room {room.roomNumber}</h3>
                              <p className="mt-0.5 text-[11px] text-slate-500">{room.sharingType}</p>
                            </div>
                            <span className={roomStatus(status)}>{status}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-1.5">
                            <SmallInfo label="Beds" value={String(room.bedCount)} />
                            <SmallInfo label="Used" value={String(occupied)} />
                            <SmallInfo label="Free" value={String(available)} />
                          </div>
                          {available > 0 ? (
                            <div className="mt-3">
                              <Link
                                href={`/owner/tenants?action=add-tenant&hostelId=${currentHostel.id}&floor=${floorIndex + 1}&room=${room.roomNumber}&sharingType=${encodeURIComponent(room.sharingType)}`}
                                className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[var(--action-gradient)] px-3 text-[12px] font-semibold text-white"
                              >
                                Add tenant
                              </Link>
                            </div>
                          ) : null}
                          {roomTenants.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {roomTenants.map((tenant) => (
                                <span key={tenant.tenantId} className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-slate-600">
                                  {tenant.fullName}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-[var(--success-soft)] text-emerald-700"
      : tone === "warning"
        ? "bg-[var(--warning-soft)] text-amber-700"
        : "bg-[var(--pill-gradient)] text-[var(--accent)]";

  return (
    <Card className={`rounded-[20px] border-slate-100 p-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)] ${toneClass}`}>
      <div className="flex items-start gap-2.5">
        <div className="rounded-xl bg-white/80 p-2 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">{label}</p>
          <p className="mt-1 truncate text-[1.05rem] font-semibold leading-none">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-0.5 text-[12px] font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-9 items-center justify-center rounded-xl px-3 text-[12px] font-semibold transition ${
        active ? "bg-[var(--action-gradient)] text-white" : "border border-slate-200 bg-white text-slate-700"
      }`}
    >
      {children}
    </Link>
  );
}

function roomStatus(status: string) {
  if (status === "Full") return "inline-flex rounded-full bg-[var(--danger-soft)] px-2 py-1 text-[10px] font-semibold text-rose-700";
  if (status === "Partly Occupied") return "inline-flex rounded-full bg-[var(--success-soft)] px-2 py-1 text-[10px] font-semibold text-emerald-700";
  return "inline-flex rounded-full bg-[var(--warning-soft)] px-2 py-1 text-[10px] font-semibold text-amber-700";
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="h-36 animate-pulse rounded-[24px] bg-slate-100" />
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-[20px] bg-slate-100" />
        ))}
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-[22px] bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
