"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, ChevronRight, Home, MapPin, Phone, Plus, SkipForward, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OwnerPageHero, OwnerQuickStat } from "@/components/ui/owner-page";
import { ownerInputClass, ownerPanelClass, ownerSubtlePanelClass } from "@/components/ui/owner-theme";
import { fetchOwnerHostel, saveOwnerHostel } from "@/services/owner/owner-hostels.service";

const HOSTEL_DRAFT_KEY = "owner-create-hostel-draft-v1";

type RoomForm = {
  id: string;
  roomNumber: string;
  bedCount: string;
};

type BedEntry = { name: string; phone: string; date: string; skipped: boolean };
type RoomEntry = {
  roomId: string; roomNumber: string; bedCount: number; beds: BedEntry[];
  floorLabel: string; floorIndex: number; skipped: boolean;
};

function createRoom(): RoomForm {
  return {
    id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    roomNumber: "",
    bedCount: "",
  };
}

function isRoomComplete(room: RoomForm) {
  return room.roomNumber.trim() && room.bedCount && Number(room.bedCount) > 0;
}

function getSharingLabel(bedCount: string) {
  const beds = Number(bedCount);
  if (!Number.isFinite(beds) || beds < 1) return "";
  if (beds === 1) return "Single sharing";
  return `${beds} sharing`;
}

export default function CreateHostelPage() {
  return (
    <Suspense fallback={<CreateHostelLoadingState />}>
      <CreateHostelPageContent />
    </Suspense>
  );
}

function CreateHostelPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("mode") === "edit";
  const autoSetup = searchParams.get("autoSetup") === "1";
  const invitePgName = searchParams.get("pgName") ?? "";
  const inviteAddress = searchParams.get("address") ?? "";
  const [editingHostelId, setEditingHostelId] = useState<string | null>(null);
  const [hostelName, setHostelName] = useState("");
  const [address, setAddress] = useState("");
  const [hostelType] = useState<"PG" | "RESIDENCE">("PG");
  const [rooms, setRooms] = useState<RoomForm[]>([createRoom()]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [error, setError] = useState("");
  const [createdHostelId, setCreatedHostelId] = useState("");
  const [roomEntries, setRoomEntries] = useState<RoomEntry[]>([]);
  const [currentRoomIdx, setCurrentRoomIdx] = useState(0);
  const [savingTenants, setSavingTenants] = useState(false);
  const [tenantError, setTenantError] = useState("");

  useEffect(() => {
    if (isEditMode || typeof window === "undefined") return;

    if (autoSetup && invitePgName) {
      window.localStorage.removeItem(HOSTEL_DRAFT_KEY);
      setHostelName(invitePgName);
      if (inviteAddress) setAddress(inviteAddress);
      setStep(2);
      return;
    }

    const saved = window.localStorage.getItem(HOSTEL_DRAFT_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as { hostelName?: string; address?: string; rooms?: RoomForm[]; step?: 1 | 2 };
      if (parsed.hostelName) setHostelName(parsed.hostelName);
      if (parsed.address) setAddress(parsed.address);
      if (parsed.rooms?.length) setRooms(parsed.rooms);
      if (parsed.step) setStep(parsed.step);
    } catch {
      window.localStorage.removeItem(HOSTEL_DRAFT_KEY);
    }
  }, [isEditMode, autoSetup, invitePgName, inviteAddress]);

  useEffect(() => {
    if (isEditMode || typeof window === "undefined") return;
    window.localStorage.setItem(HOSTEL_DRAFT_KEY, JSON.stringify({ hostelName, address, rooms, step }));
  }, [address, rooms, hostelName, isEditMode, step]);

  useEffect(() => {
    if (!isEditMode) return;

    let active = true;

    const loadExistingHostel = async () => {
      try {
        const storedHostelId = window.localStorage.getItem("currentHostelId");
        setEditingHostelId(storedHostelId);

        const { data } = await fetchOwnerHostel(storedHostelId);

        if (!active) return;

        if (!data.hostel) {
          router.replace("/owner/create-hostel");
          return;
        }

        // Flatten all floors into a single rooms list
        const allRooms: RoomForm[] = data.hostel.floors.flatMap((floor: { rooms: { id: string; roomNumber: string; bedCount: number }[] }) =>
          floor.rooms.map((room) => ({
            id: room.id,
            roomNumber: room.roomNumber,
            bedCount: String(room.bedCount),
          }))
        );

        setHostelName(data.hostel.hostelName);
        setAddress(data.hostel.address);
        setRooms(allRooms.length > 0 ? allRooms : [createRoom()]);
      } finally {
        if (active) setLoadingExisting(false);
      }
    };

    loadExistingHostel();

    return () => { active = false; };
  }, [isEditMode, router]);

  const updateRoom = (roomId: string, key: keyof RoomForm, value: string) => {
    setRooms((current) => current.map((room) => (room.id === roomId ? { ...room, [key]: value } : room)));
  };

  const handleAddRoom = () => {
    if (saving) return;
    setError("");
    setRooms((current) => [...current, createRoom()]);
  };

  const handleRemoveRoom = (roomId: string) => {
    if (saving) return;
    setError("");
    if (rooms.length === 1) {
      setError("Add at least one room.");
      return;
    }
    setRooms((current) => current.filter((r) => r.id !== roomId));
  };

  const handleSave = async () => {
    setError("");
    if (saving) return;

    if (!hostelName.trim() || !address.trim()) {
      const missingFields = [
        !hostelName.trim() ? "hostel name" : null,
        !address.trim() ? "address" : null,
      ].filter(Boolean);
      setError(`Cannot save hostel yet. Missing: ${missingFields.join(", ")}.`);
      return;
    }

    const cleanedRooms = rooms.filter(
      (room) => room.roomNumber.trim() || (room.bedCount && Number(room.bedCount) > 0),
    );

    if (cleanedRooms.length === 0) {
      setError("Add at least one room before saving.");
      return;
    }

    const hasPartialRoom = cleanedRooms.some(
      (room) => !room.roomNumber.trim() || !room.bedCount || Number(room.bedCount) < 1,
    );
    if (hasPartialRoom) {
      setError("Some rooms are missing a room number or bed count. Fill them in or remove them.");
      return;
    }

    setSaving(true);

    const { response, data } = await saveOwnerHostel({
      hostelId: editingHostelId,
      isEditMode,
      hostelName,
      address,
      type: hostelType,
      floors: [
        {
          id: "floor-1",
          floorLabel: "Floor 1",
          rooms: cleanedRooms.map((room) => ({
            id: room.id,
            roomNumber: room.roomNumber,
            bedCount: hostelType === "RESIDENCE" ? 1 : Number(room.bedCount),
            sharingType: hostelType === "RESIDENCE" ? "Private unit" : getSharingLabel(room.bedCount),
          })),
        },
      ],
    });

    if (!response.ok) {
      setError(data.message ?? "Unable to save hostel.");
      setSaving(false);
      return;
    }

    if (typeof window !== "undefined" && data.hostel?.id) {
      window.localStorage.setItem("currentHostelId", data.hostel.id);
      window.localStorage.removeItem(HOSTEL_DRAFT_KEY);
    }

    if (isEditMode) {
      window.location.href = "/owner/dashboard";
      return;
    }

    const entries: RoomEntry[] = cleanedRooms.map((room) => {
      const count = Math.max(1, Number(room.bedCount) || 1);
      return {
        roomId: room.id, roomNumber: room.roomNumber, bedCount: count,
        beds: Array.from({ length: count }, () => ({ name: "", phone: "", date: "", skipped: false })),
        floorLabel: "Floor 1", floorIndex: 0, skipped: false,
      };
    });
    setCreatedHostelId(data.hostel?.id ?? "");
    setRoomEntries(entries);
    setCurrentRoomIdx(0);
    setSaving(false);
    setStep(3);
  };

  const handleNextFromBasics = () => {
    setError("");
    if (!hostelName.trim() || !address.trim()) {
      const missingFields = [
        !hostelName.trim() ? "hostel name" : null,
        !address.trim() ? "address" : null,
      ].filter(Boolean);
      setError(`Complete ${missingFields.join(" and ")} before continuing.`);
      return;
    }
    setStep(2);
  };

  const updateBed = (roomIdx: number, bedIdx: number, field: keyof BedEntry, value: string | boolean) => {
    setRoomEntries(prev => prev.map((r, ri) =>
      ri !== roomIdx ? r : { ...r, beds: r.beds.map((b, bi) => bi !== bedIdx ? b : { ...b, [field]: value }) }
    ));
  };

  const handleRoomNext = async () => {
    setTenantError("");
    const room = roomEntries[currentRoomIdx];
    if (!room.skipped) {
      setSavingTenants(true);
      const today = new Date().toISOString().split("T")[0];
      for (let i = 0; i < room.beds.length; i++) {
        const bed = room.beds[i];
        if (bed.skipped || !bed.name.trim() || !bed.phone.trim()) continue;
        const fd = new FormData();
        fd.append("tenantType", "old");
        fd.append("fullName", bed.name.trim());
        fd.append("phone", bed.phone.trim());
        fd.append("hostelId", createdHostelId);
        fd.append("floorNumber", String(room.floorIndex + 1));
        fd.append("roomNumber", room.roomNumber);
        fd.append("moveInDate", bed.date || today);
        fd.append("monthlyRent", "0");
        fd.append("rentPaid", "0");
        fd.append("paidOnDate", bed.date || today);
        fd.append("sharingType", room.bedCount === 1 ? "Single sharing" : `${room.bedCount} sharing`);
        fd.append("propertyType", "PG");
        fd.append("bedId", `${room.roomId}-bed-${i + 1}`);
        fd.append("bedLabel", `Bed ${i + 1}`);
        try { await fetch("/api/tenants", { method: "POST", body: fd }); } catch { /* skip failed */ }
      }
      setSavingTenants(false);
    }
    if (currentRoomIdx < roomEntries.length - 1) {
      setCurrentRoomIdx(c => c + 1);
    } else {
      window.location.href = "/owner/dashboard";
    }
  };

  if (loadingExisting) return <CreateHostelLoadingState />;

  const completedRooms = rooms.filter(isRoomComplete).length;

  return (
    <div className="space-y-3">
      <OwnerPageHero
        eyebrow={step === 3 ? "Add tenants" : isEditMode ? "Edit hostel" : "Create hostel"}
        title={step === 3 ? "Who's already living here?" : isEditMode ? "Update your hostel setup" : "Set up your hostel"}
        description={step === 3 ? "Add existing tenants room by room. Skip any bed or room that's empty." : "Add the basics first, then set up your rooms. Draft progress saves automatically while you work."}
        badge={<span className="inline-flex rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold text-white/70">Step {step} of 3</span>}
      />

      {step !== 3 && (
        <div className="grid gap-2.5 sm:grid-cols-3">
          <OwnerQuickStat label="Rooms" value={String(rooms.length)} helper="Current setup draft" />
          <OwnerQuickStat label="Completed rooms" value={String(completedRooms)} helper="Ready to save" />
          <OwnerQuickStat label="Mode" value={isEditMode ? "Editing" : "New hostel"} helper="Draft autosave enabled" />
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-[color:var(--error)] bg-[color:var(--error-soft)] px-3 py-2.5 text-sm font-medium text-[color:var(--error)]">
          {error}
        </div>
      ) : null}

      {step !== 3 && (
        <Card className={`rounded-[18px] p-3 ${ownerSubtlePanelClass}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <WizardPill label="1. Basics" active={step === 1} done={step > 1} />
              <WizardPill label="2. Rooms" active={step === 2} done={step > 2} />
              <WizardPill label="3. Tenants" active={false} done={false} />
            </div>
            <p className="text-[11px] text-[color:var(--fg-secondary)]">
              {step === 1 ? "Start with the name and address." : "Add all your rooms."}
            </p>
          </div>
        </Card>
      )}

      {step === 1 ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_340px]">
          <Card className={`overflow-hidden rounded-[22px] ${ownerPanelClass}`}>
            <div className="border-b border-[color:var(--border)] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[color:var(--brand-soft)] p-2.5 text-[#9edcff]">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Hostel Basics</h2>
                  <p className="text-[11px] text-[color:var(--fg-secondary)]">Only the fields you actually need: hostel name and address.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-2">
              <Field label="Hostel Name">
                <div className={`flex items-center gap-3 rounded-2xl px-3 py-3 shadow-sm ${ownerInputClass}`}>
                  <Building2 className="h-4 w-4 shrink-0 text-[#9edcff]" />
                  <input
                    value={hostelName}
                    onChange={(event) => setHostelName(event.target.value)}
                    disabled={saving}
                    placeholder="Enter hostel name"
                    className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-[color:var(--fg-secondary)]"
                  />
                </div>
              </Field>
              <Field label="Address">
                <div className={`flex items-center gap-3 rounded-2xl px-3 py-3 shadow-sm ${ownerInputClass}`}>
                  <MapPin className="h-4 w-4 shrink-0 text-[#9edcff]" />
                  <input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    disabled={saving}
                    placeholder="Enter hostel address"
                    className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-[color:var(--fg-secondary)]"
                  />
                  <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--fg-secondary)]" />
                </div>
              </Field>
            </div>

            <div className="px-4 pb-4 sm:px-5">
              <Field label="Property Type">
                <div className="flex gap-2 pt-0.5">
                  <div className="flex-1 rounded-2xl border border-[color:color-mix(in_srgb,var(--brand)_42%,transparent)] bg-[color:var(--brand-soft)] px-4 py-3 text-[13px] font-semibold text-[#9edcff] shadow-sm">
                    <p>Hostel / PG</p>
                    <p className="mt-0.5 text-[11px] font-normal text-[color:var(--fg-secondary)]">Bed-based sharing rooms</p>
                  </div>
                </div>
              </Field>
            </div>

            <div className="flex flex-col gap-2 border-t border-[color:var(--border)] px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={saving}
                onClick={() => router.push("/owner/dashboard")}
              >
                Cancel
              </Button>
              <Button
                className="w-full bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] text-[#1b1207] shadow-[0_18px_38px_rgba(240,175,47,0.22)] hover:brightness-105 sm:w-auto"
                disabled={saving}
                onClick={handleNextFromBasics}
              >
                Continue
              </Button>
            </div>
          </Card>

          <Card className={`rounded-[22px] p-4 ${ownerPanelClass}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Setup snapshot</p>
            <div className="mt-3 space-y-2.5">
              <div className={`rounded-[16px] px-3 py-3 ${ownerSubtlePanelClass}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Current hostel</p>
                <p className="mt-1 text-sm font-semibold text-white">{hostelName.trim() || "Not named yet"}</p>
              </div>
              <div className={`rounded-[16px] px-3 py-3 ${ownerSubtlePanelClass}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Address</p>
                <p className="mt-1 text-sm text-white">{address.trim() || "Add the hostel address to continue"}</p>
              </div>
              <div className={`rounded-[16px] px-3 py-3 ${ownerSubtlePanelClass}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Property type</p>
                <p className="mt-1 text-sm font-semibold text-white">Hostel / PG</p>
                <p className="mt-1 text-[11px] text-[color:var(--fg-secondary)]">Shared-room setup that matches your current management flow.</p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 2 ? (
        <Card className={`overflow-hidden rounded-[22px] ${ownerPanelClass}`}>
          <div className="border-b border-[color:var(--border)] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[color:var(--brand-soft)] p-2.5 text-[#9edcff]">
                <Home className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Room Setup</h2>
                <p className="text-[11px] text-[color:var(--fg-secondary)]">Add room number and bed count for each room in your hostel.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 px-4 py-4 sm:px-5">
            {rooms.map((room, index) => (
              <div
                key={room.id}
                className={`rounded-[14px] border border-[color:var(--border)] px-3 py-3 ${ownerSubtlePanelClass}`}
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">
                    Room {index + 1}
                  </span>
                  {rooms.length > 1 && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleRemoveRoom(room.id)}
                      className="flex items-center gap-1 text-[11px] font-medium text-[color:var(--error)] hover:opacity-80 transition disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Room Number">
                    <input
                      value={room.roomNumber}
                      onChange={(e) => updateRoom(room.id, "roomNumber", e.target.value)}
                      disabled={saving}
                      placeholder="Ex: 101"
                      className={`w-full rounded-2xl px-3 py-2.5 text-[13px] outline-none shadow-sm ${ownerInputClass}`}
                    />
                  </Field>
                  <Field label="Number of Beds">
                    <input
                      type="number"
                      min="1"
                      value={room.bedCount}
                      onChange={(e) => updateRoom(room.id, "bedCount", e.target.value)}
                      disabled={saving}
                      placeholder="Ex: 3"
                      className={`w-full rounded-2xl px-3 py-2.5 text-[13px] outline-none shadow-sm ${ownerInputClass}`}
                    />
                  </Field>
                </div>
              </div>
            ))}

            <Button
              variant="secondary"
              className="w-full rounded-2xl border-dashed border-[color:var(--border)] text-[color:var(--fg-secondary)]"
              disabled={saving}
              onClick={handleAddRoom}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </div>

          <div className="flex flex-col gap-2 border-t border-[color:var(--border)] px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={() => setStep(1)}
            >
              Back
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={() => router.push("/owner/dashboard")}
            >
              Cancel
            </Button>
            <Button
              className="w-full bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] text-[#1b1207] shadow-[0_18px_38px_rgba(240,175,47,0.22)] hover:brightness-105 sm:w-auto"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving..." : isEditMode ? "Update Hostel" : "Save Hostel"}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (() => {
        const room = roomEntries[currentRoomIdx];
        if (!room) return null;
        const isLast = currentRoomIdx === roomEntries.length - 1;
        return (
          <Card className={`overflow-hidden rounded-[22px] ${ownerPanelClass}`}>
            <div className="border-b border-[color:var(--border)] px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[#f59e0b]/12 p-2.5 text-[#fcd34d]">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Add Existing Tenants</h2>
                    <p className="text-[11px] text-[color:var(--fg-secondary)]">
                      Room {currentRoomIdx + 1} of {roomEntries.length} — fill in or skip each bed
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { window.location.href = "/owner/dashboard"; }}
                  className="text-[11px] font-medium text-white/40 hover:text-white/70 transition"
                >
                  Skip all → Dashboard
                </button>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="mt-0.5 text-base font-semibold text-white">
                    Room {room.roomNumber} · {room.bedCount} {room.bedCount === 1 ? "bed" : "beds"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRoomEntries(prev => prev.map((r, i) => i === currentRoomIdx ? { ...r, skipped: true } : r));
                    if (isLast) { window.location.href = "/owner/dashboard"; }
                    else setCurrentRoomIdx(c => c + 1);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/50 hover:text-white/80 transition"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip room
                </button>
              </div>

              <div className="space-y-2.5">
                {room.beds.map((bed, bi) => (
                  <div
                    key={bi}
                    className={`rounded-[12px] border p-3 transition ${bed.skipped ? "border-white/6 bg-white/[0.02] opacity-50" : "border-[color:var(--border)] bg-[color:var(--surface-soft)]"}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">
                        Bed {bi + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateBed(currentRoomIdx, bi, "skipped", !bed.skipped)}
                        className={`text-[11px] font-medium transition ${bed.skipped ? "text-[#fcd34d] hover:text-[#ffd983]" : "text-white/35 hover:text-white/60"}`}
                      >
                        {bed.skipped ? "Undo skip" : "Skip bed"}
                      </button>
                    </div>
                    {!bed.skipped && (
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                          <input
                            type="text"
                            value={bed.name}
                            onChange={e => updateBed(currentRoomIdx, bi, "name", e.target.value)}
                            placeholder="Tenant name"
                            disabled={savingTenants}
                            className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 pl-8 text-[13px] text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50"
                          />
                        </div>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                          <input
                            type="tel"
                            inputMode="numeric"
                            value={bed.phone}
                            onChange={e => updateBed(currentRoomIdx, bi, "phone", e.target.value.replace(/\D/g, ""))}
                            placeholder="Phone number"
                            disabled={savingTenants}
                            className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 pl-8 text-[13px] text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50"
                          />
                        </div>
                        <input
                          type="date"
                          value={bed.date}
                          onChange={e => updateBed(currentRoomIdx, bi, "date", e.target.value)}
                          disabled={savingTenants}
                          className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-[#f2bb4d]/50 [color-scheme:dark]"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {tenantError ? (
                <div className="mt-3 rounded-xl border border-[color:var(--error)] bg-[color:var(--error-soft)] px-3 py-2 text-sm text-[color:var(--error)]">
                  {tenantError}
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between border-t border-[color:var(--border)] pt-4">
                <button
                  type="button"
                  disabled={currentRoomIdx === 0 || savingTenants}
                  onClick={() => setCurrentRoomIdx(c => c - 1)}
                  className="text-[13px] font-medium text-white/40 hover:text-white/70 transition disabled:opacity-30"
                >
                  ← Previous room
                </button>
                <button
                  type="button"
                  disabled={savingTenants}
                  onClick={() => void handleRoomNext()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-5 text-[13px] font-semibold text-[#1b1207] shadow-[0_14px_30px_rgba(240,175,47,0.22)] transition hover:brightness-105 disabled:opacity-60"
                >
                  {savingTenants ? "Saving…" : isLast ? "Finish & Go to Dashboard" : `Next Room →`}
                  {!savingTenants && <ArrowRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </Card>
        );
      })() : null}
    </div>
  );
}

function CreateHostelLoadingState() {
  return (
    <div className="space-y-3">
      <Card className="nestiq-grid-bg overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_30%),linear-gradient(180deg,#111114_0%,#09090b_100%)] p-5">
        <div className="h-20 animate-pulse rounded-[18px] bg-white/6" />
      </Card>
      <Card className={`p-4 text-center text-sm text-[color:var(--fg-secondary)] ${ownerPanelClass}`}>
        Loading hostel details...
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-[color:var(--fg-secondary)]">{label}</span>
      {children}
    </label>
  );
}

function WizardPill({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center rounded-full px-3 py-2 text-[11px] font-semibold shadow-sm ${
        active
          ? "border border-[#f2bb4d]/50 bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] text-[#1b1207] shadow-[0_14px_32px_rgba(240,175,47,0.26)]"
          : done
            ? "border border-[#4ade80]/30 bg-[#22c55e]/10 text-[#4ade80]"
            : "border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-secondary)]"
      }`}
    >
      {label}
    </div>
  );
}
