"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banknote, Building2, ChevronRight, CreditCard, Home, MapPin, Phone, Plus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OwnerPageHero, OwnerQuickStat } from "@/components/ui/owner-page";
import { ownerInputClass, ownerPanelClass, ownerSubtlePanelClass } from "@/components/ui/owner-theme";
import { saveOwnerHostel } from "@/services/owner/owner-hostels.service";
import { csrfFetch } from "@/lib/csrf-client";
import { getSharingLabel } from "@/utils/hostel-occupancy";
import { useHostelContext } from "@/store/hostel-context";

const HOSTEL_DRAFT_KEY = "owner-create-hostel-draft-v1";

type BedForm = {
  name: string;
  phone: string;
  rent: string;
  date: string;
  idNumber: string;
  billingCycle: "daily" | "weekly" | "monthly";
  skipped: boolean;
};

type RoomForm = {
  id: string;
  roomNumber: string;
  bedCount: string;
  beds: BedForm[];
};

function createBed(): BedForm {
  return { name: "", phone: "", rent: "", date: new Date().toISOString().split("T")[0], idNumber: "", billingCycle: "monthly" as const, skipped: false };
}

function createRoom(): RoomForm {
  return {
    id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    roomNumber: "",
    bedCount: "",
    beds: [],
  };
}

function isRoomComplete(room: RoomForm) {
  return room.roomNumber.trim() && room.bedCount && Number(room.bedCount) > 0;
}

