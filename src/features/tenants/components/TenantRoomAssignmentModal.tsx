"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/overlay/modal";
import { FormField } from "@/components/ui/form/field";
import { TextInput } from "@/components/ui/form/text-input";
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
  asPage = false,
}: {
  open: boolean;
  tenant: TenantRecord | null;
  onClose: () => void;
  onAssigned: (tenant: TenantRecord) => void;
  preferredAssignment?: { hostelId?: string; roomNumber?: string; sharingType?: string };
  /** Render as inline page element (no overlay, no body lock) */
  asPage?: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [hostels, setHostels] = useState<HostelRoomInventory[]>([]);
  const [hostelId, setHostelId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [sharingType, setSharingType] = useState("");
  const [bedId, setBedId] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // asPage renders inline (no overlay) — lock only in overlay mode. Modal handles
  // its own lock; keep this for the asPage=false→page transition parity.
  useLockBodyScroll(false);

  useEffect(() => {
    if (!asPage && !open) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await fetchOwnerHostels({ withInventory: true });
        const nextHostels = (data.hostels ?? []).map(mapHostelInventory);
        const preferredHostel = nextHostels.find((item) => item.hostelId === preferredAssignment?.hostelId) ?? nextHostels[0];
        setHostels(nextHostels);
        setHostelId(preferredHostel?.hostelId ?? "");
        setRoomNumber("");
        setSharingType("");
        setBedId("");
        setMoveInDate(new Date().toISOString().slice(0, 10));
        setStep(1);
      } catch {
        setError("Failed to load hostels. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, asPage, preferredAssignment?.hostelId, preferredAssignment?.roomNumber]);

  const selectedHostel = useMemo(() => hostels.find((item) => item.hostelId === hostelId), [hostelId, hostels]);
  const isResidence = selectedHostel?.type === "RESIDENCE";
  const selectedRoom = useMemo(() => selectedHostel?.rooms.find((item) => item.roomNumber === roomNumber), [roomNumber, selectedHostel]);
  const availableBeds = selectedRoom ? selectedRoom.capacity - selectedRoom.occupied : 0;
  const availableRooms = selectedHostel?.rooms.filter((room) => room.occupied < room.capacity) ?? [];

  if (!asPage && !open) return null;
  if (!tenant) {
    return (
      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-6">
        <SkeletonBlock className="h-5 w-40" />
        <SkeletonBlock className="h-4 w-64" />
        <SkeletonBlock className="h-4 w-48" />
      </div>
    );
  }

  const handleAssign = async () => {
    if (!hostelId || !roomNumber || !selectedRoom) return setError("Choose a hostel and valid room before assigning.");
    if (!moveInDate) return setError("Choose the move-in date before assigning the room.");
    if (!isResidence && !bedId) return setError("Choose the bed before assigning the room.");
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const { response, data } = await assignTenantRoom({
        tenantId: tenant.tenantId,
        hostelId,
        unitId: selectedRoom?.unitId,
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
      setRoomNumber("");
      setSharingType("");
      setBedId("");
      setMoveInDate("");
      setStep(1);
      onClose();
    } catch {
      setError("Network error. Check your connection and try again.");
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (!hostelId || !roomNumber) return setError("Please select hostel and room first.");
    if (!selectedRoom) return setError("Please choose a valid available room from the list.");
    if (!isResidence && !bedId) return setError("Please choose an available bed before continuing.");
    if (!isResidence && bedId) {
      const chosenBed = selectedRoom?.beds?.find((b) => b.id === bedId);
      if (chosenBed?.occupied) return setError("That bed is already occupied. Please choose a different bed.");
    }
    setError("");
    setStep(2);
  };

  const stepBar = (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-tertiary)]">Assign</span>
      <StepPill label="1. Location" active={step === 1} done={step > 1} />
      <StepPill label="2. Review" active={step === 2} done={false} />
    </div>
  );

  const body = (
    <div>
      {stepBar}
      {loading ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-5">
          <ProcessingPill label="Loading room inventory" />
          <SkeletonBlock className="h-16" />
          <div className="grid gap-3 lg:grid-cols-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
        </div>
      ) : step === 1 ? (
        <div className="flex flex-col gap-4">
          <PillGroup label="Hostel">
            {hostels.map((hostel) => (
              <PillButton
                key={hostel.hostelId}
                selected={hostel.hostelId === hostelId}
                disabled={saving}
                onClick={() => { setHostelId(hostel.hostelId); setRoomNumber(""); setSharingType(""); setBedId(""); }}
              >
                {hostel.hostelName}
              </PillButton>
            ))}
          </PillGroup>

          {selectedHostel ? (
            <PillGroup label={isResidence ? "Unit" : "Room"}>
              {availableRooms.length === 0 ? (
                <span className="text-sm text-[color:var(--fg-tertiary)]">No available {isResidence ? "units" : "rooms"}</span>
              ) : (
                availableRooms.map((room) => (
                  <PillButton
                    key={room.roomNumber}
                    selected={room.roomNumber === roomNumber}
                    disabled={saving}
                    onClick={() => { setRoomNumber(room.roomNumber); setSharingType(room.sharingType ?? ""); setBedId(""); }}
                  >
                    {room.roomNumber}
                  </PillButton>
                ))
              )}
            </PillGroup>
          ) : null}

          {!isResidence && selectedRoom ? (
            <PillGroup label="Bed">
              {(selectedRoom.beds ?? []).length === 0 ? (
                <span className="text-sm text-[color:var(--fg-tertiary)]">No beds configured</span>
              ) : (
                (selectedRoom.beds ?? []).map((bed) => (
                  <BedPillButton
                    key={bed.id}
                    selected={bed.id === bedId}
                    occupied={bed.occupied ?? false}
                    disabled={saving || (bed.occupied ?? false)}
                    onClick={() => setBedId(bed.id)}
                  >
                    {bed.label}
                  </BedPillButton>
                ))
              )}
            </PillGroup>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {!isResidence ? (
              <FormField label="Sharing type" helper="Auto-filled from the selected room">
                {({ id }) => (
                  <TextInput id={id} value={sharingType} onChange={(e) => setSharingType(e.target.value)} disabled={saving} leadingIcon={<Users2 size={15} />} placeholder="Ex: Double Sharing" />
                )}
              </FormField>
            ) : null}
            <FormField label="Move-in date" helper={isResidence ? "Date the tenant moves into this unit" : "Date the tenant starts staying in this room"}>
              {({ id }) => (
                <TextInput id={id} type="date" value={moveInDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setMoveInDate(e.target.value)} disabled={saving} leadingIcon={<CalendarDays size={15} />} className="[color-scheme:dark]" />
              )}
            </FormField>
          </div>

          {selectedRoom ? (
            <div className="grid gap-4 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3 sm:p-4 md:grid-cols-3">
              <ReviewCell label={isResidence ? "Selected unit" : "Selected room"} value={`${isResidence ? "Unit" : "Room"} ${selectedRoom.roomNumber}`} />
              <ReviewCell
                label="Availability"
                value={isResidence ? (availableBeds > 0 ? "Vacant" : "Occupied") : `${availableBeds} of ${selectedRoom.capacity} bed${selectedRoom.capacity === 1 ? "" : "s"} available`}
              />
              {!isResidence ? <ReviewCell label="Sharing" value={selectedRoom.sharingType || sharingType || "Not set"} /> : null}
            </div>
          ) : null}
        </div>
      )}

      {error ? <p role="alert" className="mt-4 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">{error}</p> : null}
      {saving ? <ProcessingPill label="Assigning room and updating tenant record" className="mt-4" /> : null}
    </div>
  );

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="secondary" disabled={saving} onClick={step === 1 ? onClose : () => { setStep(1); setError(""); }}>
        {step === 1 ? "Later" : "Back"}
      </Button>
      <Button disabled={saving} loading={saving && step === 2} onClick={step === 1 ? handleNext : handleAssign}>
        {step === 1 ? "Next: Review" : saving ? "Assigning…" : isResidence ? "Assign Unit" : "Assign Room"}
      </Button>
    </div>
  );

  if (asPage) {
    return (
      <Card className="p-4">
        {body}
        <div className="sticky bottom-0 z-10 mt-4 border-t border-[color:var(--border)] bg-[color:var(--bg-surface)] pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          {footer}
        </div>
      </Card>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Room assignment" size="xl" footer={footer}>
      {body}
    </Modal>
  );
}

function mapHostelInventory(hostel: OwnerHostel): HostelRoomInventory {
  return {
    hostelId: hostel.id,
    hostelName: hostel.hostelName,
    type: hostel.type ?? "PG",
    rooms: (hostel.rooms ?? []).map((room) => ({
      id: room.id,
      unitId: room.unitId,
      roomNumber: room.roomNumber,
      capacity: hostel.type === "RESIDENCE" ? 1 : room.bedCount,
      occupied: room.occupied ?? 0,
      sharingType: room.sharingType,
      propertyType: hostel.type ?? "PG",
      beds: room.beds?.map((bed) => ({ id: bed.id, label: bed.label, occupied: bed.occupied ?? false })),
    })),
  };
}

function StepPill({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold",
        active
          ? "border border-[color:color-mix(in_srgb,var(--brand)_60%,transparent)] bg-[color:var(--cta)] text-white"
          : done
            ? "border border-[color:color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color:var(--success-soft)] text-[color:var(--success)]"
            : "border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-tertiary)]",
      )}
    >
      {label}
    </span>
  );
}

function ReviewCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--success)]">{label}</p>
      <p className="mt-1.5 text-[length:var(--text-lg-size)] font-semibold text-[color:var(--fg-primary)]">{value}</p>
    </div>
  );
}

function PillGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--fg-tertiary)]">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function PillButton({ selected, disabled, onClick, children }: { selected: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-[var(--radius-md)] border px-4 py-2 text-sm font-medium transition",
        selected
          ? "border-[color:color-mix(in_srgb,var(--brand)_60%,transparent)] bg-[color:var(--cta)] text-white"
          : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-secondary)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--fg-primary)]",
      )}
    >
      {children}
    </button>
  );
}

function BedPillButton({ selected, occupied, disabled, onClick, children }: { selected: boolean; occupied: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-[var(--radius-md)] border px-4 py-2 text-sm font-semibold transition",
        selected
          ? "border-[color:color-mix(in_srgb,var(--brand)_60%,transparent)] bg-[color:var(--cta)] text-white"
          : occupied
            ? "cursor-not-allowed border-[color:var(--error)] bg-[color:var(--error-soft)] text-[color:var(--error)] opacity-80"
            : "border-[color:color-mix(in_srgb,var(--success)_45%,transparent)] bg-[color:var(--success-soft)] text-[color:var(--success)] hover:brightness-110",
      )}
    >
      {children}
    </button>
  );
}
