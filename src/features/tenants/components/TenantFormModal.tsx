"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, Briefcase, Building2, CalendarDays, CreditCard,
  FileBadge2, IndianRupee, Mail, Phone, Plus,
  Receipt, Search, ShieldAlert, Trash2, Upload, User, UserCheck, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { csrfFetch } from "@/lib/csrf-client";
import { createTenant, updateTenantFamilyMembers } from "@/services/tenants/tenants.service";
import type { BillingCycle, TenantRecord } from "@/types/tenant";

type IdType = "aadhar" | "pan" | "driving_licence" | "other" | "";
type OccupationType = "employed" | "student" | "self_employed" | "other" | "";
type EmergencyRelation = "father" | "mother" | "brother" | "sister" | "spouse" | "friend" | "other" | "";
type TenantStep = 1 | 2 | 3 | 4 | 5 | 6;
type FamilyMemberForm = { id: string; name: string; relation: string; age: string };

const initialState = {
  fullName: "",
  fatherName: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  occupation: "" as OccupationType,
  workplaceName: "",
  idType: "" as IdType,
  idNumber: "",
  emergencyContactName: "",
  emergencyContactRelation: "" as EmergencyRelation,
  emergencyContactPhone: "",
  monthlyRent: "",
  rentPaid: "",
  advanceAmount: "",
  serviceFeeAmount: "",
  paidOnDate: new Date().toISOString().slice(0, 10),
};

const DRAFT_KEY = "tenant-form-draft-v5";

const ID_TYPE_LABELS: Record<Exclude<IdType, "">, string> = {
  aadhar: "Aadhar Card",
  pan: "PAN Card",
  driving_licence: "Driving Licence",
  other: "Govt ID",
};

const OCCUPATION_LABELS: Record<Exclude<OccupationType, "">, string> = {
  employed: "Employed",
  student: "Student",
  self_employed: "Self-employed",
  other: "Other",
};

const WORKPLACE_PLACEHOLDER: Record<Exclude<OccupationType, "">, string> = {
  employed: "Company name (e.g. Amazon, TCS…)",
  student: "College / Institute name",
  self_employed: "Business name",
  other: "Describe",
};

const RELATION_LABELS: Record<Exclude<EmergencyRelation, "">, string> = {
  father: "Father",
  mother: "Mother",
  brother: "Brother",
  sister: "Sister",
  spouse: "Spouse",
  friend: "Friend",
  other: "Other",
};