function syncBeds(current: BedForm[], count: number): BedForm[] {
  if (count <= 0) return [];
  if (current.length === count) return current;
  if (current.length > count) return current.slice(0, count);
  return [...current, ...Array.from({ length: count - current.length }, createBed)];
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
  const { refreshHostels, currentHostel, loading: hostelLoading } = useHostelContext();
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
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [error, setError] = useState("");

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
    if (hostelLoading) return;
    if (!loadingExisting) return;

    if (!currentHostel) {
      router.replace("/owner/create-hostel");
      return;
    }

    setEditingHostelId(currentHostel.id);
    const allRooms: RoomForm[] = currentHostel.floors.flatMap((floor) =>
      floor.rooms.map((room) => ({
        id: room.id,
        roomNumber: room.roomNumber,
        bedCount: String(room.bedCount),
        beds: syncBeds([], room.bedCount),
      }))
    );
    setHostelName(currentHostel.hostelName);
    setAddress(currentHostel.address);
    setRooms(allRooms.length > 0 ? allRooms : [createRoom()]);
    setLoadingExisting(false);
  }, [isEditMode, hostelLoading, currentHostel, loadingExisting, router]);

  const updateRoomField = (roomId: string, key: "roomNumber" | "bedCount", value: string) => {
    setRooms((current) =>
      current.map((room) => {
        if (room.id !== roomId) return room;
        if (key === "bedCount") {
          const count = Math.max(0, parseInt(value, 10) || 0);
          return { ...room, bedCount: value, beds: syncBeds(room.beds, count) };
        }
        return { ...room, [key]: value };
      })
    );
  };

  const updateBed = (roomId: string, bedIdx: number, field: keyof BedForm, value: string | boolean) => {
    setRooms((current) =>
      current.map((room) =>
        room.id !== roomId
          ? room
          : { ...room, beds: room.beds.map((b, i) => (i !== bedIdx ? b : { ...b, [field]: value })) }
      )
    );
  };

  const handleAddRoom = () => {
    if (saving) return;
    setError("");
    setRooms((current) => [...current, createRoom()]);
  };

  const handleRemoveRoom = (roomId: string) => {
    if (saving) return;
    setError("");
    if (rooms.length === 1) { setError("Add at least one room."); return; }
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

    if (cleanedRooms.length === 0) { setError("Add at least one room before saving."); return; }

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

    const hostelId = data.hostel?.id ?? editingHostelId ?? "";
    const savedRooms = data.hostel?.floors.flatMap((floor) => floor.rooms) ?? [];
    if (typeof window !== "undefined" && hostelId) {
      window.localStorage.setItem("currentHostelId", hostelId);
      window.localStorage.removeItem(HOSTEL_DRAFT_KEY);
    }

    // Submit tenants for all filled beds
    if (!isEditMode) {
      const today = new Date().toISOString().split("T")[0];
      const tenantRequests: Promise<{ ok: boolean; label: string; message?: string }>[] = [];

      cleanedRooms.forEach((room) => {
        room.beds.forEach((bed, bedIdx) => {
          if (bed.skipped || !bed.name.trim()) return;
          const savedRoom = savedRooms.find((item) => item.id === room.id || item.roomNumber === room.roomNumber);
          const unitId = savedRoom?.unitId ?? savedRoom?.id;
          const savedBed = savedRoom?.beds?.[bedIdx];
          const bedId = savedBed?.id ?? (unitId ? `${unitId}-bed-${bedIdx + 1}` : undefined);
          const bedLabel = savedBed?.label ?? `Bed ${bedIdx + 1}`;
          const moveInDate = bed.date || today;
          const label = `${bed.name.trim()} (Room ${room.roomNumber}, Bed ${bedIdx + 1})`;
          const payload = {
            fullName: bed.name.trim(),
            phone: bed.phone.trim() || undefined,
            hostelId,
            floorNumber: 1,
            roomNumber: room.roomNumber,
            moveInDate,
            monthlyRent: Number(bed.rent.trim()) || 0,
            rentPaid: 0,
            paidOnDate: moveInDate,
            billingCycle: bed.billingCycle,
            sharingType: Number(room.bedCount) === 1 ? "Single sharing" : `${room.bedCount} sharing`,
            propertyType: "PG",
            bedId,
            bedLabel,
            idNumber: bed.idNumber.trim() || undefined,
          };
          tenantRequests.push(
            csrfFetch("/api/tenants", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
              .then(async (res) => {
                const data = (await res.json().catch(() => ({}))) as { message?: string };
                return { ok: res.ok, label, message: data.message };
              })
              .catch((err) => ({
                ok: false,
                label,
                message: err instanceof Error ? err.message : "Network request failed.",
              }))
          );
        });
      });

      const results = await Promise.allSettled(tenantRequests);
      const failed = results
        .filter((r): r is PromiseFulfilledResult<{ ok: boolean; label: string; message?: string }> => r.status === "fulfilled" && !r.value.ok)
        .map((r) => `${r.value.label}: ${r.value.message ?? "Tenant was not created."}`);

      const crashed = results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => (r.reason instanceof Error ? r.reason.message : "Unexpected tenant save error."));

      if (failed.length > 0 || crashed.length > 0) {
        setSaving(false);
        setError(`Hostel saved, but tenant save failed. ${[...failed, ...crashed].join(" | ")}`);
        return;
      }
    }

    await refreshHostels();
    router.replace("/owner/dashboard");
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

  if (loadingExisting) return <CreateHostelLoadingState />;

  const completedRooms = rooms.filter(isRoomComplete).length;

  return (
    <div className="w-full min-w-0 space-y-3">
      <OwnerPageHero
        eyebrow={isEditMode ? "Edit hostel" : "Create hostel"}
        title={isEditMode ? "Update your hostel setup" : "Set up your hostel"}
        description="Add the basics first, then set up rooms and any existing tenants. Draft saves automatically."
        badge={<span className="inline-flex rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold text-white/70">Step {step} of 2</span>}
      />

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <OwnerQuickStat label="Rooms" value={String(rooms.length)} helper="Current setup draft" />
        <OwnerQuickStat label="Completed rooms" value={String(completedRooms)} helper="Ready to save" />
        <OwnerQuickStat label="Mode" value={isEditMode ? "Editing" : "New hostel"} helper="Draft autosave enabled" />
      </div>

      {error ? (
        <div className="rounded-xl border border-[color:var(--error)] bg-[color:var(--error-soft)] px-3 py-2.5 text-sm font-medium text-[color:var(--error)]">
          {error}
        </div>
      ) : null}

      <Card className={`rounded-[18px] p-3 ${ownerSubtlePanelClass}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <WizardPill label="1. Basics" active={step === 1} done={step > 1} />
            <WizardPill label="2. Rooms & Tenants" active={step === 2} done={false} />
          </div>
          <p className="text-[11px] text-[color:var(--fg-secondary)]">
            {step === 1 ? "Start with the name and address." : "Add rooms and existing tenants."}
          </p>
        </div>
      </Card>

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
                  <p className="text-[11px] text-[color:var(--fg-secondary)]">Hostel name and address.</p>
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
                <p className="mt-1 text-[11px] text-[color:var(--fg-secondary)]">Shared-room setup.</p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 2 ? (
        <Card className={`overflow-hidden rounded-[22px] ${ownerPanelClass}`}>
          <div className="border-b border-[color:var(--border)] px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-2xl bg-[color:var(--brand-soft)] p-2.5 text-[#9edcff]">
                <Home className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white">Rooms & Existing Tenants</h2>
                <p className="text-[11px] text-[color:var(--fg-secondary)]">
                  Add each room with bed count. Fill in existing tenants per bed — all optional, skip any empty bed.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4 sm:px-5">
            {rooms.map((room, roomIndex) => {
              const bedCount = Math.max(0, parseInt(room.bedCount, 10) || 0);
              return (
                <div
                  key={room.id}
                  className={`rounded-[16px] border border-[color:var(--border)] ${ownerSubtlePanelClass}`}
                >
                  {/* Room header */}
                  <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[color:var(--border)] px-3 py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">
                      Room {roomIndex + 1}
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

                  {/* Room fields */}
                  <div className="grid gap-2 px-3 py-3 sm:grid-cols-2">
                    <Field label="Room Number">
                      <input
                        value={room.roomNumber}
                        onChange={(e) => updateRoomField(room.id, "roomNumber", e.target.value)}
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
                        onChange={(e) => updateRoomField(room.id, "bedCount", e.target.value)}
                        disabled={saving}
                        placeholder="Ex: 3"
                        className={`w-full rounded-2xl px-3 py-2.5 text-[13px] outline-none shadow-sm ${ownerInputClass}`}
                      />
                    </Field>
                  </div>

                  {/* Inline bed / tenant entry */}
                  {bedCount > 0 && !isEditMode && (
                    <div className="border-t border-[color:var(--border)] px-3 pb-3">
                      <p className="mb-2 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">
                        Existing tenants — optional, skip any empty bed
                      </p>
                      <div className="space-y-2">
                        {room.beds.map((bed, bedIdx) => (
                          <div
                            key={bedIdx}
                            className={`rounded-[10px] border px-3 py-2.5 transition ${
                              bed.skipped
                                ? "border-white/6 bg-white/[0.02] opacity-40"
                                : "border-[color:var(--border)] bg-[color:var(--surface-soft)]"
                            }`}
                          >
                            <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">
                                Bed {bedIdx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateBed(room.id, bedIdx, "skipped", !bed.skipped)}
                                className={`text-[11px] font-medium transition ${
                                  bed.skipped ? "text-[#fcd34d] hover:text-[#ffd983]" : "text-white/35 hover:text-white/60"
                                }`}
                              >
                                {bed.skipped ? "Undo skip" : "Skip bed"}
                              </button>
                            </div>
                            {!bed.skipped && (
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="relative">
                                  <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                                  <input
                                    type="text"
                                    value={bed.name}
                                    onChange={(e) => updateBed(room.id, bedIdx, "name", e.target.value)}
                                    placeholder="Tenant name"
                                    disabled={saving}
                                    className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 pl-8 text-[13px] text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50"
                                  />
                                </div>
                                <div className="relative">
                                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                                  <input
                                    type="tel"
                                    inputMode="numeric"
                                    value={bed.phone}
                                    onChange={(e) => updateBed(room.id, bedIdx, "phone", e.target.value.replace(/\D/g, ""))}
                                    placeholder="Phone number"
                                    disabled={saving}
                                    className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 pl-8 text-[13px] text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50"
                                  />
                                </div>
                                <div className="relative">
                                  <Banknote className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    value={bed.rent}
                                    onChange={(e) => updateBed(room.id, bedIdx, "rent", e.target.value)}
                                    placeholder="Monthly rent (Rs)"
                                    disabled={saving}
                                    className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 pl-8 text-[13px] text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50"
                                  />
                                </div>
                                <input
                                  type="date"
                                  value={bed.date}
                                  onChange={(e) => updateBed(room.id, bedIdx, "date", e.target.value)}
                                  disabled={saving}
                                  className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-[#f2bb4d]/50 [color-scheme:dark]"
                                />
                                <div className="relative">
                                  <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                                  <input
                                    type="text"
                                    value={bed.idNumber}
                                    onChange={(e) => updateBed(room.id, bedIdx, "idNumber", e.target.value.toUpperCase())}
                                    placeholder="ID number (optional)"
                                    disabled={saving}
                                    className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 pl-8 text-[13px] text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50"
                                  />
                                </div>
                                <div className="sm:col-span-2 lg:col-span-3">
                                  <p className="mb-1.5 text-[10px] font-medium text-white/40">Billing cycle</p>
                                  <div className="flex gap-1.5">
                                    {(["daily", "weekly", "monthly"] as const).map((cycle) => (
                                      <button
                                        key={cycle}
                                        type="button"
                                        disabled={saving}
                                        onClick={() => updateBed(room.id, bedIdx, "billingCycle", cycle)}
                                        className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-medium capitalize transition ${
                                          bed.billingCycle === cycle
                                            ? "bg-[#f2bb4d]/20 border border-[#f2bb4d]/50 text-[#f2bb4d]"
                                            : "border border-white/10 bg-white/[0.03] text-white/40 hover:text-white/60"
                                        }`}
                                      >
                                        {cycle}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

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
    </div>
  );
}

function CreateHostelLoadingState() {
  return (
    <div className="space-y-3">
      <Card className="nestiq-grid-bg overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_30%),linear-gradient(180deg,#111114_0%,#09090b_100%)] p-3 sm:p-4">
        <div className="h-20 animate-pulse rounded-[18px] bg-white/6" />
      </Card>
      <Card className={`p-4 text-center text-sm text-[color:var(--fg-secondary)] ${ownerPanelClass}`}>
        Loading hostel details...
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-[color:var(--fg-secondary)]">{label}</span>
      {children}
    </label>
  );
}

function WizardPill({ label, active, done }: { label: string; active: boolean; done: boolean }) {
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
