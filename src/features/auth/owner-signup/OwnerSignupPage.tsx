"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Lock, Mail, MapPin, Phone, Plus, ShieldCheck, Trash2, User } from "lucide-react";
import { csrfFetch } from "@/lib/csrf-client";
import { getSharingLabel } from "@/utils/hostel-occupancy";

// ─── Floor / Room types (mirrors OwnerCreateHostelPage) ─────────────────────

type RoomForm = { id: string; roomNumber: string; bedCount: string };
type FloorForm = { id: string; floorLabel: string; rooms: RoomForm[] };

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }
function createRoom(): RoomForm { return { id: `room-${uid()}`, roomNumber: "", bedCount: "" }; }
function createFloor(index: number): FloorForm {
  return { id: `floor-${uid()}`, floorLabel: `Floor ${index}`, rooms: [createRoom()] };
}
function isRoomComplete(r: RoomForm) { return r.roomNumber.trim() && Number(r.bedCount) > 0; }
function getSignupBedId(room: RoomForm, bedIndex: number) {
  return `${room.id}-bed-${bedIndex + 1}`;
}
// ─── Page steps ─────────────────────────────────────────────────────────────

type Step = "loading" | "invalid" | "account" | "hostel" | "floors" | "tenants" | "submitting" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "hostel",  label: "Hostel" },
  { key: "floors",  label: "Floors" },
  { key: "tenants", label: "Tenants" },
];