function createFamilyMember(): FamilyMemberForm {
  return { id: `fm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: "", relation: "", age: "" };
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").replace(/^91/, "").slice(0, 10);
}

function formatPhoneDisplay(value: string) {
  const digits = normalizePhone(value);
  return digits.length <= 5 ? digits : `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function getNextDuePreview(dateValue: string, billingCycle: BillingCycle) {
  if (!dateValue) return "Pick joining date";
  const base = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(base.getTime())) return "Pick joining date";
  if (billingCycle === "monthly") base.setMonth(base.getMonth() + 1);
  else if (billingCycle === "weekly") base.setDate(base.getDate() + 7);
  else base.setDate(base.getDate() + 1);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(base);
}

function getSavedDraft() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      step?: TenantStep;
      billingCycle?: BillingCycle;
      form?: typeof initialState;
      familyMembers?: FamilyMemberForm[];
    };
  } catch {
    window.localStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

async function uploadDocument(file: File, docType: "tenant_photo" | "id_photo" | "receipt" | "agreement"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("docType", docType);
  const res = await csrfFetch("/api/tenants/upload-document", { method: "POST", body: fd });
  const data = (await res.json()) as { url?: string; message?: string };
  if (!res.ok || !data.url) throw new Error(data.message ?? "Upload failed.");
  return data.url;
}

export function TenantFormModal({
  open,
  onClose,
  onCreated,
  hostelId,
  propertyType,
  allTenants,
  asPage = false,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (tenant: TenantRecord) => void;
  hostelId?: string;
  propertyType?: "PG" | "RESIDENCE";
  allTenants?: TenantRecord[];
  /** Render as an inline page element (no overlay, no body lock, sticky footer) */
  asPage?: boolean;
}) {
  const isResidence = propertyType === "RESIDENCE";
  const savedDraft = getSavedDraft();
  const [step, setStep] = useState<TenantStep>(savedDraft?.step ?? 1);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(savedDraft?.billingCycle ?? "monthly");
  const [form, setForm] = useState(savedDraft?.form ? { ...initialState, ...savedDraft.form } : initialState);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberForm[]>(
    savedDraft?.familyMembers?.length ? savedDraft.familyMembers : [createFamilyMember()],
  );

  // Receipt upload (payment step)
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const [ecSearch, setEcSearch] = useState("");
  const ecSearchResults = useMemo(() => {
    const q = ecSearch.trim().toLowerCase();
    if (!q || !allTenants?.length) return [];
    return allTenants
      .filter((t) =>
        t.fullName.toLowerCase().includes(q) ||
        t.phone.includes(q) ||
        (t.assignment?.roomNumber?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 3);
  }, [ecSearch, allTenants]);

  const duePreview = useMemo(() => getNextDuePreview(form.paidOnDate, billingCycle), [billingCycle, form.paidOnDate]);
  const paymentCoverage = Number(form.monthlyRent) > 0
    ? Math.min(100, Math.round((Number(form.rentPaid || 0) / Number(form.monthlyRent)) * 100))
    : 0;
  const firstPaymentTotal =
    Number(form.rentPaid || 0) + Number(form.advanceAmount || 0) + Number(form.serviceFeeAmount || 0);
  const firstPaymentEntered = firstPaymentTotal > 0;

  // Step numbers — Docs and Room steps removed; flow: Personal→Emergency→Payment→[Family]→Save
  const familyStep: TenantStep = 4;


  useLockBodyScroll(asPage ? false : open);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, billingCycle, form, familyMembers }));
  }, [billingCycle, familyMembers, form, open, step]);

  useEffect(() => {
    if (asPage) {
      window.scrollTo({ top: 0, behavior: "instant" });
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    setEcSearch("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, open]);


  if (!asPage && !open) return null;

  const resetFormState = () => {
    setStep(1);
    setBillingCycle("monthly");
    setForm(initialState);
    setFamilyMembers([createFamilyMember()]);
    setSubmitting(false);
    setError("");
    setReceiptFile(null);
    setReceiptPreview("");
    if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
  };

  const handleClose = () => {
    if (submitting) return;
    resetFormState();
    onClose();
  };

  const setField = <K extends keyof typeof initialState>(key: K, value: (typeof initialState)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function pickFile(
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File) => void,
    setPreview: (s: string) => void,
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("File too large. Max 5 MB."); return; }
    setError("");
    setFile(file);
    // HEIC/HEIF can't be previewed in browsers — show filename badge instead
    if (/heic|heif/i.test(file.type) || /\.heic$|\.heif$/i.test(file.name)) {
      setPreview("__name__:" + file.name);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPreview((ev.target?.result as string) || ("__name__:" + file.name));
    reader.onerror = () => setPreview("__name__:" + file.name);
    reader.readAsDataURL(file);
  }

  const handleNextFromDetails = () => {
    if (!form.fullName.trim()) { setError("Enter tenant name to continue."); return; }
    setError("");
    setStep(2);
  };

  const handleNextFromEmergency = () => {
    setError("");
    setStep(3);
  };

  const handleNextFromPayment = () => {
    if (!form.paidOnDate) { setError("Enter joining / start date."); return; }
    setError("");
    setStep(4);
  };

  const handleNextFromFamily = () => {
    void handleSubmit();
  };

  const handleSubmit = async () => {
    if (!form.fullName.trim()) { setError("Tenant name is required."); return; }
    if (!form.paidOnDate) { setError("Enter joining / start date."); return; }
    if (submitting) return;

    setSubmitting(true);
    setError("");

    let receiptUrl: string | undefined;

    try {
      if (receiptFile) receiptUrl = await uploadDocument(receiptFile, "receipt");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Receipt upload failed.");
      setSubmitting(false);
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      fatherName: form.fatherName.trim() || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      phone: form.phone || undefined,
      email: form.email.trim() || undefined,
      occupation: form.occupation || undefined,
      workplaceName: form.workplaceName.trim() || undefined,
      idType: form.idType || undefined,
      idNumber: form.idNumber.trim() || undefined,
      emergencyContactName: form.emergencyContactName.trim() || undefined,
      emergencyContactRelation: form.emergencyContactRelation || undefined,
      emergencyContactPhone: form.emergencyContactPhone || undefined,
      monthlyRent: form.monthlyRent,
      rentPaid: form.rentPaid || "0",
      advanceAmount: form.advanceAmount || "0",
      serviceFeeAmount: form.serviceFeeAmount || "0",
      paidOnDate: form.paidOnDate,
      firstPaymentReceiptUrl: receiptUrl,
      billingCycle,
      hostelId: hostelId ?? undefined,
    };

    let created: TenantRecord;
    try {
      const { response, data } = await createTenant(payload);
      if (!response.ok) {
        setError(data.message ?? "Unable to create tenant.");
        setSubmitting(false);
        return;
      }
      created = data.tenant as TenantRecord;
    } catch {
      setError("Network error. Check your connection and try again.");
      setSubmitting(false);
      return;
    }

    // Family members (RESIDENCE)
    if (isResidence) {
      const validMembers = familyMembers
        .filter((m) => m.name.trim() && m.relation.trim())
        .map((m) => ({ name: m.name.trim(), relation: m.relation.trim(), age: m.age ? Number(m.age) : undefined }));
      if (validMembers.length > 0) {
        try { await updateTenantFamilyMembers({ tenantId: created.tenantId, familyMembers: validMembers }); } catch { /* non-fatal */ }
      }
    }


    onCreated(created);
    resetFormState();
    onClose();
  };

  const updateFamilyMember = (id: string, key: keyof Omit<FamilyMemberForm, "id">, value: string) =>
    setFamilyMembers((cur) => cur.map((m) => m.id === id ? { ...m, [key]: value } : m));

  return (
    <div
      {...(!asPage && { role: "dialog", "aria-modal": "true" })}
      aria-labelledby="tenant-form-modal-title"
      className={asPage
        ? "w-full"
        : "fixed inset-0 z-50 flex items-stretch justify-center overflow-hidden animate-[fade-in_var(--motion-medium)_var(--ease-enter)] sm:items-center sm:px-4 sm:py-4"
      }
      {...(!asPage && { style: { background: "rgba(2,6,23,0.76)", backdropFilter: "blur(6px)" } })}
    >
      <Card className={asPage
        ? "flex w-full flex-col overflow-hidden rounded-none border-white/8 bg-[linear-gradient(180deg,#111114_0%,#09090b_100%)] p-0"
        : "flex w-full h-full flex-col overflow-hidden rounded-none border-white/8 bg-[linear-gradient(180deg,#111114_0%,#09090b_100%)] p-0 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] animate-[float-up_var(--motion-medium)_var(--ease-enter)] sm:w-[min(calc(100vw-2rem),42rem)] sm:h-auto sm:max-h-[88dvh] sm:rounded-2xl sm:shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
      }>
        <div className={asPage ? "relative flex flex-col" : "relative flex min-h-0 flex-1 flex-col overflow-hidden"}>
          <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(90deg,rgba(99,102,241,0.14)_0%,rgba(245,158,11,0.06)_100%)]" />

          {/* Header */}
          <div className="relative flex items-start justify-between gap-4 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
            <div>
              <div id="tenant-form-modal-title" className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[13px] font-semibold text-white/70">
                <span className="rounded-[8px] bg-[var(--accent-strong)] p-1 text-white">
                  <User className="h-3.5 w-3.5" />
                </span>
                Add Tenant
              </div>
              <p className="mt-2 text-[11px] leading-5 text-white/45">Only name is required. Add other details now or later.</p>
            </div>
            {!asPage && (
              <Button variant="ghost" disabled={submitting} aria-label="Close" className="rounded-2xl px-3 text-white/60 hover:text-white" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Step pills — fixed, never scrolls */}
          <div className="relative shrink-0 overflow-x-auto border-b border-white/8 px-4 py-2.5 sm:px-5" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-2" style={{ WebkitOverflowScrolling: "touch" }}>
              <StepPill label="1. Personal" active={step === 1} done={step > 1} />
              <StepPill label="2. Emergency" active={step === 2} done={step > 2} />
              <StepPill label="3. Payment" active={step === 3} done={step > 3} />
              {isResidence ? <StepPill label="4. Family" active={step === familyStep} done={step > familyStep} /> : null}
            </div>
          </div>

          {/* Scrollable content */}
          <div
            ref={scrollRef}
            className={asPage
              ? "relative overflow-x-hidden px-4 pb-4 pt-3 sm:px-5"
              : "relative min-h-0 flex-1 overflow-x-hidden overflow-y-scroll px-4 pb-4 pt-3 sm:px-5"
            }
            {...(!asPage && { style: { WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" } })}
          >
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">

              {/* ── Step 1: Details ── */}
              {step === 1 ? (
                <>
                  <SectionHead title="Personal Details" subtitle="Name is the only required field. Everything else can be added later." />

                  <div className="grid gap-3">
                    <Field label="Full Name *">
                      <InputShell icon={<User className="h-4 w-4 text-[var(--accent)]" />}>
                        <input
                          value={form.fullName}
                          onChange={(e) => setField("fullName", e.target.value)}
                          disabled={submitting}
                          placeholder="Enter full name"
                          className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                        />
                      </InputShell>
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Father / Mother Name">
                        <InputShell icon={<UserCheck className="h-4 w-4 text-purple-400" />}>
                          <input
                            value={form.fatherName}
                            onChange={(e) => setField("fatherName", e.target.value)}
                            disabled={submitting}
                            placeholder="Parent name (optional)"
                            className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                          />
                        </InputShell>
                      </Field>

                      <Field label="Date of Birth">
                        <InputShell icon={<CalendarDays className="h-4 w-4 text-sky-400" />}>
                          <input
                            type="date"
                            value={form.dateOfBirth}
                            onChange={(e) => setField("dateOfBirth", e.target.value)}
                            disabled={submitting}
                            className="w-full bg-transparent text-[13px] text-white outline-none [color-scheme:dark]"
                          />
                        </InputShell>
                      </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Phone">
                        <InputShell icon={<Phone className="h-4 w-4 text-emerald-500" />}>
                          <span className="text-[13px] font-medium text-white/50">+91</span>
                          <input
                            value={formatPhoneDisplay(form.phone)}
                            onChange={(e) => setField("phone", normalizePhone(e.target.value))}
                            disabled={submitting}
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="98765 43210"
                            className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                          />
                        </InputShell>
                      </Field>

                      <Field label="Email">
                        <InputShell icon={<Mail className="h-4 w-4 text-amber-400" />}>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setField("email", e.target.value)}
                            disabled={submitting}
                            placeholder="email@example.com"
                            className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                          />
                        </InputShell>
                      </Field>
                    </div>
                  </div>

                  {/* Occupation & ID Type — Occupation is nth(0), ID Type is nth(1) */}
                  <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[12px] font-semibold text-white/60">ID &amp; Occupation <span className="font-normal text-white/35">(optional)</span></p>
                    <Field label="Occupation">
                      <div className="relative">
                        <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
                        <select
                          value={form.occupation}
                          onChange={(e) => { setField("occupation", e.target.value as OccupationType); setField("workplaceName", ""); }}
                          disabled={submitting}
                          className="w-full appearance-none rounded-2xl border border-white/12 bg-white/[0.06] py-3 pl-10 pr-4 text-[13px] text-white outline-none [color-scheme:dark]"
                        >
                          <option value="">Select…</option>
                          {(Object.entries(OCCUPATION_LABELS) as [Exclude<OccupationType, "">, string][]).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </Field>
                    {form.occupation ? (
                      <Field label={form.occupation === "student" ? "Institute Name" : "Company / Business Name"}>
                        <InputShell icon={<Building2 className="h-4 w-4 text-sky-400" />}>
                          <input
                            value={form.workplaceName}
                            onChange={(e) => setField("workplaceName", e.target.value)}
                            disabled={submitting}
                            placeholder={WORKPLACE_PLACEHOLDER[form.occupation as Exclude<OccupationType, "">]}
                            className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                          />
                        </InputShell>
                      </Field>
                    ) : null}
                    <Field label="ID Type">
                      <div className="relative">
                        <FileBadge2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--accent)]" />
                        <select
                          value={form.idType}
                          onChange={(e) => setField("idType", e.target.value as IdType)}
                          disabled={submitting}
                          className="w-full appearance-none rounded-2xl border border-white/12 bg-white/[0.06] py-3 pl-10 pr-4 text-[13px] text-white outline-none [color-scheme:dark]"
                        >
                          <option value="">Select ID type…</option>
                          {(Object.entries(ID_TYPE_LABELS) as [Exclude<IdType, "">, string][]).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </Field>
                    {form.idType ? (
                      <Field label="ID Number">
                        <InputShell icon={<CreditCard className="h-4 w-4 text-[var(--accent)]" />}>
                          <input
                            value={form.idNumber}
                            onChange={(e) => setField("idNumber", e.target.value)}
                            disabled={submitting}
                            placeholder={form.idType === "pan" ? "e.g. ABCDE1234F" : form.idType === "aadhar" ? "e.g. 1234 5678 9012" : "Enter ID number"}
                            className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                          />
                        </InputShell>
                      </Field>
                    ) : null}
                  </div>

                  {/* Emergency Contact intentionally removed from step 1 — collected in step 2 */}
                </>
              ) : null}

              {/* ── Step 2: Emergency Contact ── */}
              {step === 2 ? (
                <>
                  <SectionHead title="Emergency Contact" subtitle="Fully optional — skip now, add later via Edit Tenant." />

                  {(allTenants?.length ?? 0) > 0 && (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 space-y-2">
                      <p className="text-[11px] text-white/40">Find existing tenant to auto-fill</p>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                        <input
                          value={ecSearch}
                          onChange={(e) => setEcSearch(e.target.value)}
                          disabled={submitting}
                          placeholder="Name, phone, or room number…"
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-[12px] text-white outline-none placeholder:text-white/25"
                        />
                      </div>
                      {ecSearchResults.length > 0 && (
                        <div className="space-y-1">
                          {ecSearchResults.map((t) => (
                            <button
                              key={t.tenantId}
                              type="button"
                              disabled={submitting}
                              onClick={() => {
                                setField("emergencyContactName", t.fullName);
                                setField("emergencyContactPhone", t.phone);
                                setEcSearch("");
                              }}
                              className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-left transition hover:bg-white/[0.09]"
                            >
                              <User className="h-3.5 w-3.5 shrink-0 text-white/35" />
                              <span className="flex-1 truncate text-[12px] font-medium text-white">{t.fullName}</span>
                              {t.phone ? <span className="shrink-0 text-[11px] text-white/40">{t.phone}</span> : null}
                              {t.assignment?.roomNumber ? (
                                <span className="shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] text-white/40">
                                  Rm {t.assignment.roomNumber}
                                </span>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <Field label="Contact Name">
                      <InputShell icon={<ShieldAlert className="h-4 w-4 text-amber-400" />}>
                        <input
                          value={form.emergencyContactName}
                          onChange={(e) => setField("emergencyContactName", e.target.value)}
                          disabled={submitting}
                          placeholder="Name of emergency contact"
                          className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                        />
                      </InputShell>
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Relation">
                        <div className="relative">
                          <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
                          <select
                            value={form.emergencyContactRelation}
                            onChange={(e) => setField("emergencyContactRelation", e.target.value as EmergencyRelation)}
                            disabled={submitting}
                            className="w-full appearance-none rounded-2xl border border-white/12 bg-white/[0.06] py-3 pl-10 pr-4 text-[13px] text-white outline-none [color-scheme:dark]"
                          >
                            <option value="">Relation…</option>
                            {(Object.entries(RELATION_LABELS) as [Exclude<EmergencyRelation, "">, string][]).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </Field>
                      <Field label="Phone">
                        <InputShell icon={<Phone className="h-4 w-4 text-emerald-500" />}>
                          <span className="text-[13px] font-medium text-white/50">+91</span>
                          <input
                            value={formatPhoneDisplay(form.emergencyContactPhone)}
                            onChange={(e) => setField("emergencyContactPhone", normalizePhone(e.target.value))}
                            disabled={submitting}
                            type="tel"
                            inputMode="tel"
                            placeholder="98765 43210"
                            className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                          />
                        </InputShell>
                      </Field>
                    </div>
                  </div>
                </>
              ) : null}

              {/* ── Step 3: Payment ── */}
              {step === 3 ? (
                <>
                  <SectionHead title="Payment Details" subtitle="Track rent, refundable advance, and one-time service fee separately." />

                  <div className="grid gap-2 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-2xl border border-[rgba(99,102,241,0.26)] bg-[rgba(99,102,241,0.09)] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-200/70">First due preview</p>
                      <p className="mt-1 text-sm font-semibold text-white">{duePreview}</p>
                      <p className="mt-1 text-[11px] text-indigo-100/60">
                        {billingCycle === "monthly" ? "One month from joining." : billingCycle === "weekly" ? "7 days from joining." : "Next day from joining."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">Rent coverage</p>
                      <p className="mt-1 text-sm font-semibold text-white">{paymentCoverage}% of first cycle</p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#22c55e_0%,#6366f1_100%)] transition-[width] duration-300" style={{ width: `${paymentCoverage}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label={billingCycle === "daily" ? "Daily Rate" : billingCycle === "weekly" ? "Weekly Rate" : "Monthly Rent *"}>
                      <InputShell icon={<IndianRupee className="h-4 w-4 text-[var(--accent)]" />}>
                        <span className="text-[13px] font-semibold text-white/55">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={form.monthlyRent}
                          onChange={(e) => setField("monthlyRent", e.target.value)}
                          disabled={submitting}
                          placeholder="Enter amount"
                          className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                        />
                      </InputShell>
                    </Field>

                    <Field label="Rent Collected">
                      <InputShell icon={<CreditCard className="h-4 w-4 text-[var(--accent)]" />}>
                        <input
                          type="number"
                          min="0"
                          value={form.rentPaid}
                          onChange={(e) => setField("rentPaid", e.target.value)}
                          disabled={submitting}
                          placeholder="Rent amount collected"
                          className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                        />
                      </InputShell>
                    </Field>

                    <Field label="Refundable Advance">
                      <InputShell icon={<IndianRupee className="h-4 w-4 text-emerald-400" />}>
                        <input
                          type="number"
                          min="0"
                          value={form.advanceAmount}
                          onChange={(e) => setField("advanceAmount", e.target.value)}
                          disabled={submitting}
                          placeholder="0 if not collected"
                          className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                        />
                      </InputShell>
                    </Field>

                    <Field label="One-time Service Fee">
                      <InputShell icon={<Receipt className="h-4 w-4 text-amber-400" />}>
                        <input
                          type="number"
                          min="0"
                          value={form.serviceFeeAmount}
                          onChange={(e) => setField("serviceFeeAmount", e.target.value)}
                          disabled={submitting}
                          placeholder="0 if not collected"
                          className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                        />
                      </InputShell>
                    </Field>

                    <Field label="Joining / Billing Date *">
                      <InputShell icon={<CalendarDays className="h-4 w-4 text-sky-500" />}>
                        <input
                          type="date"
                          value={form.paidOnDate}
                          onChange={(e) => setField("paidOnDate", e.target.value)}
                          disabled={submitting}
                          className="w-full bg-transparent text-[13px] text-white outline-none [color-scheme:dark]"
                        />
                      </InputShell>
                    </Field>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/70">First Payment Total</p>
                        <p className="mt-1 text-[11px] text-white/45">Rent collected + advance + service fee</p>
                      </div>
                      <p className="text-base font-semibold text-white">Rs {firstPaymentTotal.toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  <div>
                    <span className="mb-2 block text-[12px] font-semibold text-white/70">Billing Cycle</span>
                    <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/12 bg-white/[0.04] p-1.5 sm:grid-cols-3">
                      {(["monthly", "weekly", "daily"] as const).map((cycle) => {
                        const labels = { monthly: "Monthly", weekly: "Weekly", daily: "Daily" };
                        const hints = { monthly: "Calendar month", weekly: "7 days", daily: "Per night" };
                        const active = billingCycle === cycle;
                        return (
                          <button
                            key={cycle}
                            type="button"
                            disabled={submitting}
                            onClick={() => setBillingCycle(cycle)}
                            className={`flex flex-col items-center rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                              active
                                ? cycle === "monthly" ? "bg-blue-600 text-white shadow-sm"
                                  : cycle === "weekly" ? "bg-emerald-600 text-white shadow-sm"
                                  : "bg-amber-500 text-white shadow-sm"
                                : "text-white/50 hover:bg-white/[0.06]"
                            }`}
                          >
                            {labels[cycle]}
                            <span className={`mt-0.5 text-[9px] font-medium ${active ? "text-white/75" : "text-white/30"}`}>{hints[cycle]}</span>
                          </button>
                        );
                      })}
                    </div>
                    {billingCycle !== "monthly" ? (
                      <p className="mt-2 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                        {billingCycle === "daily" ? "Daily tenants are free — not counted in plan limit." : "Weekly tenants are free — not counted in plan limit."}
                      </p>
                    ) : null}
                  </div>

                  {firstPaymentEntered ? (
                    <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
                      <p className="text-[12px] font-semibold text-emerald-300/80">
                        <Receipt className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                        Payment Receipt / Screenshot <span className="font-normal text-white/35">(optional)</span>
                      </p>
                      <input
                        ref={receiptInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={(e) => pickFile(e, setReceiptFile, setReceiptPreview)}
                      />
                      {receiptPreview ? (
                        <div className="relative inline-block">
                          {receiptFile?.type === "application/pdf" ? (
                            <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3">
                              <Receipt className="h-5 w-5 text-emerald-400" />
                              <span className="text-[13px] text-white/70 truncate max-w-[180px]">{receiptFile.name}</span>
                            </div>
                          ) : (
                            <img
                              src={receiptPreview}
                              alt="Receipt preview"
                              className="h-32 w-full max-w-xs rounded-2xl object-cover border border-white/12"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => { setReceiptFile(null); setReceiptPreview(""); }}
                            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-md"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => receiptInputRef.current?.click()}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.04] py-4 text-emerald-400/60 transition hover:border-emerald-500/50 hover:bg-emerald-500/[0.08] hover:text-emerald-400"
                        >
                          <Upload className="h-4 w-4" />
                          <span className="text-[12px] font-medium">Upload receipt or screenshot</span>
                        </button>
                      )}
                    </div>
                  ) : null}
                </>
              ) : null}

              {/* ── Step 5 (RESIDENCE): Family Members ── */}
              {step === familyStep && isResidence ? (
                <>
                  <SectionHead title="Family Members" subtitle="Add people living in this unit. Fully optional — add or update anytime." />

                  <div className="space-y-2">
                    {familyMembers.map((member, index) => (
                      <div key={member.id} className="rounded-2xl border border-white/12 bg-white/[0.06] p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-white/60">Member {index + 1}</span>
                          {familyMembers.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => setFamilyMembers((cur) => cur.filter((m) => m.id !== member.id))}
                              disabled={submitting}
                              className="rounded-full p-1 text-white/30 hover:bg-red-500/15 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Field label="Name">
                            <InputShell icon={<User className="h-4 w-4 text-[var(--accent)]" />}>
                              <input value={member.name} onChange={(e) => updateFamilyMember(member.id, "name", e.target.value)} disabled={submitting} placeholder="Full name" className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25" />
                            </InputShell>
                          </Field>
                          <Field label="Relation">
                            <InputShell icon={<Users className="h-4 w-4 text-purple-500" />}>
                              <input value={member.relation} onChange={(e) => updateFamilyMember(member.id, "relation", e.target.value)} disabled={submitting} placeholder="e.g. Spouse" className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25" />
                            </InputShell>
                          </Field>
                          <Field label="Age">
                            <InputShell icon={<CalendarDays className="h-4 w-4 text-amber-500" />}>
                              <input type="number" min="0" max="120" value={member.age} onChange={(e) => updateFamilyMember(member.id, "age", e.target.value)} disabled={submitting} placeholder="Age" className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25" />
                            </InputShell>
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setFamilyMembers((cur) => [...cur, createFamilyMember()])}
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-500/40 bg-blue-600/10 px-3 py-2.5 text-[13px] font-medium text-blue-400 transition hover:bg-blue-600/15"
                  >
                    <Plus className="h-4 w-4" />
                    Add Member
                  </button>
                </>
              ) : null}


            </div>
          </div>

          {/* Sticky footer — always visible at bottom, never inside scrollable area */}
          <div className={asPage
            ? "sticky bottom-0 z-10 border-t border-white/10 bg-[#09090b] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-5"
            : "shrink-0 border-t border-white/10 bg-[#09090b] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-5"
          }>
            {/* Error and processing */}
            {error ? (
              <div className="mb-3 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
            {submitting ? <div className="mb-3"><ProcessingPill label="Creating tenant…" /></div> : null}

            {/* Action buttons */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                variant="secondary"
                onClick={step === 1 ? handleClose : () => { setStep((s) => (s - 1) as TenantStep); setError(""); }}
                disabled={submitting}
                className="w-full rounded-2xl border-white/12 bg-white/[0.05] text-white/70 hover:text-white sm:flex-1"
              >
                {step === 1 ? "Cancel" : "Back"}
              </Button>

              {step === 1 ? (
                <Button disabled={submitting} onClick={handleNextFromDetails} className="w-full rounded-2xl sm:flex-1">
                  Continue
                </Button>
              ) : null}

              {step === 2 ? (
                <Button disabled={submitting} onClick={handleNextFromEmergency} className="w-full rounded-2xl sm:flex-1">
                  Continue to Payment
                </Button>
              ) : null}

              {step === 3 ? (
                <Button onClick={isResidence ? handleNextFromPayment : handleSubmit} disabled={submitting} loading={!isResidence && submitting} className="w-full rounded-2xl sm:flex-1">
                  {submitting && !isResidence ? "Saving…" : isResidence ? "Next: Family" : "Save Tenant"}
                </Button>
              ) : null}

              {step === familyStep && isResidence ? (
                <Button onClick={handleNextFromFamily} disabled={submitting} loading={submitting} className="w-full rounded-2xl sm:flex-1">
                  {submitting ? "Saving…" : "Save Tenant"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="font-display text-[15px] font-semibold text-white">{title}</h3>
      <p className="mt-1 text-[11px] text-white/45">{subtitle}</p>
    </div>
  );
}

function StepPill({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold ${
      active ? "border border-blue-500/60 bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)]"
        : done ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
        : "border border-white/12 bg-white/[0.05] text-white/40"
    }`}>
      {label}
    </span>
  );
}

function InputShell({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-3">
      <span className="shrink-0">{icon}</span>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-white/70">{label}</span>
      {children}
    </label>
  );
}

