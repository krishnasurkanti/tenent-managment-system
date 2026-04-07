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
    <Suspense fallback={<RoomsLoadingState />}>
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
    return <Card className="border-slate-200 bg-white p-4 text-center text-sm text-slate-600">Loading rooms...</Card>;
  }

  if (!currentHostel) {
    return (
      <Card className="border-slate-200 bg-white p-4 text-center text-sm text-slate-600">
        Create a hostel first to manage rooms.
      </Card>
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
            <Link
              href="/owner/rooms"
              className={`inline-flex min-h-8.5 items-center justify-center rounded-lg px-3 text-[12px] font-semibold transition ${
                showAvailableOnly
                  ? "border border-white/80 bg-[var(--surface-gradient)] text-slate-600 hover:bg-[var(--pill-gradient)]"
                  : "bg-[var(--action-gradient)] text-white hover:opacity-95"
              }`}
            >
              All Rooms
            </Link>
            <Link
              href="/owner/rooms?view=available"
              className={`inline-flex min-h-8.5 items-center justify-center rounded-lg px-3 text-[12px] font-semibold transition ${
                showAvailableOnly
                  ? "bg-[var(--action-gradient)] text-white hover:opacity-95"
                  : "border border-white/80 bg-[var(--surface-gradient)] text-violet-700 hover:bg-[var(--pill-gradient)]"
              }`}
            >
              Available
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Building2} label="Hostel" value={currentHostel.hostelName} helper={currentHostel.address} tone="blue" />
        <SummaryCard icon={DoorOpen} label="Total Rooms" value={String(totalRooms)} helper={`${currentHostel.floors.length} floors`} tone="slate" />
        <SummaryCard icon={Users} label="Occupied Beds" value={String(occupiedBeds)} helper="Assigned tenants" tone="green" />
        <SummaryCard
          icon={BedDouble}
          label={showAvailableOnly ? "Available Rooms" : "Available Beds"}
          value={showAvailableOnly ? String(availableRoomsCount) : String(availableBeds)}
          helper={showAvailableOnly ? `${availableBeds} beds open` : "Ready for check-in"}
          tone="amber"
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

          const floorTotalBeds = floorRooms.reduce((sum, item) => sum + item.room.bedCount, 0);
          const floorOccupiedBeds = floorRooms.reduce((sum, item) => sum + item.occupied, 0);
          const floorAvailableBeds = floorRooms.reduce((sum, item) => sum + item.available, 0);

          if (floorRooms.length === 0) return null;

          return (
            <Card key={floor.id} className="overflow-hidden">
              <details className="group" open={floorIndex === 0}>
                <summary className="list-none cursor-pointer bg-[linear-gradient(180deg,#f6efff_0%,#fff5fa_100%)] px-3.5 py-2.5 marker:hidden">
                  <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-xl bg-[var(--pill-gradient)] p-1.5 text-violet-600">
                        <Layers3 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-slate-800">{floor.floorLabel}</h2>
                        <p className="mt-0.5 text-[11px] text-slate-500">{floor.rooms.length} rooms on this floor</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <CountPill label="Total Beds" value={floorTotalBeds} tone="slate" />
                        <CountPill label="Occupied" value={floorOccupiedBeds} tone="red" />
                        <CountPill label="Available" value={floorAvailableBeds} tone="green" />
                      </div>
                      <div className="rounded-full border border-white/80 bg-white/80 p-1 text-slate-500 transition-transform group-open:rotate-180">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </summary>

                <div className="border-t border-white/80">
                  <div className="grid gap-2.5 p-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {floorRooms.map(({ room, occupied, available, roomTenants, status }) => (
                      <details
                        key={room.id}
                        className="group rounded-[20px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] shadow-sm"
                        open={showAvailableOnly || (occupied > 0 && available > 0)}
                      >
                        <summary className="list-none cursor-pointer p-2.5 marker:hidden">
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-[13px] font-semibold text-slate-800">Room {room.roomNumber}</h3>
                                <span className={getRoomStatusClassName(status)}>{status}</span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                Floor {floorIndex + 1} • {room.sharingType}
                              </p>
                              <p className="mt-1 text-[12px] font-medium text-slate-700">
                                {occupied}/{room.bedCount} occupied
                                <span className="mx-2 text-slate-300">|</span>
                                {available} free
                              </p>
                            </div>
                            <div className="rounded-full border border-slate-200 bg-white p-1 text-slate-500 transition-transform group-open:rotate-180">
                              <ChevronDown className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </summary>

                        <div className="border-t border-slate-200 px-2.5 py-2.5">
                          {showAvailableOnly ? (
                            <div className="mb-2.5 grid grid-cols-2 gap-1.5 border-b border-slate-200 pb-2.5 md:grid-cols-4">
                              <SmallInfo label="Floor" value={String(floorIndex + 1)} />
                              <SmallInfo label="Room" value={room.roomNumber} />
                              <SmallInfo label="Beds" value={String(room.bedCount)} />
                              <SmallInfo label="Sharing" value={room.sharingType} />
                            </div>
                          ) : null}

                          <div className="grid gap-1.5">
                            {Array.from({ length: room.bedCount }).map((_, index) => {
                              const assignedTenant = roomTenants[index];
                              const paymentStatus = assignedTenant ? getDueStatus(assignedTenant.nextDueDate) : null;
                              const bedToneClass = !assignedTenant
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : paymentStatus?.tone === "red"
                                  ? "border-rose-200 bg-rose-50 text-rose-800"
                                  : paymentStatus?.tone === "orange" || paymentStatus?.tone === "yellow"
                                    ? "border-amber-200 bg-amber-50 text-amber-800"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-800";
                              const iconToneClass = !assignedTenant
                                ? "text-amber-700"
                                : paymentStatus?.tone === "red"
                                  ? "text-rose-700"
                                  : paymentStatus?.tone === "orange" || paymentStatus?.tone === "yellow"
                                    ? "text-amber-700"
                                    : "text-emerald-700";

                              return (
                                <div key={`${room.id}-bed-${index + 1}`} className={`rounded-lg border px-2.5 py-2 ${bedToneClass}`}>
                                  <div className="flex items-center justify-between gap-2.5">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <BedDouble className={`h-3.5 w-3.5 shrink-0 ${iconToneClass}`} />
                                      <p className="text-[12px] font-semibold">Bed {index + 1}</p>
                                    </div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                                      {assignedTenant ? paymentStatus?.label : "Open"}
                                    </p>
                                  </div>

                                  {assignedTenant ? (
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                      <p className="min-w-0 truncate text-[12px] font-medium text-slate-800">
                                        {assignedTenant.fullName}
                                      </p>
                                      <p className="shrink-0 text-[10px] font-medium text-slate-500">
                                        #{assignedTenant.tenantId}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="mt-1 text-[12px] font-medium text-slate-700">Available for check-in</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                            <SmallInfo label="Beds" value={String(room.bedCount)} />
                            <SmallInfo label="Used" value={String(occupied)} />
                            <SmallInfo label="Free" value={String(available)} />
                          </div>

                          {roomTenants.length > 0 ? (
                            <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-200 pt-2.5">
                              {roomTenants.map((tenant) => (
                                <span
                                  key={tenant.tenantId}
                                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600"
                                >
                                  {tenant.fullName}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {available > 0 ? (
                            <div className="mt-3 flex justify-center border-t border-slate-200 pt-2.5">
                              <Link
                                href={`/tenants?action=add-tenant&hostelId=${currentHostel.id}&floor=${floorIndex + 1}&room=${room.roomNumber}&sharingType=${encodeURIComponent(room.sharingType)}`}
                                className="inline-flex min-h-8.5 items-center justify-center rounded-lg bg-[var(--accent)] px-3 text-[12px] font-semibold text-white transition hover:opacity-90"
                              >
                                Add tenant
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </details>
            </Card>
          );
        })}

        {showAvailableOnly && availableRoomsCount === 0 ? (
          <Card className="border-slate-200 bg-white p-5 text-center">
            <p className="text-sm font-semibold text-slate-800">No available rooms right now.</p>
            <p className="mt-1.5 text-[12px] text-slate-500">Every room is currently full in this hostel.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function RoomsLoadingState() {
  return <Card className="border-slate-200 bg-white p-4 text-center text-sm text-slate-600">Loading rooms...</Card>;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "slate" | "green" | "amber";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-100 text-blue-600"
      : tone === "green"
        ? "bg-emerald-100 text-emerald-600"
        : tone === "amber"
          ? "bg-amber-100 text-amber-600"
          : "bg-slate-100 text-slate-600";

  return (
    <Card className="border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2.5">
        <div className={`rounded-lg p-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-slate-800">{value}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{helper}</p>
        </div>
      </div>
    </Card>
  );
}

function CountPill({ label, value, tone }: { label: string; value: number; tone: "green" | "red" | "slate" }) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "red"
        ? "bg-rose-100 text-rose-700"
        : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${toneClass}`}>
      {label}
      <span>{value}</span>
    </span>
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

function getRoomStatusClassName(status: string) {
  if (status === "Full") {
    return "inline-flex rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-700";
  }

  if (status === "Partly Occupied") {
    return "inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700";
  }

  return "inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700";
}
