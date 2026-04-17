"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, Check, ChevronDown, DoorClosed, Info, Layers3, Users2, X } from "lucide-react";
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
  const [hostelMenuOpen, setHostelMenuOpen] = useState(false);
  const [floorMenuOpen, setFloorMenuOpen] = useState(false);
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);

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
      setHostelMenuOpen(false);
      setFloorMenuOpen(false);
      setRoomMenuOpen(false);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 px-4 py-4 animate-[fade-in_var(--motion-medium)_var(--ease-enter)] sm:py-8">
      <div className="flex min-h-full items-center justify-center">
        <Card className="flex max-h-[min(92vh,920px)] w-full max-w-4xl flex-col overflow-hidden rounded-[var(--radius-card)] border-slate-100 bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.14)] animate-[float-up_var(--motion-medium)_var(--ease-enter)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center rounded-[var(--radius-pill)] bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
                Room Assignment
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Assign room to tenant</h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-500">Finish this in two small steps: choose location, then confirm move-in and review.</p>
            </div>
            <Button variant="ghost" disabled={saving} className="rounded-[var(--radius-pill)] px-3 text-slate-500 hover:bg-white/70" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <StepPill label="1. Location" active={step === 1} done={step > 1} />
            <StepPill label="2. Review" active={step === 2} done={false} />
          </div>

          <div className="mt-8 flex-1 overflow-visible pr-1">
            {loading ? (
              <div className="space-y-3 rounded-[var(--radius-card)] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-5 shadow-sm">
                <ProcessingPill label="Loading room inventory" />
                <SkeletonBlock className="h-16" />
                <div className="grid gap-3 lg:grid-cols-3">
                  <SkeletonBlock className="h-24" />
                  <SkeletonBlock className="h-24" />
                  <SkeletonBlock className="h-24" />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {step === 1 ? (
                    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <Info className="h-4 w-4 text-[var(--accent)]" />
                      <p className="text-sm font-medium text-slate-700">Choose where the tenant will stay</p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <Field label="Hostel" icon={Building2} helper="Select the hostel property">
                        <CustomDropdown
                          open={hostelMenuOpen}
                          disabled={saving}
                          onToggle={() => {
                            if (saving) return;
                            setHostelMenuOpen((value) => !value);
                            setFloorMenuOpen(false);
                            setRoomMenuOpen(false);
                          }}
                          value={hostels.find((hostel) => hostel.hostelId === hostelId)?.hostelName ?? "Select hostel"}
                        >
                          {hostels.map((hostel) => {
                            const selected = hostel.hostelId === hostelId;

                            return (
                              <DropdownOption
                                key={hostel.hostelId}
                                selected={selected}
                                primary={hostel.hostelName}
                                secondary={`${hostel.floors.length} floors`}
                                onClick={() => {
                                  const nextFloor = hostel.floors[0];
                                  setHostelId(hostel.hostelId);
                                  setFloorNumber(nextFloor ? String(nextFloor.floorNumber) : "");
                                  setRoomNumber("");
                                  setSharingType("");
                                  setHostelMenuOpen(false);
                                }}
                              />
                            );
                          })}
                        </CustomDropdown>
                      </Field>

                      <Field label="Floor" icon={Layers3} helper="Choose the floor inside the hostel">
                        <CustomDropdown
                          open={floorMenuOpen}
                          disabled={saving}
                          onToggle={() => {
                            if (saving) return;
                            setFloorMenuOpen((value) => !value);
                            setHostelMenuOpen(false);
                            setRoomMenuOpen(false);
                          }}
                          value={floorNumber ? `Floor ${floorNumber}` : "Select floor"}
                        >
                          {(selectedHostel?.floors ?? []).map((floor) => {
                            const selected = String(floor.floorNumber) === floorNumber;

                            return (
                              <DropdownOption
                                key={floor.floorNumber}
                                selected={selected}
                                primary={`Floor ${floor.floorNumber}`}
                                secondary={`${floor.rooms.length} rooms`}
                                onClick={() => {
                                  setFloorNumber(String(floor.floorNumber));
                                  setRoomNumber("");
                                  setSharingType("");
                                  setFloorMenuOpen(false);
                                }}
                              />
                            );
                          })}
                        </CustomDropdown>
                      </Field>

                      <Field label={isResidence ? "Unit" : "Room"} icon={DoorClosed} helper={isResidence ? "Only vacant units are shown" : "Only rooms with available beds are shown"}>
                        <div className="relative">
                          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-blue-300">
                            <input
                              value={roomNumber}
                              onChange={(event) => {
                                if (saving) return;
                                setRoomNumber(event.target.value);
                                setRoomMenuOpen(true);
                              }}
                              onFocus={() => {
                                if (!saving) {
                                  setRoomMenuOpen(true);
                                }
                              }}
                              disabled={saving}
                              placeholder={isResidence ? "Enter unit number" : "Enter room number"}
                              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => setRoomMenuOpen((value) => !value)}
                              className="shrink-0 text-slate-500 transition hover:text-slate-700"
                              aria-label="Toggle room list"
                            >
                              <ChevronDown className={`h-4 w-4 transition ${roomMenuOpen ? "rotate-180" : ""}`} />
                            </button>
                          </div>

                          {roomMenuOpen ? (
                            <div
                              className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-44 overflow-y-scroll rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                              style={{ scrollbarGutter: "stable" }}
                            >
                              {filteredRooms.length > 0 ? (
                                filteredRooms.map((room) => {
                                  const selected = room.roomNumber === roomNumber;

                                  return (
                                    <button
                                      key={room.roomNumber}
                                      type="button"
                                      onClick={() => {
                                        setRoomNumber(room.roomNumber);
                                        setSharingType(room.sharingType ?? "");
                                        setRoomMenuOpen(false);
                                      }}
                                      className={cn(
                                        "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition",
                                        selected ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-blue-50",
                                      )}
                                    >
                                      <span>{room.roomNumber} ({room.occupied}/{room.capacity})</span>
                                      {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-4 py-3 text-sm text-slate-500">No matching available rooms</div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </Field>
                    </div>
                    {!isResidence && selectedRoom ? (
                      <div className="mt-4 max-w-sm">
                        <Field label="Bed" icon={Users2} helper="Choose an available bed inside this room">
                          <select
                            value={bedId}
                            onChange={(event) => setBedId(event.target.value)}
                            disabled={saving}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pl-11 text-sm text-slate-700 outline-none shadow-sm transition focus:border-blue-300 focus:bg-white"
                          >
                            <option value="">Select bed</option>
                            {(selectedRoom.beds ?? [])
                              .filter((bed) => !bed.occupied)
                              .map((bed) => (
                                <option key={bed.id} value={bed.id}>
                                  {bed.label}
                                </option>
                              ))}
                          </select>
                        </Field>
                      </div>
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
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pl-11 text-sm text-slate-700 outline-none shadow-sm transition focus:border-blue-300 focus:bg-white"
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
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pl-11 text-sm text-slate-700 outline-none shadow-sm transition focus:border-blue-300 focus:bg-white"
                        />
                      </Field>
                    </div>

                    {selectedRoom ? (
                      <div className="grid gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-5 md:grid-cols-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{isResidence ? "Selected Unit" : "Selected Room"}</p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{isResidence ? "Unit" : "Room"} {selectedRoom.roomNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Availability</p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">
                            {isResidence
                              ? availableBeds > 0 ? "Vacant" : "Occupied"
                              : `${availableBeds} of ${selectedRoom.capacity} bed${selectedRoom.capacity === 1 ? "" : "s"} available`
                            }
                          </p>
                        </div>
                        {!isResidence ? (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Sharing</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">{selectedRoom.sharingType || sharingType || "Not set"}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            )}
          </div>

          {error ? <p className="mt-4 rounded-2xl border border-[color:var(--error)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">{error}</p> : null}

          {saving ? <ProcessingPill label="Assigning room and updating tenant record" className="mt-6" /> : null}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/70 pt-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" disabled={saving} onClick={step === 1 ? onClose : () => setStep(1)} className="rounded-2xl border-slate-200 bg-white">
              {step === 1 ? "Later" : "Back"}
            </Button>
            <Button disabled={saving} loading={saving && step === 2} onClick={step === 1 ? handleNext : handleAssign} className="rounded-2xl">
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

function CustomDropdown({
  open,
  onToggle,
  value,
  children,
  disabled = false,
}: {
  open: boolean;
  onToggle: () => void;
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:border-blue-200"
      >
        <span className="truncate">{value}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-44 overflow-y-scroll rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
          style={{ scrollbarGutter: "stable" }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function DropdownOption({
  selected,
  primary,
  secondary,
  onClick,
}: {
  selected: boolean;
  primary: string;
  secondary?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition",
        selected ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-blue-50",
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{primary}</p>
        {secondary ? <p className={cn("truncate text-xs", selected ? "text-white/80" : "text-slate-500")}>{secondary}</p> : null}
      </div>
      {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
    </button>
  );
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
          ? "bg-blue-600 text-white"
          : done
            ? "border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] text-white shadow-[0_10px_22px_rgba(34,197,94,0.24)]"
            : "bg-blue-50 text-indigo-700"
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
      <span className="mb-2 block text-sm font-semibold text-slate-800">{label}</span>
      {helper ? <span className="mb-3 block text-xs text-slate-500">{helper}</span> : null}
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <div className="[&_input]:pl-11 [&_select]:pl-11 [&_select]:text-slate-700 [&_select]:transition [&_select]:focus:border-blue-300 [&_select]:focus:bg-white [&_select]:border-slate-200 [&_select]:bg-white">{children}</div>
      </div>
    </label>
  );
}
