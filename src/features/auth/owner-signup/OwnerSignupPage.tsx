"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Lock, Mail, MapPin, Phone, Plus, ShieldCheck, Trash2, User } from "lucide-react";
import { csrfFetch } from "@/lib/csrf-client";
import { getSharingLabel } from "@/utils/hostel-occupancy";

type RoomForm = { id: string; roomNumber: string; bedCount: string };

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }
function createRoom(): RoomForm { return { id: `room-${uid()}`, roomNumber: "", bedCount: "" }; }
function isRoomComplete(r: RoomForm) { return r.roomNumber.trim() && Number(r.bedCount) > 0; }
function getSignupBedId(room: RoomForm, bedIndex: number) { return `${room.id}-bed-${bedIndex + 1}`; }

type Step = "loading" | "invalid" | "account" | "hostel" | "rooms" | "tenants" | "submitting" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "hostel", label: "Hostel" },
  { key: "rooms", label: "Rooms" },
  { key: "tenants", label: "Tenants" },
];

export default function OwnerSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const key = searchParams.get("key") ?? "";

  const [step, setStep] = useState<Step>("loading");
  const [invalidReason, setInvalidReason] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [hostelName, setHostelName] = useState("");
  const [hostelAddress, setHostelAddress] = useState("");
  const [hostelType, setHostelType] = useState<"PG" | "RESIDENCE">("PG");

  const [rooms, setRooms] = useState<RoomForm[]>([createRoom()]);
  const [activeRoomId, setActiveRoomId] = useState<string>(() => "");

  const [createdHostelId, setCreatedHostelId] = useState("");
  const [addedTenants, setAddedTenants] = useState<{ name: string; room: string }[]>([]);
  const [tName, setTName] = useState("");
  const [tPhone, setTPhone] = useState("");
  const [tEmail, setTEmail] = useState("");
  const [tRent, setTRent] = useState("");
  const [tMoveIn, setTMoveIn] = useState("");
  const [tRoomIdx, setTRoomIdx] = useState(0);
  const [tBedIdx, setTBedIdx] = useState(0);
  const [tError, setTError] = useState("");
  const [tSaving, setTSaving] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeRoomId && rooms.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const activeRoom = rooms.find(r => r.id === activeRoomId) ?? rooms[0] ?? null;
  const completedRooms = rooms.filter(isRoomComplete);

  const updateRoom = (roomId: string, field: keyof RoomForm, val: string) =>
    setRooms(cur => cur.map(r => r.id === roomId ? { ...r, [field]: val } : r));

  const addRoom = () => {
    if (!activeRoom) return;
    if (!isRoomComplete(activeRoom)) { setError("Fill current room before adding next."); return; }
    const next = createRoom();
    setRooms(cur => [...cur, next]);
    setActiveRoomId(next.id);
    setError("");
  };

  const removeRoom = (roomId: string) => {
    if (rooms.length <= 1) { setError("Need at least one room."); return; }
    const remaining = rooms.filter(r => r.id !== roomId);
    setRooms(remaining);
    setActiveRoomId(remaining[remaining.length - 1]?.id ?? "");
    setError("");
  };

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
    setStep("rooms");
  };

  const handleSubmit = async () => {
    setError("");
    if (rooms.length === 0) { setError("Add at least one room."); return; }
    if (rooms.some(r => !isRoomComplete(r))) { setError("Complete all room details (room number + beds) before saving."); return; }

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
      rooms: rooms.map(r => ({ id: r.id, roomNumber: r.roomNumber, bedCount: Number(r.bedCount), sharingType: getSharingLabel(r.bedCount) })),
    };

    try {
      const res = await csrfFetch("/api/owner/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = (await res.json()) as { ok?: boolean; message?: string; hostel?: { id?: string } };
      if (!res.ok) { setError(data.message ?? "Registration failed."); setStep("rooms"); return; }
      setCreatedHostelId(data.hostel?.id ?? "");
      setStep("tenants");
    } catch { setError("Unable to register. Try again."); setStep("rooms"); }
  };

  const goToDashboard = () => { setStep("done"); router.replace("/owner/dashboard"); router.refresh(); };

  const handleAddTenant = async () => {
    setTError("");
    if (!tName.trim()) { setTError("Name required."); return; }
    if (!tPhone.trim()) { setTError("Phone required."); return; }
    if (!tRent || Number(tRent) <= 0) { setTError("Enter monthly rent."); return; }
    if (!tMoveIn) { setTError("Move-in date required."); return; }

    const selectedRoom = rooms[tRoomIdx];
    if (!selectedRoom) { setTError("Select a valid room."); return; }

    const payload: Record<string, unknown> = {
      fullName: tName.trim(),
      phone: tPhone.trim(),
      email: tEmail.trim(),
      monthlyRent: tRent,
      rentPaid: "0",
      paidOnDate: tMoveIn,
      hostelId: createdHostelId,
      roomNumber: selectedRoom.roomNumber,
      moveInDate: tMoveIn,
      sharingType: getSharingLabel(selectedRoom.bedCount) || "1 sharing",
      propertyType: hostelType,
    };
    if (hostelType === "PG" && Number(selectedRoom.bedCount) > 0) {
      payload.bedId = getSignupBedId(selectedRoom, tBedIdx);
      payload.bedLabel = `Bed ${tBedIdx + 1}`;
    }

    setTSaving(true);
    try {
      const res = await csrfFetch("/api/tenants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) { setTError(data.message ?? "Failed to add tenant."); setTSaving(false); return; }
      setAddedTenants(prev => [...prev, { name: tName.trim(), room: `Room ${selectedRoom.roomNumber}` }]);
      setTName(""); setTPhone(""); setTEmail(""); setTRent(""); setTMoveIn("");
      setTRoomIdx(0); setTBedIdx(0); setTError("");
    } catch { setTError("Network error. Try again."); }
    setTSaving(false);
  };

  if (step === "loading") return <FullSpinner label="Verifying link…" />;
  if (step === "submitting") return <FullSpinner label="Creating your account…" />;
  if (step === "done") return <FullSpinner label="Going to dashboard…" tone="success" />;

  if (step === "invalid") {
    return (
      <main className="flex h-dvh items-center justify-center bg-[color:var(--bg-primary)] px-4 text-[color:var(--fg-primary)]">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-[color:var(--error-soft)]">
            <ShieldCheck className="h-7 w-7 text-[color:var(--error)]" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Link not valid</h1>
          <p className="mt-2 text-sm text-[color:var(--fg-secondary)]">{invalidReason}</p>
          <a href="/login" className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-5 py-2.5 text-sm font-semibold text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)]">Go to login</a>
        </div>
      </main>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <main className="nestiq-grid-bg min-h-dvh bg-[color:var(--bg-primary)] px-4 py-3 pb-[calc(2rem+env(safe-area-inset-bottom))] text-[color:var(--fg-primary)] sm:px-6 sm:py-4">
      <div className="mx-auto w-full min-w-0 max-w-lg">
        {/* Logo */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--cta),var(--cta-strong))] text-white">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[color:var(--fg-primary)]">Tenant Management System</p>
            <p className="text-xs text-[color:var(--fg-tertiary)]">Owner registration</p>
          </div>
        </div>

        {/* Step bar */}
        <div className="mb-4 grid grid-cols-2 gap-1 sm:flex sm:items-center">
          {STEPS.map((s, i) => {
            const done = i < currentStepIndex;
            const active = i === currentStepIndex;
            return (
              <div key={s.key} className="flex min-w-0 flex-col items-center gap-1 sm:flex-row">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${active ? "bg-[color:var(--cta)] text-white" : done ? "bg-[color:var(--success)] text-white" : "bg-[color:var(--muted)] text-[color:var(--fg-tertiary)]"}`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`max-w-full truncate text-[10px] font-medium sm:text-xs ${active ? "text-[color:var(--fg-primary)]" : "text-[color:var(--fg-tertiary)]"}`}>{s.label}</span>
                {i < STEPS.length - 1 && <div className="mx-1.5 hidden h-px w-5 bg-[color:var(--border)] sm:block" />}
              </div>
            );
          })}
        </div>

        <div className="w-full min-w-0 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(18,22,38,0.92)_0%,rgba(15,17,31,0.96)_100%)] p-4 shadow-[var(--shadow-4)]">
          {/* STEP 1: ACCOUNT */}
          {step === "account" && (
            <>
              <h1 className="text-xl font-semibold tracking-[-0.02em] text-[color:var(--fg-primary)]">Set up your account</h1>
              <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">Login with email or phone number going forward.</p>
              <form onSubmit={handleAccountNext} className="mt-4 flex flex-col gap-3">
                <InputField label="Full name" icon={<User size={16} />}>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Raghuveer Reddy" autoComplete="name" className={inputCls} />
                </InputField>
                <InputField label="Email" icon={<Mail size={16} />}>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={inputCls} />
                </InputField>
                <InputField label={<>Phone <span className="font-normal normal-case text-[color:var(--fg-tertiary)]">(optional — login with this too)</span></>} icon={<Phone size={16} />}>
                  <input type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="10-digit number" autoComplete="tel" className={inputCls} />
                </InputField>
                <InputField label="Password" icon={<Lock size={16} />} action={<PwToggle shown={showPassword} onClick={() => setShowPassword(s => !s)} />}>
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" autoComplete="new-password" className={`${inputCls} pr-10`} />
                </InputField>
                <InputField label="Confirm password" icon={<Lock size={16} />} action={<PwToggle shown={showConfirm} onClick={() => setShowConfirm(s => !s)} />}>
                  <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" className={`${inputCls} pr-10`} />
                </InputField>
                {error && <ErrorBox>{error}</ErrorBox>}
                <SubmitBtn>Next: Hostel Info <ArrowRight size={16} /></SubmitBtn>
              </form>
            </>
          )}

          {/* STEP 2: HOSTEL */}
          {step === "hostel" && (
            <>
              <h1 className="text-xl font-semibold tracking-[-0.02em] text-[color:var(--fg-primary)]">Your hostel details</h1>
              <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">Name and address. Rooms in the next step.</p>
              <form onSubmit={handleHostelNext} className="mt-4 flex flex-col gap-3">
                <InputField label="Hostel / PG name" icon={<Building2 size={16} />}>
                  <input type="text" value={hostelName} onChange={e => setHostelName(e.target.value)} placeholder="e.g. Sai Krishna PG" autoComplete="off" className={inputCls} />
                </InputField>
                <InputField label="Address" icon={<MapPin size={16} />} alignTop>
                  <textarea value={hostelAddress} onChange={e => setHostelAddress(e.target.value)} placeholder="Full address" rows={2} autoComplete="off" className="w-full resize-none rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-2.5 pl-9 text-sm text-[color:var(--fg-primary)] outline-none placeholder:text-[color:var(--fg-tertiary)] focus:border-[color:color-mix(in_srgb,var(--brand)_55%,transparent)]" />
                </InputField>
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Type</span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {(["PG", "RESIDENCE"] as const).map(t => (
                      <button key={t} type="button" onClick={() => setHostelType(t)}
                        className={`flex-1 rounded-[var(--radius-md)] border py-2 text-sm font-semibold transition ${hostelType === t ? "border-[color:color-mix(in_srgb,var(--brand)_50%,transparent)] bg-[color:var(--brand-soft)] text-[color:var(--accent)]" : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-tertiary)] hover:text-[color:var(--fg-primary)]"}`}>
                        {t === "PG" ? "PG / Hostel" : "Residence"}
                      </button>
                    ))}
                  </div>
                </div>
                {error && <ErrorBox>{error}</ErrorBox>}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <BackBtn onClick={() => { setStep("account"); setError(""); }} />
                  <SubmitBtn className="flex-1">Next: Rooms <ArrowRight size={16} /></SubmitBtn>
                </div>
              </form>
            </>
          )}

          {/* STEP 3: ROOMS */}
          {step === "rooms" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-[-0.02em] text-[color:var(--fg-primary)]">Rooms</h1>
                  <p className="mt-0.5 text-sm text-[color:var(--fg-secondary)]">{hostelName} · {completedRooms.length}/{rooms.length} rooms done</p>
                </div>
                <button type="button" onClick={addRoom} className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)]">
                  <Plus size={14} /> Add Room
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {rooms.map((room, i) => {
                  const done = isRoomComplete(room);
                  const active = room.id === activeRoom?.id;
                  return (
                    <button key={room.id} type="button" onClick={() => { setActiveRoomId(room.id); setError(""); }}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${active ? "border-[color:color-mix(in_srgb,var(--brand)_40%,transparent)] bg-[color:var(--brand-soft)] text-[color:var(--accent)]" : done ? "border-[color:color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color:var(--success-soft)] text-[color:var(--success)]" : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-tertiary)]"}`}>
                      {room.roomNumber || `Room ${i + 1}`}
                      {done && <CheckCircle2 size={12} />}
                    </button>
                  );
                })}
              </div>

              {activeRoom && (
                <div className="mt-4 flex flex-col gap-2">
                  {rooms.map((room, idx) => {
                    const isActive = room.id === activeRoom?.id;
                    const done = isRoomComplete(room);
                    return (
                      <div key={room.id} className={`rounded-[var(--radius-md)] border p-3 transition ${isActive ? "border-[color:color-mix(in_srgb,var(--brand)_30%,transparent)] bg-[color:var(--brand-soft)]" : done ? "border-[color:color-mix(in_srgb,var(--success)_20%,transparent)] bg-[color:var(--success-soft)]" : "border-[color:var(--border)] bg-[color:var(--surface-soft)]"}`}>
                        <div className="mb-2 flex items-center justify-between">
                          <button type="button" onClick={() => { setActiveRoomId(room.id); setError(""); }} className="flex min-w-0 items-center gap-2 text-left">
                            <span className="text-xs font-semibold text-[color:var(--fg-secondary)]">Room {idx + 1}</span>
                            {done && <CheckCircle2 size={14} className="text-[color:var(--success)]" />}
                            {room.roomNumber && <span className="text-xs text-[color:var(--fg-tertiary)]">· {room.roomNumber} · {room.bedCount} beds</span>}
                          </button>
                          {rooms.length > 1 && (
                            <button type="button" onClick={() => removeRoom(room.id)} aria-label="Remove room" className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--fg-tertiary)] hover:bg-[color:var(--error-soft)] hover:text-[color:var(--error)]">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        {isActive && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-tertiary)]">Room number</span>
                              <input value={room.roomNumber} onChange={e => updateRoom(room.id, "roomNumber", e.target.value)} placeholder="e.g. 101" className={roomInputCls} />
                            </div>
                            <div>
                              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-tertiary)]">Beds in room</span>
                              <input type="number" min="1" value={room.bedCount} onChange={e => updateRoom(room.id, "bedCount", e.target.value)} placeholder="e.g. 3" className={roomInputCls} />
                              {room.bedCount && Number(room.bedCount) > 0 && <p className="mt-1 text-[10px] text-[color:var(--fg-tertiary)]">{getSharingLabel(room.bedCount)}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {error && <ErrorBox className="mt-3">{error}</ErrorBox>}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <BackBtn onClick={() => { setStep("hostel"); setError(""); }} />
                <SubmitBtn as="button" className="flex-1" onClick={handleSubmit}>Next: Add Tenants <ArrowRight size={16} /></SubmitBtn>
              </div>
            </>
          )}

          {/* STEP 4: TENANTS */}
          {step === "tenants" && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-[-0.02em] text-[color:var(--fg-primary)]">Add tenants</h1>
                  <p className="mt-0.5 text-sm text-[color:var(--fg-secondary)]">Optionally onboard existing tenants now.</p>
                </div>
                <button type="button" onClick={goToDashboard} className="shrink-0 rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--fg-tertiary)] hover:text-[color:var(--fg-primary)]">Skip</button>
              </div>

              {addedTenants.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {addedTenants.map((t, i) => (
                    <div key={i} className="inline-flex items-center gap-1.5 rounded-full border border-[color:color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color:var(--success-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--success)]">
                      <CheckCircle2 size={12} /> {t.name} · {t.room}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-col gap-3">
                <InputField label="Full name" icon={<User size={16} />}>
                  <input type="text" value={tName} onChange={e => setTName(e.target.value)} placeholder="Tenant name" className={inputCls} />
                </InputField>
                <InputField label="Phone" icon={<Phone size={16} />}>
                  <input type="tel" inputMode="numeric" value={tPhone} onChange={e => setTPhone(e.target.value.replace(/\D/g, ""))} placeholder="10-digit number" className={inputCls} />
                </InputField>
                <InputField label={<>Email <span className="font-normal normal-case text-[color:var(--fg-tertiary)]">(optional)</span></>} icon={<Mail size={16} />}>
                  <input type="email" value={tEmail} onChange={e => setTEmail(e.target.value)} placeholder="tenant@example.com" className={inputCls} />
                </InputField>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Monthly rent (₹)</span>
                    <input type="number" min="0" value={tRent} onChange={e => setTRent(e.target.value)} placeholder="e.g. 8000" className={roomInputCls} />
                  </div>
                  <div>
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Move-in date</span>
                    <input type="date" value={tMoveIn} onChange={e => setTMoveIn(e.target.value)} className={`${roomInputCls} [color-scheme:dark]`} />
                  </div>
                </div>

                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Room assignment</span>
                  <div className={`grid gap-2 ${hostelType === "PG" ? "sm:grid-cols-2" : ""}`}>
                    <select value={tRoomIdx} onChange={e => { setTRoomIdx(Number(e.target.value)); setTBedIdx(0); }} className={selectCls}>
                      {rooms.map((r, i) => <option key={r.id} value={i}>Room {r.roomNumber || i + 1}</option>)}
                    </select>
                    {hostelType === "PG" && (() => {
                      const bedCount = Number(rooms[tRoomIdx]?.bedCount ?? 1);
                      return (
                        <select value={tBedIdx} onChange={e => setTBedIdx(Number(e.target.value))} className={selectCls}>
                          {Array.from({ length: Math.max(bedCount, 1) }, (_, i) => <option key={i} value={i}>Bed {i + 1}</option>)}
                        </select>
                      );
                    })()}
                  </div>
                </div>

                {tError && <ErrorBox>{tError}</ErrorBox>}

                <button type="button" onClick={handleAddTenant} disabled={tSaving}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--brand)_35%,transparent)] bg-[color:var(--brand-soft)] px-5 text-sm font-semibold text-[color:var(--accent)] transition hover:brightness-110 disabled:opacity-50">
                  {tSaving ? "Adding…" : <><Plus size={16} /> Add Tenant</>}
                </button>
              </div>

              <div className="mt-4 border-t border-[color:var(--border)] pt-4">
                <SubmitBtn as="button" onClick={goToDashboard}>
                  {addedTenants.length > 0 ? "Done — Go to Dashboard" : "Skip — Go to Dashboard"} <ArrowRight size={16} />
                </SubmitBtn>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-[color:var(--fg-tertiary)]">
          Already have an account? <a href="/login" className="font-semibold text-[color:var(--accent)] hover:brightness-110">Sign in</a>
        </p>
      </div>
    </main>
  );
}

// ─── Shared components ───────────────────────────────────────────────────────

const inputCls = "w-full min-w-0 rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-2.5 pl-9 text-sm text-[color:var(--fg-primary)] outline-none placeholder:text-[color:var(--fg-tertiary)] focus:border-[color:color-mix(in_srgb,var(--brand)_55%,transparent)]";
const roomInputCls = "w-full rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-2.5 text-sm text-[color:var(--fg-primary)] outline-none placeholder:text-[color:var(--fg-tertiary)] focus:border-[color:color-mix(in_srgb,var(--brand)_55%,transparent)]";
const selectCls = "w-full rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--bg-elevated)] px-3 py-2.5 text-sm text-[color:var(--fg-primary)] outline-none focus:border-[color:color-mix(in_srgb,var(--brand)_55%,transparent)]";

function InputField({ label, icon, children, action, alignTop }: {
  label: React.ReactNode;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  alignTop?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">{label}</span>
      <div className="relative min-w-0">
        <span className={`pointer-events-none absolute left-3 text-[color:var(--fg-tertiary)] ${alignTop ? "top-3" : "top-1/2 -translate-y-1/2"}`}>{icon}</span>
        {children}
        {action}
      </div>
    </label>
  );
}

function PwToggle({ shown, onClick }: { shown: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--fg-tertiary)] hover:text-[color:var(--fg-secondary)]">
      {shown ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

function SubmitBtn({ children, className = "", as, onClick }: { children: React.ReactNode; className?: string; as?: "button"; onClick?: () => void }) {
  return (
    <button
      type={as === "button" ? "button" : "submit"}
      onClick={onClick}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[linear-gradient(90deg,var(--cta),var(--cta-strong))] px-5 text-base font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 ${className}`}
    >
      {children}
    </button>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-4 py-2.5 text-sm font-medium text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)]">Back</button>
  );
}

function ErrorBox({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)] ${className}`}>
      {children}
    </div>
  );
}

function FullSpinner({ label, tone = "brand" }: { label: string; tone?: "brand" | "success" }) {
  return (
    <main className="flex h-dvh items-center justify-center bg-[color:var(--bg-primary)] text-[color:var(--fg-primary)]">
      <div className="text-center">
        <div className={`mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border-strong)] ${tone === "success" ? "border-t-[color:var(--success)]" : "border-t-[color:var(--brand)]"}`} />
        <p className="mt-3 text-sm text-[color:var(--fg-secondary)]">{label}</p>
      </div>
    </main>
  );
}