export default function OwnerSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const key = searchParams.get("key") ?? "";

  const [step, setStep] = useState<Step>("loading");
  const [invalidReason, setInvalidReason] = useState("");

  // Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Hostel basics
  const [hostelName, setHostelName] = useState("");
  const [hostelAddress, setHostelAddress] = useState("");
  const [hostelType, setHostelType] = useState<"PG" | "RESIDENCE">("PG");

  // Floors
  const [floors, setFloors] = useState<FloorForm[]>(() => [createFloor(1)]);
  const [activeFloorId, setActiveFloorId] = useState<string>(() => "");
  const [activeRoomId, setActiveRoomId] = useState<string>(() => "");

  // Tenants step
  const [createdHostelId, setCreatedHostelId] = useState("");
  const [addedTenants, setAddedTenants] = useState<{ name: string; room: string }[]>([]);
  const [tName, setTName] = useState("");
  const [tPhone, setTPhone] = useState("");
  const [tEmail, setTEmail] = useState("");
  const [tRent, setTRent] = useState("");
  const [tMoveIn, setTMoveIn] = useState("");
  const [tFloorIdx, setTFloorIdx] = useState(0);
  const [tRoomIdx, setTRoomIdx] = useState(0);
  const [tBedIdx, setTBedIdx] = useState(0);
  const [tError, setTError] = useState("");
  const [tSaving, setTSaving] = useState(false);

  const [error, setError] = useState("");

  // Set initial active ids after first render
  useEffect(() => {
    if (!activeFloorId && floors.length > 0) {
      setActiveFloorId(floors[0].id);
      setActiveRoomId(floors[0].rooms[0]?.id ?? "");
    }
  }, [floors, activeFloorId]);

  // Validate key on mount
  useEffect(() => {
    if (!key) { setInvalidReason("No signup key in link. Contact admin."); setStep("invalid"); return; }
    void (async () => {
      try {
        const res = await fetch(`/api/owner/signup/validate?key=${encodeURIComponent(key)}`);
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok) { setInvalidReason(data.message ?? "Link invalid or already used."); setStep("invalid"); return; }
        setStep("account");
      } catch { setInvalidReason("Cannot verify link. Check connection."); setStep("invalid"); }
    })();
  }, [key]);

  // Keep activeFloor/Room consistent
  const activeFloor = useMemo(() => floors.find(f => f.id === activeFloorId) ?? floors[0] ?? null, [floors, activeFloorId]);
  const activeRoom = activeFloor?.rooms.find(r => r.id === activeRoomId) ?? activeFloor?.rooms[0] ?? null;
  const completedFloors = floors.filter(f => f.rooms.length > 0 && f.rooms.every(isRoomComplete));

  // ── Floor / Room helpers ──────────────────────────────────────────────────

  const updateFloor = (floorId: string, updater: (f: FloorForm) => FloorForm) =>
    setFloors(cur => cur.map(f => f.id === floorId ? updater(f) : f));

  const updateRoom = (floorId: string, roomId: string, field: keyof RoomForm, val: string) =>
    updateFloor(floorId, f => ({ ...f, rooms: f.rooms.map(r => r.id === roomId ? { ...r, [field]: val } : r) }));

  const addRoom = () => {
    if (!activeFloor || !activeRoom) return;
    if (!isRoomComplete(activeRoom)) { setError("Fill current room before adding next."); return; }
    const next = createRoom();
    updateFloor(activeFloor.id, f => ({ ...f, rooms: [...f.rooms, next] }));
    setActiveRoomId(next.id);
    setError("");
  };

  const removeRoom = (roomId: string) => {
    if (!activeFloor || activeFloor.rooms.length <= 1) { setError("Each floor needs at least one room."); return; }
    const remaining = activeFloor.rooms.filter(r => r.id !== roomId);
    updateFloor(activeFloor.id, f => ({ ...f, rooms: remaining }));
    setActiveRoomId(remaining[remaining.length - 1]?.id ?? "");
    setError("");
  };

  const addFloor = () => {
    if (!activeFloor || activeFloor.rooms.length === 0 || !activeFloor.rooms.every(isRoomComplete)) {
      setError("Complete all rooms on current floor before adding another floor."); return;
    }
    const next = createFloor(floors.length + 1);
    setFloors(cur => [...cur, next]);
    setActiveFloorId(next.id);
    setActiveRoomId(next.rooms[0].id);
    setError("");
  };

  const removeFloor = (floorId: string) => {
    if (floors.length <= 1) { setError("Need at least one floor."); return; }
    const remaining = floors.filter(f => f.id !== floorId).map((f, i) => ({ ...f, floorLabel: `Floor ${i + 1}` }));
    setFloors(remaining);
    setActiveFloorId(remaining[0].id);
    setActiveRoomId(remaining[0].rooms[0]?.id ?? "");
    setError("");
  };

  // ── Step handlers ─────────────────────────────────────────────────────────

  const handleAccountNext = (e: FormEvent) => {
    e.preventDefault(); setError("");
    if (!name.trim()) { setError("Enter your full name."); return; }
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setStep("hostel");
  };

  const handleHostelNext = (e: FormEvent) => {
    e.preventDefault(); setError("");
    if (!hostelName.trim()) { setError("Enter hostel name."); return; }
    if (!hostelAddress.trim()) { setError("Enter hostel address."); return; }
    setStep("floors");
  };

  const handleSubmit = async () => {
    setError("");
    if (floors.length === 0) { setError("Add at least one floor."); return; }
    const hasIncomplete = floors.some(f => f.rooms.length === 0 || !f.rooms.every(isRoomComplete));
    if (hasIncomplete) { setError("Complete all room details (room number + beds) before saving."); return; }

    setStep("submitting");

    const payload = {
      key,
      name: name.trim(),
      email: email.trim(),
      phoneNumber: phone.trim() || undefined,
      password,
      hostelName: hostelName.trim(),
      hostelAddress: hostelAddress.trim(),
      hostelType,
      floors: floors.map(f => ({
        id: f.id,
        floorLabel: f.floorLabel,
        rooms: f.rooms.map(r => ({
          id: r.id,
          roomNumber: r.roomNumber,
          bedCount: Number(r.bedCount),
          sharingType: getSharingLabel(r.bedCount),
        })),
      })),
    };

    try {
      const res = await csrfFetch("/api/owner/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; hostel?: { id?: string } };
      if (!res.ok) { setError(data.message ?? "Registration failed."); setStep("floors"); return; }
      setCreatedHostelId(data.hostel?.id ?? "");
      setStep("tenants");
    } catch { setError("Unable to register. Try again."); setStep("floors"); }
  };

  // ── Tenant helpers ────────────────────────────────────────────────────────

  const goToDashboard = () => { setStep("done"); router.replace("/owner/dashboard"); router.refresh(); };

  const handleAddTenant = async () => {
    setTError("");
    if (!tName.trim()) { setTError("Name required."); return; }
    if (!tPhone.trim()) { setTError("Phone required."); return; }
    if (!tRent || Number(tRent) <= 0) { setTError("Enter monthly rent."); return; }
    if (!tMoveIn) { setTError("Move-in date required."); return; }

    const selectedFloor = floors[tFloorIdx];
    const selectedRoom = selectedFloor?.rooms[tRoomIdx];
    if (!selectedFloor || !selectedRoom) { setTError("Select a valid floor and room."); return; }

    const fd = new FormData();
    fd.append("tenantType", "old");
    fd.append("fullName", tName.trim());
    fd.append("phone", tPhone.trim());
    fd.append("email", tEmail.trim());
    fd.append("monthlyRent", tRent);
    fd.append("rentPaid", "0");
    fd.append("paidOnDate", tMoveIn);
    fd.append("hostelId", createdHostelId);
    fd.append("floorNumber", String(tFloorIdx + 1));
    fd.append("roomNumber", selectedRoom.roomNumber);
    fd.append("moveInDate", tMoveIn);
    fd.append("sharingType", getSharingLabel(selectedRoom.bedCount) || "1 sharing");
    fd.append("propertyType", hostelType);
    if (hostelType === "PG" && Number(selectedRoom.bedCount) > 0) {
      fd.append("bedId", getSignupBedId(selectedRoom, tBedIdx));
      fd.append("bedLabel", `Bed ${tBedIdx + 1}`);
    }

    setTSaving(true);
    try {
      const res = await csrfFetch("/api/tenants", { method: "POST", body: fd });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) { setTError(data.message ?? "Failed to add tenant."); setTSaving(false); return; }
      setAddedTenants(prev => [...prev, {
        name: tName.trim(),
        room: `${selectedFloor.floorLabel} · ${selectedRoom.roomNumber}`,
      }]);
      setTName(""); setTPhone(""); setTEmail(""); setTRent(""); setTMoveIn("");
      setTFloorIdx(0); setTRoomIdx(0); setTBedIdx(0); setTError("");
    } catch { setTError("Network error. Try again."); }
    setTSaving(false);
  };

  // ── Fullscreen states ─────────────────────────────────────────────────────

  if (step === "loading") return <Spinner label="Verifying link…" color="yellow" />;
  if (step === "submitting") return <Spinner label="Creating your account…" color="yellow" />;
  if (step === "done") return <Spinner label="Going to dashboard…" color="green" />;

  if (step === "invalid") {
    return (
      <main className="flex h-dvh items-center justify-center bg-[#090912] px-4 text-white">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15">
            <ShieldCheck className="h-7 w-7 text-red-400" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Link not valid</h1>
          <p className="mt-2 text-sm text-white/50">{invalidReason}</p>
          <a href="/login" className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/70 hover:text-white">Go to login</a>
        </div>
      </main>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#090912] text-white">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-none touch-pan-y px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6">
      <div className="mx-auto w-full max-w-lg min-w-0">

        {/* Logo */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#ffcc4d_0%,#d9941c_100%)] text-[#18120a]">
            <Building2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#f6f0e8]">Tenant Management System</p>
            <p className="text-xs text-white/40">Owner registration</p>
          </div>
        </div>

        {/* Step bar */}
        <div className="mb-5 grid grid-cols-4 gap-1 sm:flex sm:items-center">
          {STEPS.map((s, i) => {
            const done = i < currentStepIndex;
            const active = i === currentStepIndex;
            return (
              <div key={s.key} className="flex min-w-0 flex-col items-center gap-1 sm:flex-row">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition ${active ? "bg-[#f7bf53] text-[#1b1207]" : done ? "bg-[#22c55e] text-white" : "bg-white/10 text-white/35"}`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`max-w-full truncate text-[10px] font-medium sm:text-xs ${active ? "text-white" : "text-white/30"}`}>{s.label}</span>
                {i < STEPS.length - 1 && <div className="mx-1.5 hidden h-px w-5 bg-white/12 sm:block" />}
              </div>
            );
          })}
        </div>

        <div className="w-full min-w-0 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,38,0.92)_0%,rgba(15,17,31,0.96)_100%)] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.4)] sm:p-5">

          {/* ── STEP 1: ACCOUNT ─────────────────────────────────────────── */}
          {step === "account" && (
            <>
              <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#f7f0e8]">Set up your account</h1>
              <p className="mt-1 text-sm text-white/45">Login with email or phone number going forward.</p>
              <form onSubmit={handleAccountNext} className="mt-4 space-y-3">
                <InputField label="Full Name" icon={<User className="h-4 w-4 text-white/30" />}>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Raghuveer Reddy" autoComplete="name"
                    className={inputCls} />
                </InputField>
                <InputField label="Email" icon={<Mail className="h-4 w-4 text-white/30" />}>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
                    className={inputCls} />
                </InputField>
                <InputField label={<>Phone <span className="normal-case font-normal text-white/30">(optional — login with this too)</span></>} icon={<Phone className="h-4 w-4 text-white/30" />}>
                  <input type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="10-digit number" autoComplete="tel"
                    className={inputCls} />
                </InputField>
                <InputField label="Password" icon={<Lock className="h-4 w-4 text-white/30" />} action={
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }>
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" autoComplete="new-password"
                    className={`${inputCls} pr-10`} />
                </InputField>
                <InputField label="Confirm Password" icon={<Lock className="h-4 w-4 text-white/30" />} action={
                  <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }>
                  <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" autoComplete="new-password"
                    className={`${inputCls} pr-10`} />
                </InputField>
                {error && <ErrorBox>{error}</ErrorBox>}
                <SubmitBtn>Next: Hostel Info <ArrowRight className="h-4 w-4" /></SubmitBtn>
              </form>
            </>
          )}

          {/* ── STEP 2: HOSTEL INFO ──────────────────────────────────────── */}
          {step === "hostel" && (
            <>
              <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#f7f0e8]">Your hostel details</h1>
              <p className="mt-1 text-sm text-white/45">Name and address. Floors and rooms in the next step.</p>
              <form onSubmit={handleHostelNext} className="mt-4 space-y-3">
                <InputField label="Hostel / PG Name" icon={<Building2 className="h-4 w-4 text-white/30" />}>
                  <input type="text" value={hostelName} onChange={e => setHostelName(e.target.value)} placeholder="e.g. Sai Krishna PG" autoComplete="off"
                    className={inputCls} />
                </InputField>
                <InputField label="Address" icon={<MapPin className="h-4 w-4 text-white/30 mt-0.5" />} alignTop>
                  <textarea value={hostelAddress} onChange={e => setHostelAddress(e.target.value)} placeholder="Full address" rows={2} autoComplete="off"
                    className="w-full resize-none rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50 focus:bg-white/[0.05]" />
                </InputField>
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Type</span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {(["PG", "RESIDENCE"] as const).map(t => (
                      <button key={t} type="button" onClick={() => setHostelType(t)}
                        className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${hostelType === t ? "border-[#f2bb4d]/50 bg-[#f7bf53]/12 text-[#fcd34d]" : "border-white/12 bg-white/[0.03] text-white/50 hover:text-white"}`}>
                        {t === "PG" ? "PG / Hostel" : "Residence"}
                      </button>
                    ))}
                  </div>
                </div>
                {error && <ErrorBox>{error}</ErrorBox>}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => { setStep("account"); setError(""); }}
                    className="rounded-xl border border-white/12 px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white">Back</button>
                  <SubmitBtn className="flex-1">Next: Floors &amp; Rooms <ArrowRight className="h-4 w-4" /></SubmitBtn>
                </div>
              </form>
            </>
          )}

          {/* ── STEP 3: FLOORS & ROOMS ───────────────────────────────────── */}
          {step === "floors" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#f7f0e8]">Floors &amp; Rooms</h1>
                  <p className="mt-0.5 text-sm text-white/45">{hostelName} · {completedFloors.length}/{floors.length} floors done</p>
                </div>
                <button type="button" onClick={addFloor}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/60 hover:text-white">
                  <Plus className="h-3.5 w-3.5" /> Add Floor
                </button>
              </div>

              {/* Floor tabs */}
              <div className="mt-4 flex flex-wrap gap-2">
                {floors.map((f, i) => {
                  const done = f.rooms.length > 0 && f.rooms.every(isRoomComplete);
                  const active = f.id === activeFloor?.id;
                  return (
                    <button key={f.id} type="button"
                      onClick={() => { setActiveFloorId(f.id); setActiveRoomId(f.rooms[0]?.id ?? ""); setError(""); }}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${active ? "border-[#f2bb4d]/40 bg-[#f7bf53]/12 text-[#fcd34d]" : done ? "border-[#4ade80]/30 bg-[#22c55e]/10 text-[#4ade80]" : "border-white/12 bg-white/[0.04] text-white/50"}`}>
                      {f.floorLabel || `Floor ${i + 1}`}
                      {done && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>

              {activeFloor && (
                <div className="mt-4 space-y-3">
                  {/* Floor header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex-1">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Floor label</span>
                      <input value={activeFloor.floorLabel}
                        onChange={e => updateFloor(activeFloor.id, f => ({ ...f, floorLabel: e.target.value }))}
                        placeholder="e.g. Ground Floor"
                        className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50" />
                    </div>
                    {floors.length > 1 && (
                      <button type="button" onClick={() => removeFloor(activeFloor.id)}
                        className="mt-5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/30 hover:bg-red-500/15 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Rooms */}
                  <div className="space-y-2">
                    {activeFloor.rooms.map((room, idx) => {
                      const isActive = room.id === activeRoom?.id;
                      const done = isRoomComplete(room);
                      return (
                        <div key={room.id}
                          className={`rounded-xl border p-3 transition ${isActive ? "border-[#f2bb4d]/30 bg-[#f7bf53]/[0.06]" : done ? "border-[#4ade80]/20 bg-[#22c55e]/[0.05]" : "border-white/10 bg-white/[0.02]"}`}>
                          <div className="mb-2 flex items-center justify-between">
                            <button type="button" onClick={() => { setActiveRoomId(room.id); setError(""); }}
                              className="flex min-w-0 items-center gap-2 text-left">
                              <span className="text-xs font-semibold text-white/60">Room {idx + 1}</span>
                              {done && <CheckCircle2 className="h-3.5 w-3.5 text-[#4ade80]" />}
                              {room.roomNumber && <span className="text-xs text-white/40">· {room.roomNumber} · {room.bedCount} beds</span>}
                            </button>
                            {activeFloor.rooms.length > 1 && (
                              <button type="button" onClick={() => removeRoom(room.id)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-white/25 hover:bg-red-500/15 hover:text-red-400">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          {isActive && (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div>
                                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Room Number</span>
                                <input value={room.roomNumber}
                                  onChange={e => updateRoom(activeFloor.id, room.id, "roomNumber", e.target.value)}
                                  placeholder="e.g. 101"
                                  className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#f2bb4d]/50" />
                              </div>
                              <div>
                                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Beds in Room</span>
                                <input type="number" min="1" value={room.bedCount}
                                  onChange={e => updateRoom(activeFloor.id, room.id, "bedCount", e.target.value)}
                                  placeholder="e.g. 3"
                                  className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#f2bb4d]/50" />
                                {room.bedCount && Number(room.bedCount) > 0 &&
                                  <p className="mt-1 text-[10px] text-white/35">{getSharingLabel(room.bedCount)}</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add room */}
                  <button type="button" onClick={addRoom}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-2 text-xs font-semibold text-white/45 hover:border-white/25 hover:text-white/70 transition">
                    <Plus className="h-3.5 w-3.5" /> Add Room to {activeFloor.floorLabel}
                  </button>
                </div>
              )}

              {error && <ErrorBox className="mt-3">{error}</ErrorBox>}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => { setStep("hostel"); setError(""); }}
                  className="rounded-xl border border-white/12 px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white">Back</button>
                <button type="button" onClick={handleSubmit}
                  className="inline-flex flex-1 min-h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-5 text-base font-semibold text-[#1b1207] shadow-[0_20px_40px_rgba(240,175,47,0.26)] transition hover:brightness-105">
                  Next: Add Tenants <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 4: TENANTS ──────────────────────────────────────────── */}
          {step === "tenants" && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#f7f0e8]">Add Tenants</h1>
                  <p className="mt-0.5 text-sm text-white/45">Optionally onboard existing tenants now.</p>
                </div>
                <button type="button" onClick={goToDashboard}
                  className="shrink-0 rounded-xl border border-white/12 px-3 py-1.5 text-xs font-semibold text-white/50 hover:text-white transition">
                  Skip
                </button>
              </div>

              {/* Added tenants list */}
              {addedTenants.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {addedTenants.map((t, i) => (
                    <div key={i} className="inline-flex items-center gap-1.5 rounded-full border border-[#4ade80]/30 bg-[#22c55e]/10 px-3 py-1 text-xs font-semibold text-[#4ade80]">
                      <CheckCircle2 className="h-3 w-3" /> {t.name} · {t.room}
                    </div>
                  ))}
                </div>
              )}

              {/* Tenant form */}
              <div className="mt-4 space-y-3">
                <InputField label="Full Name" icon={<User className="h-4 w-4 text-white/30" />}>
                  <input type="text" value={tName} onChange={e => setTName(e.target.value)} placeholder="Tenant name"
                    className={inputCls} />
                </InputField>
                <InputField label="Phone" icon={<Phone className="h-4 w-4 text-white/30" />}>
                  <input type="tel" inputMode="numeric" value={tPhone} onChange={e => setTPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit number" className={inputCls} />
                </InputField>
                <InputField label={<>Email <span className="normal-case font-normal text-white/30">(optional)</span></>} icon={<Mail className="h-4 w-4 text-white/30" />}>
                  <input type="email" value={tEmail} onChange={e => setTEmail(e.target.value)} placeholder="tenant@example.com"
                    className={inputCls} />
                </InputField>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Monthly Rent (₹)</span>
                    <input type="number" min="0" value={tRent} onChange={e => setTRent(e.target.value)} placeholder="e.g. 8000"
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50" />
                  </div>
                  <div>
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Move-in Date</span>
                    <input type="date" value={tMoveIn} onChange={e => setTMoveIn(e.target.value)}
                      className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f2bb4d]/50 [color-scheme:dark]" />
                  </div>
                </div>

                {/* Room assignment */}
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Room Assignment</span>
                  <div className={`grid gap-2 ${hostelType === "PG" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                    <select value={tFloorIdx} onChange={e => { setTFloorIdx(Number(e.target.value)); setTRoomIdx(0); setTBedIdx(0); }}
                      className="w-full rounded-xl border border-white/12 bg-[#0f1220] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f2bb4d]/50">
                      {floors.map((f, i) => <option key={f.id} value={i}>{f.floorLabel || `Floor ${i + 1}`}</option>)}
                    </select>
                    <select value={tRoomIdx} onChange={e => { setTRoomIdx(Number(e.target.value)); setTBedIdx(0); }}
                      className="w-full rounded-xl border border-white/12 bg-[#0f1220] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f2bb4d]/50">
                      {(floors[tFloorIdx]?.rooms ?? []).map((r, i) => (
                        <option key={r.id} value={i}>Room {r.roomNumber || i + 1}</option>
                      ))}
                    </select>
                    {hostelType === "PG" && (() => {
                      const bedCount = Number(floors[tFloorIdx]?.rooms[tRoomIdx]?.bedCount ?? 1);
                      return (
                        <select value={tBedIdx} onChange={e => setTBedIdx(Number(e.target.value))}
                          className="w-full rounded-xl border border-white/12 bg-[#0f1220] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f2bb4d]/50">
                          {Array.from({ length: Math.max(bedCount, 1) }, (_, i) => (
                            <option key={i} value={i}>Bed {i + 1}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </div>

                {tError && <ErrorBox>{tError}</ErrorBox>}

                <button type="button" onClick={handleAddTenant} disabled={tSaving}
                  className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-[#f2bb4d]/30 bg-[#f7bf53]/10 px-5 text-sm font-semibold text-[#fcd34d] transition hover:bg-[#f7bf53]/18 disabled:opacity-50">
                  {tSaving ? "Adding…" : <><Plus className="h-4 w-4" /> Add Tenant</>}
                </button>
              </div>

              <div className="mt-4 border-t border-white/8 pt-4">
                <button type="button" onClick={goToDashboard}
                  className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-5 text-base font-semibold text-[#1b1207] shadow-[0_20px_40px_rgba(240,175,47,0.26)] transition hover:brightness-105">
                  {addedTenants.length > 0 ? "Done — Go to Dashboard" : "Skip — Go to Dashboard"} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-white/30">
          Already have an account?{" "}
          <a href="/login" className="text-[#f7bf53] hover:text-[#ffd983]">Sign in</a>
        </p>
      </div>
      </div>
    </main>
  );
}

// ─── Tiny shared components ──────────────────────────────────────────────────

const inputCls = "w-full min-w-0 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 pl-9 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#f2bb4d]/50 focus:bg-white/[0.05]";

function InputField({ label, icon, children, action, alignTop }: {
  label: React.ReactNode;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  alignTop?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">{label}</span>
      <div className="relative min-w-0">
        <span className={`pointer-events-none absolute left-3 ${alignTop ? "top-3" : "top-1/2 -translate-y-1/2"}`}>{icon}</span>
        {children}
        {action}
      </div>
    </label>
  );
}

function SubmitBtn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <button type="submit"
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#b86f18_0%,#efaf2f_42%,#ffd95f_100%)] px-5 text-base font-semibold text-[#1b1207] shadow-[0_20px_40px_rgba(240,175,47,0.26)] transition hover:brightness-105 ${className}`}>
      {children}
    </button>
  );
}

function ErrorBox({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 ${className}`}>
      {children}
    </div>
  );
}

function Spinner({ label, color }: { label: string; color: "yellow" | "green" }) {
  const ring = color === "yellow" ? "border-t-[#f7bf53]" : "border-t-[#4ade80]";
  return (
    <main className="flex h-dvh items-center justify-center bg-[#090912] text-white">
      <div className="text-center">
        <div className={`mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 ${ring}`} />
        <p className="mt-3 text-sm text-white/50">{label}</p>
      </div>
    </main>
  );
}
