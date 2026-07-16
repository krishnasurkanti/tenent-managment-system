"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banknote, Building2, ChevronRight, CreditCard, Home, MapPin, Phone, Plus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ownerInputClass, ownerSubtlePanelClass } from "@/components/ui/owner-theme";
import { saveOwnerHostel } from "@/services/owner/owner-hostels.service";
import { csrfFetch } from "@/lib/csrf-client";
import { getSharingLabel } from "@/utils/hostel-occupancy";
import { useHostelContext } from "@/store/hostel-context";
import { PricingCarousel } from "@/components/ui/pricing-carousel";
import { requestOwnerPlanUpgrade } from "@/services/owner/owner-billing.service";
import type { PlanId } from "@/config/pricing";

const HOSTEL_DRAFT_KEY = "owner-create-hostel-draft-v1";

// Shared token input for the per-bed grid.
const BED_INPUT = "w-full rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-2 text-[13px] text-[color:var(--fg-primary)] outline-none placeholder:text-[color:var(--fg-tertiary)] focus:border-[color:color-mix(in_srgb,var(--brand)_60%,transparent)]";

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
  return { id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, roomNumber: "", bedCount: "", beds: [] };
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
  const [hostelType, setHostelType] = useState<"PG" | "RESIDENCE">("PG");
  const [rooms, setRooms] = useState<RoomForm[]>([createRoom()]);
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [pageStep, setPageStep] = useState<"setup" | "pricing">("setup");
  const [submittingPlanId, setSubmittingPlanId] = useState<PlanId | null>(null);
  const [savedHostelId, setSavedHostelId] = useState<string>("");
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
    const allRooms: RoomForm[] = currentHostel.rooms.map((room) => ({
      id: room.id,
      roomNumber: room.roomNumber,
      bedCount: String(room.bedCount),
      beds: syncBeds([], room.bedCount),
    }));
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
      }),
    );
  };

  const updateBed = (roomId: string, bedIdx: number, field: keyof BedForm, value: string | boolean) => {
    setRooms((current) =>
      current.map((room) =>
        room.id !== roomId ? room : { ...room, beds: room.beds.map((b, i) => (i !== bedIdx ? b : { ...b, [field]: value })) },
      ),
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
      const missingFields = [!hostelName.trim() ? "hostel name" : null, !address.trim() ? "address" : null].filter(Boolean);
      setError(`Cannot save hostel yet. Missing: ${missingFields.join(", ")}.`);
      return;
    }

    const cleanedRooms = rooms.filter((room) => room.roomNumber.trim() || (room.bedCount && Number(room.bedCount) > 0));
    if (cleanedRooms.length === 0) { setError("Add at least one room before saving."); return; }

    const hasPartialRoom = cleanedRooms.some((room) => !room.roomNumber.trim() || !room.bedCount || Number(room.bedCount) < 1);
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
      rooms: cleanedRooms.map((room) => ({
        id: room.id,
        roomNumber: room.roomNumber,
        bedCount: hostelType === "RESIDENCE" ? 1 : Number(room.bedCount),
        sharingType: hostelType === "RESIDENCE" ? "Private unit" : getSharingLabel(room.bedCount),
      })),
    });

    if (!response.ok) {
      setError(data.message ?? "Unable to save hostel.");
      setSaving(false);
      return;
    }

    const hostelId = data.hostel?.id ?? editingHostelId ?? "";
    const savedRooms = data.hostel?.rooms ?? [];
    if (typeof window !== "undefined" && hostelId) {
      window.localStorage.setItem("currentHostelId", hostelId);
      window.localStorage.removeItem(HOSTEL_DRAFT_KEY);
    }
    setSavedHostelId(hostelId);

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
            csrfFetch("/api/tenants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
              .then(async (res) => {
                const data = (await res.json().catch(() => ({}))) as { message?: string };
                return { ok: res.ok, label, message: data.message };
              })
              .catch((err) => ({ ok: false, label, message: err instanceof Error ? err.message : "Network request failed." })),
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
    if (!isEditMode) setPageStep("pricing");
    else router.replace("/owner/dashboard");
  };

  const handlePlanSelect = async (planId: PlanId) => {
    setSubmittingPlanId(planId);
    try {
      if (planId !== "free" && savedHostelId) {
        const { response } = await requestOwnerPlanUpgrade(savedHostelId, "free", planId);
        if (!response.ok) {
          setError("Plan upgrade failed. You can update your plan from the dashboard settings.");
          return;
        }
      }
    } catch {
      setError("Unable to process plan upgrade. You can update your plan from the dashboard settings.");
      return;
    } finally {
      setSubmittingPlanId(null);
    }
    router.replace("/owner/dashboard");
  };

  const handleNextFromBasics = () => {
    setError("");
    if (!hostelName.trim() || !address.trim()) {
      const missingFields = [!hostelName.trim() ? "hostel name" : null, !address.trim() ? "address" : null].filter(Boolean);
      setError(`Complete ${missingFields.join(" and ")} before continuing.`);
      return;
    }
    setStep(2);
  };

  if (loadingExisting) return <CreateHostelLoadingState />;

  if (pageStep === "pricing") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-[720px]">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color:var(--success-soft)] px-3.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--success)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--success)]">Hostel saved</span>
            </div>
            <h2 className="font-display mt-3 text-2xl font-bold text-[color:var(--fg-primary)] sm:text-3xl">Choose your plan</h2>
            <p className="mt-1.5 text-sm text-[color:var(--fg-secondary)]">Swipe to compare. Pick what fits — you can change anytime.</p>
          </div>
          <PricingCarousel currentPlanId="free" onSelect={handlePlanSelect} onSkip={() => router.replace("/owner/dashboard")} submittingPlanId={submittingPlanId} onboardingMode />
        </div>
      </div>
    );
  }

  const completedRooms = rooms.filter(isRoomComplete).length;

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">{isEditMode ? "Edit hostel" : "Create hostel"}</p>
          <h1 className="font-display mt-0.5 text-[clamp(1.35rem,4.5vw,1.75rem)] font-bold text-[color:var(--fg-primary)]">{isEditMode ? "Update your hostel setup" : "Set up your hostel"}</h1>
          <p className="text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">Basics first, then rooms and tenants. Draft saves automatically.</p>
        </div>
        <span className="mt-1 shrink-0 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-1 text-[11px] font-semibold text-[color:var(--fg-secondary)]">Step {step} of 2</span>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <StatCard label="Rooms" value={rooms.length} helper="Draft" />
        <StatCard label="Completed" value={completedRooms} helper="Ready to save" tone={completedRooms ? "success" : "plain"} />
        <StatCard label="Mode" value={isEditMode ? "Editing" : "New"} helper="Autosave on" />
      </div>

      {error ? (
        <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-3 py-2.5 text-sm font-medium text-[color:var(--error)]">{error}</div>
      ) : null}

      <Card className="p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <WizardPill label="1. Basics" active={step === 1} done={step > 1} onClick={step === 2 ? () => setStep(1) : undefined} />
            <WizardPill label="2. Rooms & Tenants" active={step === 2} done={false} onClick={step === 1 ? handleNextFromBasics : undefined} />
          </div>
          <p className="text-[11px] text-[color:var(--fg-secondary)]">{step === 1 ? "Start with the name and address." : "Add rooms and existing tenants."}</p>
        </div>
      </Card>

      {step === 1 ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_340px]">
          <Card className="overflow-hidden">
            <div className="border-b border-[color:var(--border)] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]"><Building2 size={16} /></span>
                <div>
                  <h2 className="text-sm font-semibold text-[color:var(--fg-primary)]">Hostel basics</h2>
                  <p className="text-[11px] text-[color:var(--fg-secondary)]">Hostel name and address.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-2">
              <Field label="Hostel name">
                <div className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 ${ownerInputClass}`}>
                  <Building2 className="h-4 w-4 shrink-0 text-[color:var(--accent-electric)]" />
                  <input value={hostelName} onChange={(e) => setHostelName(e.target.value)} disabled={saving} placeholder="Enter hostel name" className="w-full bg-transparent text-[13px] text-[color:var(--fg-primary)] outline-none placeholder:text-[color:var(--fg-tertiary)]" />
                </div>
              </Field>
              <Field label="Address">
                <div className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 ${ownerInputClass}`}>
                  <MapPin className="h-4 w-4 shrink-0 text-[color:var(--accent-electric)]" />
                  <input value={address} onChange={(e) => setAddress(e.target.value)} disabled={saving} placeholder="Enter hostel address" className="w-full bg-transparent text-[13px] text-[color:var(--fg-primary)] outline-none placeholder:text-[color:var(--fg-tertiary)]" />
                  <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--fg-tertiary)]" />
                </div>
              </Field>
            </div>

            <div className="px-4 pb-4 sm:px-5">
              <Field label="Property type">
                <div className="flex gap-2 pt-0.5">
                  {([
                    ["PG", "Hostel / PG", "Bed-based sharing rooms"],
                    ["RESIDENCE", "Residence / Flat", "Private units (1 bed/room)"],
                  ] as const).map(([value, title, sub]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={saving || isEditMode}
                      onClick={() => setHostelType(value)}
                      className={`flex-1 rounded-[var(--radius-md)] border px-4 py-3 text-left text-[13px] font-semibold transition ${
                        hostelType === value
                          ? "border-[color:color-mix(in_srgb,var(--brand)_42%,transparent)] bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]"
                          : "border-[color:var(--border)] bg-transparent text-[color:var(--fg-tertiary)] hover:text-[color:var(--fg-secondary)]"
                      }`}
                    >
                      <p>{title}</p>
                      <p className="mt-0.5 text-[11px] font-normal text-[color:var(--fg-secondary)]">{sub}</p>
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="flex flex-col gap-2 border-t border-[color:var(--border)] px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
              <Button variant="secondary" className="w-full sm:w-auto" disabled={saving} onClick={() => router.push("/owner/dashboard")}>Cancel</Button>
              <Button className="w-full sm:w-auto" disabled={saving} onClick={handleNextFromBasics}>Continue</Button>
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Setup snapshot</p>
            <div className="mt-3 flex flex-col gap-2.5">
              <SnapshotRow label="Current hostel" value={hostelName.trim() || "Not named yet"} />
              <SnapshotRow label="Address" value={address.trim() || "Add the hostel address to continue"} />
              <SnapshotRow label="Property type" value={hostelType === "RESIDENCE" ? "Residence / Flat" : "Hostel / PG"} sub={hostelType === "RESIDENCE" ? "Private units." : "Shared-room setup."} />
            </div>
          </Card>
        </div>
      ) : null}

      {step === 2 ? (
        <Card className="overflow-hidden">
          <div className="border-b border-[color:var(--border)] px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--brand-soft)] text-[color:var(--accent-electric)]"><Home size={16} /></span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[color:var(--fg-primary)]">Rooms &amp; existing tenants</h2>
                <p className="text-[11px] text-[color:var(--fg-secondary)]">Add each room with bed count. Fill existing tenants per bed — all optional, skip any empty bed.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
            {rooms.map((room, roomIndex) => {
              const bedCount = Math.max(0, parseInt(room.bedCount, 10) || 0);
              return (
                <div key={room.id} className={`rounded-[var(--radius-lg)] border border-[color:var(--border)] ${ownerSubtlePanelClass}`}>
                  <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[color:var(--border)] px-3 py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Room {roomIndex + 1}</span>
                    {rooms.length > 1 && (
                      <button type="button" disabled={saving} onClick={() => handleRemoveRoom(room.id)} className="flex items-center gap-1 text-[11px] font-medium text-[color:var(--error)] hover:opacity-80 disabled:opacity-40">
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-2 px-3 py-3 sm:grid-cols-2">
                    <Field label="Room number">
                      <input value={room.roomNumber} onChange={(e) => updateRoomField(room.id, "roomNumber", e.target.value)} disabled={saving} placeholder="Ex: 101" className={`${BED_INPUT} py-2.5`} />
                    </Field>
                    <Field label="Number of beds">
                      <input type="number" min="1" value={room.bedCount} onChange={(e) => updateRoomField(room.id, "bedCount", e.target.value)} disabled={saving} placeholder="Ex: 3" className={`${BED_INPUT} py-2.5`} />
                    </Field>
                  </div>

                  {bedCount > 0 && !isEditMode && (
                    <div className="border-t border-[color:var(--border)] px-3 pb-3">
                      <p className="mb-2 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Existing tenants — optional, skip any empty bed</p>
                      <div className="flex flex-col gap-2">
                        {room.beds.map((bed, bedIdx) => (
                          <div key={bedIdx} className={`rounded-[var(--radius-md)] border px-3 py-2.5 transition ${bed.skipped ? "border-[color:var(--border)] bg-[color:var(--surface-soft)] opacity-40" : "border-[color:var(--border)] bg-[color:var(--surface-soft)]"}`}>
                            <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">Bed {bedIdx + 1}</span>
                              <button type="button" onClick={() => updateBed(room.id, bedIdx, "skipped", !bed.skipped)} className={`text-[11px] font-medium transition ${bed.skipped ? "text-[color:var(--warning)]" : "text-[color:var(--fg-tertiary)] hover:text-[color:var(--fg-secondary)]"}`}>
                                {bed.skipped ? "Undo skip" : "Skip bed"}
                              </button>
                            </div>
                            {!bed.skipped && (
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                <BedInput icon={<User size={14} />} value={bed.name} onChange={(v) => updateBed(room.id, bedIdx, "name", v)} placeholder="Tenant name" disabled={saving} />
                                <BedInput icon={<Phone size={14} />} value={bed.phone} onChange={(v) => updateBed(room.id, bedIdx, "phone", v.replace(/\D/g, ""))} placeholder="Phone number" disabled={saving} type="tel" inputMode="numeric" />
                                <BedInput icon={<Banknote size={14} />} value={bed.rent} onChange={(v) => updateBed(room.id, bedIdx, "rent", v)} placeholder="Monthly rent (Rs)" disabled={saving} type="number" inputMode="numeric" />
                                <input type="date" value={bed.date} onChange={(e) => updateBed(room.id, bedIdx, "date", e.target.value)} disabled={saving} className={`${BED_INPUT} [color-scheme:dark]`} />
                                <BedInput icon={<CreditCard size={14} />} value={bed.idNumber} onChange={(v) => updateBed(room.id, bedIdx, "idNumber", v.toUpperCase())} placeholder="ID number (optional)" disabled={saving} />
                                <div className="sm:col-span-2 lg:col-span-3">
                                  <p className="mb-1.5 text-[10px] font-medium text-[color:var(--fg-tertiary)]">Billing cycle</p>
                                  <div className="flex gap-1.5">
                                    {(["daily", "weekly", "monthly"] as const).map((cycle) => (
                                      <button key={cycle} type="button" disabled={saving} onClick={() => updateBed(room.id, bedIdx, "billingCycle", cycle)}
                                        className={`flex-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-[12px] font-medium capitalize transition ${
                                          bed.billingCycle === cycle
                                            ? "border border-[color:color-mix(in_srgb,var(--brand)_50%,transparent)] bg-[color:var(--brand-soft)] text-[color:var(--accent)]"
                                            : "border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-tertiary)] hover:text-[color:var(--fg-secondary)]"
                                        }`}>
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

            <Button variant="secondary" fullWidth className="border-dashed" disabled={saving} onClick={handleAddRoom}>
              <Plus size={16} /> Add Room
            </Button>
          </div>

          <div className="flex flex-col gap-2 border-t border-[color:var(--border)] px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
            <Button variant="secondary" className="w-full sm:w-auto" disabled={saving} onClick={() => setStep(1)}>Back</Button>
            <Button variant="secondary" className="w-full sm:w-auto" disabled={saving} onClick={() => router.push("/owner/dashboard")}>Cancel</Button>
            <Button className="w-full sm:w-auto" disabled={saving} loading={saving} onClick={() => void handleSave()}>
              {saving ? "Saving…" : isEditMode ? "Update Hostel" : "Save Hostel"}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function BedInput({
  icon, value, onChange, placeholder, disabled, type = "text", inputMode,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled: boolean;
  type?: string;
  inputMode?: "numeric" | "tel";
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--fg-tertiary)]">{icon}</span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={type === "number" ? (e) => { if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault(); } : undefined}
        placeholder={placeholder}
        disabled={disabled}
        className={`${BED_INPUT} pl-8`}
      />
    </div>
  );
}

function SnapshotRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={`rounded-[var(--radius-md)] px-3 py-3 ${ownerSubtlePanelClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[color:var(--fg-primary)]">{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-[color:var(--fg-secondary)]">{sub}</p> : null}
    </div>
  );
}

function CreateHostelLoadingState() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-20 animate-pulse rounded-[var(--radius-lg)] bg-[color:var(--surface-soft)]" />
      <Card className="p-4 text-center text-sm text-[color:var(--fg-secondary)]">Loading hostel details…</Card>
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

function WizardPill({ label, active, done, onClick }: { label: string; active: boolean; done: boolean; onClick?: () => void }) {
  const className = `inline-flex items-center rounded-full px-3 py-2 text-[11px] font-semibold ${
    active
      ? "border border-[color:color-mix(in_srgb,var(--brand)_60%,transparent)] bg-[color:var(--cta)] text-white"
      : done
        ? "border border-[color:color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color:var(--success-soft)] text-[color:var(--success)]"
        : "border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-secondary)]"
  }`;
  if (onClick) return <button type="button" className={`${className} cursor-pointer`} onClick={onClick}>{label}</button>;
  return <div className={className}>{label}</div>;
}
