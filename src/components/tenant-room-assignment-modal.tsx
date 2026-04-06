"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, DoorClosed, Info, Layers3, Users2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import type { HostelRoomInventory, TenantRecord } from "@/types/tenant";

export function TenantRoomAssignmentModal({
  open,
  tenant,
  onClose,
  onAssigned,
  preferredAssignment,
}: {
  open: boolean;
  tenant: TenantRecord | null;
  onClose: () => void;
  onAssigned: (tenant: TenantRecord) => void;
  preferredAssignment?: {
    hostelId?: string;
    floorNumber?: number;
    roomNumber?: string;
    sharingType?: string;
  };
}) {
  const [hostels, setHostels] = useState<HostelRoomInventory[]>([]);
  const [hostelId, setHostelId] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [sharingType, setSharingType] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) {
      return;
    }

    const load = async () => {
      setLoading(true);
      const response = await fetch("/api/tenants");
      const data = await response.json();
      const nextHostels = (data.hostels ?? []) as HostelRoomInventory[];
      const firstHostel = nextHostels[0];
      const preferredHostel = nextHostels.find((item) => item.hostelId === preferredAssignment?.hostelId) ?? firstHostel;
      const preferredFloor =
        preferredHostel?.floors.find((item) => item.floorNumber === preferredAssignment?.floorNumber) ??
        preferredHostel?.floors[0];
      const preferredRoom =
        preferredFloor?.rooms.find(
          (room) =>
            room.roomNumber === preferredAssignment?.roomNumber && room.occupied < room.capacity,
        ) ?? preferredFloor?.rooms.find((room) => room.occupied < room.capacity);

      setHostels(nextHostels);
      setHostelId(preferredHostel?.hostelId ?? "");
      setFloorNumber(preferredFloor ? String(preferredFloor.floorNumber) : "");
      setRoomNumber(preferredRoom?.roomNumber ?? "");
      setSharingType(preferredRoom?.sharingType ?? "");
      setMoveInDate(new Date().toISOString().slice(0, 10));
      setLoading(false);
    };

    void load();
  }, [open, preferredAssignment?.floorNumber, preferredAssignment?.hostelId, preferredAssignment?.roomNumber]);

  const selectedHostel = useMemo(() => hostels.find((item) => item.hostelId === hostelId), [hostelId, hostels]);
  const selectedFloor = useMemo(
    () => selectedHostel?.floors.find((item) => item.floorNumber === Number(floorNumber)),
    [floorNumber, selectedHostel],
  );
  const selectedRoom = useMemo(
    () => selectedFloor?.rooms.find((item) => item.roomNumber === roomNumber),
    [roomNumber, selectedFloor],
  );
  const availableBeds = selectedRoom ? selectedRoom.capacity - selectedRoom.occupied : 0;

  if (!open || !tenant) {
    return null;
  }

  const handleAssign = async () => {
    setSaving(true);
    setError("");

    const response = await fetch("/api/tenants/assign-room", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantId: tenant.tenantId,
        hostelId,
        floorNumber: Number(floorNumber),
        roomNumber,
        sharingType,
        moveInDate,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message ?? "Unable to assign room.");
      setSaving(false);
      return;
    }

    onAssigned(data.tenant as TenantRecord);
    setSaving(false);
    setHostelId("");
    setFloorNumber("");
    setRoomNumber("");
    setSharingType("");
    setMoveInDate("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 px-4 py-4 sm:py-8">
      <div className="flex min-h-full items-center justify-center">
      <Card className="flex max-h-[min(92vh,920px)] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
              Step 2
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Assign room to tenant</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">
              Tenant ID <span className="font-semibold text-slate-800">{tenant.tenantId}</span> is ready. Select the hostel, floor, room, sharing setup, and move-in date to complete the tenant profile.
            </p>
          </div>
          <Button variant="ghost" className="rounded-2xl px-3 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-8 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Loading hostel room data...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Info className="h-4 w-4 text-violet-600" />
                <p className="text-sm font-medium text-slate-700">Choose the location for this tenant</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Field label="Hostel" icon={Building2} helper="Select the hostel property">
              <select
                value={hostelId}
                onChange={(event) => {
                  const nextHostel = hostels.find((item) => item.hostelId === event.target.value);
                  const nextFloor = nextHostel?.floors[0];
                  const nextRoom = nextFloor?.rooms.find((room) => room.occupied < room.capacity);
                  setHostelId(event.target.value);
                  setFloorNumber(nextFloor ? String(nextFloor.floorNumber) : "");
                  setRoomNumber(nextRoom?.roomNumber ?? "");
                  setSharingType(nextRoom?.sharingType ?? "");
                }}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
              >
                {hostels.map((hostel) => (
                  <option key={hostel.hostelId} value={hostel.hostelId}>
                    {hostel.hostelName}
                  </option>
                  ))}
              </select>
            </Field>
                <Field label="Floor" icon={Layers3} helper="Choose the floor inside the hostel">
              <select
                value={floorNumber}
                onChange={(event) => {
                  const nextFloor = selectedHostel?.floors.find((item) => item.floorNumber === Number(event.target.value));
                  const nextRoom = nextFloor?.rooms.find((room) => room.occupied < room.capacity);
                  setFloorNumber(event.target.value);
                  setRoomNumber(nextRoom?.roomNumber ?? "");
                  setSharingType(nextRoom?.sharingType ?? "");
                }}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
              >
                {selectedHostel?.floors.map((floor) => (
                  <option key={floor.floorNumber} value={floor.floorNumber}>
                    Floor {floor.floorNumber}
                  </option>
                  ))}
              </select>
            </Field>
                <Field label="Room" icon={DoorClosed} helper="Only rooms with available beds are shown">
              <select
                value={roomNumber}
                onChange={(event) => {
                  const nextRoom = selectedFloor?.rooms.find((room) => room.roomNumber === event.target.value);
                  setRoomNumber(event.target.value);
                  setSharingType(nextRoom?.sharingType ?? "");
                }}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
              >
                {selectedFloor?.rooms
                  .filter((room) => room.occupied < room.capacity)
                  .map((room) => (
                    <option key={room.roomNumber} value={room.roomNumber}>
                      {room.roomNumber} ({room.occupied}/{room.capacity})
                    </option>
                  ))}
              </select>
            </Field>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Sharing Type" icon={Users2} helper="Auto-filled from the selected room">
              <input
                value={sharingType}
                onChange={(event) => setSharingType(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pl-11 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white"
                placeholder="Ex: Double Sharing"
              />
            </Field>
              <Field label="Move-in Date" icon={CalendarDays} helper="The date the tenant starts staying in this room">
              <input
                type="date"
                value={moveInDate}
                onChange={(event) => setMoveInDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pl-11 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white"
              />
            </Field>
            </div>
          </div>
        )}
        </div>

        {selectedRoom ? (
          <div className="mt-6 grid gap-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Selected Room</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">Room {selectedRoom.roomNumber}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Availability</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {availableBeds} of {selectedRoom.capacity} bed{selectedRoom.capacity === 1 ? "" : "s"} available
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Sharing</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{selectedRoom.sharingType || sharingType || "Not set"}</p>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="rounded-2xl">
            Later
          </Button>
          <Button onClick={handleAssign} className={`rounded-2xl ${saving ? "opacity-70" : ""}`}>
            {saving ? "Assigning..." : "Assign Room"}
          </Button>
        </div>
      </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
  helper,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-800">{label}</span>
      {helper ? <span className="mb-3 block text-xs text-slate-500">{helper}</span> : null}
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <div className="[&_input]:pl-11 [&_select]:pl-11 [&_select]:text-slate-700 [&_select]:transition [&_select]:focus:border-violet-300 [&_select]:focus:bg-white [&_select]:border-slate-200 [&_select]:bg-slate-50">{children}</div>
      </div>
    </label>
  );
}
