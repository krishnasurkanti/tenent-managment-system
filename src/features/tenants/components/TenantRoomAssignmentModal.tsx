"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Users2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { fetchOwnerHostels } from "@/services/owner/owner-hostels.service";
import { assignTenantRoom } from "@/services/tenants/tenants.service";
import { cn } from "@/utils/cn";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import type { HostelRoomInventory, TenantRecord } from "@/types/tenant";
import type { OwnerHostel } from "@/types/owner-hostel";

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
  const [step, setStep] = useState<1 | 2>(1);
  const [hostels, setHostels] = useState<HostelRoomInventory[]>([]);
  const [hostelId, setHostelId] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [sharingType, setSharingType] = useState("");
  const [bedId, setBedId] = useState("");
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
      const { data } = await fetchOwnerHostels();
      const nextHostels = (data.hostels ?? []).map(mapHostelInventory);
      const firstHostel = nextHostels[0];
      const preferredHostel = nextHostels.find((item) => item.hostelId === preferredAssignment?.hostelId) ?? firstHostel;
      const preferredFloor =
        preferredHostel?.floors.find((item) => item.floorNumber === preferredAssignment?.floorNumber) ??
        preferredHostel?.floors[0];
      setHostels(nextHostels);
      setHostelId(preferredHostel?.hostelId ?? "");
      setFloorNumber(preferredFloor ? String(preferredFloor.floorNumber) : "");
      setRoomNumber("");
      setSharingType("");
      setBedId("");
      setMoveInDate(new Date().toISOString().slice(0, 10));
      setStep(1);
      setLoading(false);
    };

    void load();
  }, [open, preferredAssignment?.floorNumber, preferredAssignment?.hostelId, preferredAssignment?.roomNumber]);

  const selectedHostel = useMemo(() => hostels.find((item) => item.hostelId === hostelId), [hostelId, hostels]);
  const isResidence = selectedHostel?.type === "RESIDENCE";
  const selectedFloor = useMemo(
    () => selectedHostel?.floors.find((item) => item.floorNumber === Number(floorNumber)),
    [floorNumber, selectedHostel],
  );
  const selectedRoom = useMemo(
    () => selectedFloor?.rooms.find((item) => item.roomNumber === roomNumber),
    [roomNumber, selectedFloor],
  );
  const availableBeds = selectedRoom ? selectedRoom.capacity - selectedRoom.occupied : 0;
  const availableRooms = selectedFloor?.rooms.filter((room) => room.occupied < room.capacity) ?? [];
  const filteredRooms = availableRooms.filter((room) => room.roomNumber.toLowerCase().includes(roomNumber.toLowerCase()));

  if (!open || !tenant) {
    return null;
  }

  const handleAssign = async () => {
    if (!hostelId || !floorNumber || !roomNumber || !selectedRoom) {
      setError("Choose a hostel, floor, and valid room before assigning.");
      return;
    }

    if (!moveInDate) {
      setError("Choose the move-in date before assigning the room.");
      return;
    }

    if (!isResidence && !bedId) {
      setError("Choose the bed before assigning the room.");
      return;
    }

    if (saving) {
      return;
    }

    setSaving(true);
    setError("");

    const { response, data } = await assignTenantRoom({
      tenantId: tenant.tenantId,
      hostelId,
      floorNumber: Number(floorNumber),
      roomNumber,
      sharingType,
      moveInDate,
      propertyType: selectedHostel?.type,
      bedId: isResidence ? undefined : bedId,
      bedLabel: isResidence ? undefined : selectedRoom?.beds?.find((bed) => bed.id === bedId)?.label,
      tenantRecord: tenant,
    });

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
    setBedId("");
    setMoveInDate("");
    setStep(1);
    onClose();
  };

  const handleNext = () => {
    if (!hostelId || !floorNumber || !roomNumber) {
      setError("Please select hostel, floor, and room first.");
      return;
    }

    if (!selectedRoom) {
      setError("Please choose a valid available room from the list.");
      return;
    }

    if (!isResidence && !bedId) {
      setError("Please choose an available bed before continuing.");
      return;
    }

    setError("");
    setStep(2);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain px-4 py-4 animate-[fade-in_var(--motion-medium)_var(--ease-enter)] sm:items-center sm:py-8"
      style={{ background: "rgba(2,6,23,0.76)", backdropFilter: "blur(6px)" }}
    >
      <div className="flex min-h-full w-full max-w-4xl items-start justify-center sm:items-center">
        <Card className="w-full overflow-visible border-white/12 bg-[linear-gradient(180deg,#131d2e_0%,#0d1525_100%)] p-5 shadow-[0_40px_100px_rgba(0,0,0,0.6)] animate-[float-up_var(--motion-medium)_var(--ease-enter)] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Room Assignment</span>
              <div className="flex gap-2">
                <StepPill label="1. Location" active={step === 1} done={step > 1} />
                <StepPill label="2. Review" active={step === 2} done={false} />
              </div>
            </div>
            <Button variant="ghost" disabled={saving} className="rounded-2xl px-3 text-white/60 hover:text-white" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div>
            {loading ? (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5">
                <ProcessingPill label="Loading room inventory" />
                <SkeletonBlock className="h-16" />
                <div className="grid gap-3 lg:grid-cols-3">
                  <SkeletonBlock className="h-24" />
                  <SkeletonBlock className="h-24" />
                  <SkeletonBlock className="h-24" />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {step === 1 ? (
                  <div className="space-y-5">
                    <PillGroup label="Hostel">
                      {hostels.map((hostel) => (
                        <PillButton
                          key={hostel.hostelId}
                          selected={hostel.hostelId === hostelId}
                          disabled={saving}
                          onClick={() => {
                            const nextFloor = hostel.floors[0];
                            setHostelId(hostel.hostelId);
                            setFloorNumber(nextFloor ? String(nextFloor.floorNumber) : "");
                            setRoomNumber("");
                            setSharingType("");
                            setBedId("");
                          }}
                        >
                          {hostel.hostelName}
                        </PillButton>
                      ))}
                    </PillGroup>

                    {selectedHostel ? (
                      <PillGroup label="Floor">
                        {selectedHostel.floors.map((floor) => (
                          <PillButton
                            key={floor.floorNumber}
                            selected={String(floor.floorNumber) === floorNumber}
                            disabled={saving}
                            onClick={() => {
                              setFloorNumber(String(floor.floorNumber));
                              setRoomNumber("");
                              setSharingType("");
                              setBedId("");
                            }}
                          >
                            Floor {floor.floorNumber}
                          </PillButton>
                        ))}
                      </PillGroup>
                    ) : null}

                    {selectedFloor ? (
                      <PillGroup label={isResidence ? "Unit" : "Room"}>
                        {availableRooms.length === 0 ? (
                          <span className="text-sm text-white/40">No available {isResidence ? "units" : "rooms"}</span>
                        ) : (
                          availableRooms.map((room) => (
                            <PillButton
                              key={room.roomNumber}
                              selected={room.roomNumber === roomNumber}
                              disabled={saving}
                              onClick={() => {
                                setRoomNumber(room.roomNumber);
                                setSharingType(room.sharingType ?? "");
                                setBedId("");
                              }}
                            >
                              {room.roomNumber}
                            </PillButton>
                          ))
                        )}
                      </PillGroup>
                    ) : null}

                    {!isResidence && selectedRoom ? (
                      <PillGroup label="Bed">
                        {(selectedRoom.beds ?? []).filter((bed) => !bed.occupied).length === 0 ? (
                          <span className="text-sm text-white/40">No available beds</span>
                        ) : (
                          (selectedRoom.beds ?? []).filter((bed) => !bed.occupied).map((bed) => (
                            <PillButton
                              key={bed.id}
                              selected={bed.id === bedId}
                              disabled={saving}
                              onClick={() => setBedId(bed.id)}
                            >
                              {bed.label}
                            </PillButton>
                          ))
                        )}
                      </PillGroup>
                    ) : null}
                  </div>
                ) : null}

                {step === 2 ? (
                  <>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {!isResidence ? (
                        <Field label="Sharing Type" icon={Users2} helper="Auto-filled from the selected room">
                          <input
                            value={sharingType}
                            onChange={(event) => setSharingType(event.target.value)}
                            disabled={saving}
                            className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 pl-11 text-sm text-white outline-none transition focus:border-[#38bdf8]/40 placeholder:text-white/25"
                            placeholder="Ex: Double Sharing"
                          />
                        </Field>
                      ) : null}

                      <Field label="Move-in Date" icon={CalendarDays} helper={isResidence ? "The date the tenant moves into this unit" : "The date the tenant starts staying in this room"}>
                        <input
                          type="date"
                          value={moveInDate}
                          onChange={(event) => setMoveInDate(event.target.value)}
                          disabled={saving}
                          className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 pl-11 text-sm text-white outline-none transition focus:border-[#38bdf8]/40 [color-scheme:dark] [&::-webkit-datetime-edit]:text-white [&::-webkit-datetime-edit-fields-wrapper]:text-white"
                        />
                      </Field>
                    </div>

                    {selectedRoom ? (
                      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:grid-cols-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">{isResidence ? "Selected Unit" : "Selected Room"}</p>
                          <p className="mt-2 text-lg font-semibold text-white">{isResidence ? "Unit" : "Room"} {selectedRoom.roomNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">Availability</p>
                          <p className="mt-2 text-lg font-semibold text-white">
                            {isResidence
                              ? availableBeds > 0 ? "Vacant" : "Occupied"
                              : `${availableBeds} of ${selectedRoom.capacity} bed${selectedRoom.capacity === 1 ? "" : "s"} available`
                            }
                          </p>
                        </div>
                        {!isResidence ? (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">Sharing</p>
                            <p className="mt-2 text-lg font-semibold text-white">{selectedRoom.sharingType || sharingType || "Not set"}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            )}
          </div>

          {error ? <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p> : null}

          {saving ? <ProcessingPill label="Assigning room and updating tenant record" className="mt-4" /> : null}

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" disabled={saving} onClick={step === 1 ? onClose : () => { setStep(1); setError(""); }} className="rounded-2xl border-white/12 bg-white/[0.05] text-white/70 hover:text-white">
              {step === 1 ? "Later" : "Back"}
            </Button>
            <Button disabled={saving} loading={saving && step === 2} onClick={step === 1 ? handleNext : handleAssign} className="rounded-2xl bg-[linear-gradient(90deg,#1d4ed8_0%,#2563eb_100%)] text-white hover:text-white hover:brightness-110">
              {step === 1 ? "Next: Review" : saving ? "Assigning..." : isResidence ? "Assign Unit" : "Assign Room"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function mapHostelInventory(hostel: OwnerHostel): HostelRoomInventory {
  return {
    hostelId: hostel.id,
    hostelName: hostel.hostelName,
    type: hostel.type ?? "PG",
    floors: hostel.floors.map((floor, floorIndex) => ({
      id: floor.id,
      floorNumber: floorIndex + 1,
      rooms: floor.rooms.map((room) => ({
        id: room.id,
        unitId: room.unitId,
        roomNumber: room.roomNumber,
        capacity: hostel.type === "RESIDENCE" ? 1 : room.bedCount,
        occupied: 0,
        sharingType: room.sharingType,
        propertyType: hostel.type ?? "PG",
        beds: room.beds?.map((bed) => ({
          id: bed.id,
          label: bed.label,
          occupied: false,
        })),
      })),
    })),
  };
}


function StepPill({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold ${
        active
          ? "border border-blue-500/60 bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)]"
          : done
            ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
            : "border border-white/12 bg-white/[0.05] text-white/40"
      }`}
    >
      {label}
    </span>
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
      <span className="mb-1 block text-sm font-medium text-white/70">{label}</span>
      {helper ? <span className="mb-2 block text-xs text-white/35">{helper}</span> : null}
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <div className="[&_input]:pl-11 [&_select]:pl-11">{children}</div>
      </div>
    </label>
  );
}

function PillGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function PillButton({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-2 text-sm font-medium transition",
        selected
          ? "border-blue-500/60 bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
          : "border-white/12 bg-white/[0.06] text-white/70 hover:border-white/25 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
