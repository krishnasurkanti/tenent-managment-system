"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BedDouble, Building2, ChevronDown, DoorOpen, Layers3, Users } from "lucide-react";
import { useHostelContext } from "@/store/hostel-context";
import { Card } from "@/components/ui/card";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import {
  ownerFilterLinkClass,
  ownerHeroCardClass,
  ownerMetricToneClass,
  ownerPanelClass,
  ownerStatusClass,
  ownerSubtlePanelClass,
} from "@/components/ui/owner-theme";
import { getDueStatus } from "@/utils/payment";

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
    return <Card className="rounded-[24px] p-4 text-center text-sm text-[color:var(--fg-secondary)]">Create a hostel first to manage rooms.</Card>;
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
        <Card className={`${ownerHeroCardClass} rounded-[24px] p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Rooms</p>
              <h1 className="mt-1 text-xl font-semibold text-white">{showAvailableOnly ? "Available Rooms" : "Room Occupancy"}</h1>
              <p className="mt-1 text-xs text-[color:var(--fg-secondary)]">{currentHostel.hostelName}</p>
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
              <Card key={floor.id} className={`overflow-hidden rounded-[22px] ${ownerPanelClass}`}>
                <details open={floorIndex === 0}>
                  <summary className="list-none px-3 py-3 marker:hidden">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-xl bg-[color:var(--brand-soft)] p-2 text-[#9edcff]">
                          <Layers3 className="h-4 w-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold text-white">{floor.floorLabel}</h2>
                          <p className="text-[11px] text-[color:var(--fg-secondary)]">{floorRooms.length} active room cards</p>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-[color:var(--fg-secondary)]" />
                    </div>
                  </summary>

                  <div className="border-t border-[color:var(--border)] px-3 py-3">
                    <div className="space-y-2.5">
                      {floorRooms.map(({ room, occupied, available, roomTenants, status }) => (
                        <div key={room.id} className={`rounded-[20px] px-3 py-3 ${ownerSubtlePanelClass}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-white">Room {room.roomNumber}</h3>
                                <span className={roomStatus(status)}>{status}</span>
                              </div>
                              <p className="mt-1 text-[11px] text-[color:var(--fg-secondary)]">{room.sharingType}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-white">
                                {occupied}/{room.bedCount}
                              </p>
                              <p className="text-[11px] text-[color:var(--fg-secondary)]">{available} free</p>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {Array.from({ length: room.bedCount }).map((_, index) => {
                              const assignedTenant = roomTenants[index];
                              const paymentStatus = assignedTenant ? getDueStatus(assignedTenant.nextDueDate) : null;
                              const toneClass = !assignedTenant
                                ? "border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] text-[#422006] shadow-[0_10px_22px_rgba(250,204,21,0.24)]"
                                : paymentStatus?.tone === "red"
                                  ? "border border-[#ef4444] bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] text-white shadow-[0_12px_24px_rgba(220,38,38,0.24)]"
                                  : paymentStatus?.tone === "orange" || paymentStatus?.tone === "yellow"
                                    ? "border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] text-[#422006] shadow-[0_10px_22px_rgba(250,204,21,0.24)]"
                                    : "border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] text-white shadow-[0_10px_22px_rgba(34,197,94,0.24)]";

                              return (
                                <div key={`${room.id}-bed-${index + 1}`} className={`rounded-2xl px-2.5 py-2 ${toneClass}`}>
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">Bed {index + 1}</p>
                                  <p className="mt-1 truncate text-[11px] font-semibold">
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
                                className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] px-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)]"
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
        <div className={`${ownerHeroCardClass} px-4 py-4 sm:px-5`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--fg-secondary)]">Rooms</p>
          <div className="mt-1 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[1.35rem] font-semibold tracking-tight text-white sm:text-[1.55rem]">
                {showAvailableOnly ? "Available Rooms" : "Room Occupancy"}
              </h1>
              <p className="mt-1 text-[12px] text-[color:var(--fg-secondary)]">
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
              <Card key={floor.id} className={`overflow-hidden ${ownerPanelClass}`}>
                <details className="group" open={floorIndex === 0}>
                  <summary className="list-none cursor-pointer bg-[color:var(--surface-soft)] px-3.5 py-2.5 marker:hidden">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-white">{floor.floorLabel}</h2>
                        <p className="text-[11px] text-[color:var(--fg-secondary)]">{floorRooms.length} room cards</p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-[color:var(--fg-secondary)] transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="border-t border-[color:var(--border)] p-3">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {floorRooms.map(({ room, occupied, available, roomTenants, status }) => (
                        <div key={room.id} className={`rounded-[20px] p-3 ${ownerSubtlePanelClass}`}>
                          <div className="flex items-start justify-between gap-2.5">
                            <div>
                              <h3 className="text-[13px] font-semibold text-white">Room {room.roomNumber}</h3>
                              <p className="mt-0.5 text-[11px] text-[color:var(--fg-secondary)]">{room.sharingType}</p>
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
                                className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] px-3 text-[12px] font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.2)]"
                              >
                                Add tenant
                              </Link>
                            </div>
                          ) : null}
                          {roomTenants.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {roomTenants.map((tenant) => (
                                <span key={tenant.tenantId} className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-2 py-1 text-[10px] font-medium text-[color:var(--fg-primary)]">
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
  const toneClass = ownerMetricToneClass(tone);

  return (
    <Card className={`rounded-[20px] border p-3 ${toneClass}`}>
      <div className="flex items-start gap-2.5">
        <div className="rounded-xl bg-black/10 p-2 ring-1 ring-white/8">
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
    <div className={`rounded-lg px-2 py-1.5 ${ownerSubtlePanelClass}`}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">{label}</p>
      <p className="mt-0.5 text-[12px] font-semibold text-white">{value}</p>
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
      className={`inline-flex min-h-9 items-center justify-center rounded-xl px-3 text-[12px] font-semibold transition ${ownerFilterLinkClass(active)}`}
    >
      {children}
    </Link>
  );
}

function roomStatus(status: string) {
  if (status === "Full") return ownerStatusClass("red");
  if (status === "Partly Occupied") return ownerStatusClass("green");
  return ownerStatusClass("orange");
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="h-36 animate-pulse rounded-[24px] bg-[color:var(--surface-soft)]" />
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-[20px] bg-[color:var(--surface-soft)]" />
        ))}
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-[22px] bg-[color:var(--surface-soft)]" />
        ))}
      </div>
    </div>
  );
}
