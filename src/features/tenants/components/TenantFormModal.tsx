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

// Shared token classes
const SELECT_CLASS =
  "w-full appearance-none rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] py-3 pl-10 pr-4 text-[13px] text-[color:var(--fg-primary)] outline-none [color-scheme:dark] [&>option]:bg-[color:var(--bg-elevated)]";
const INPUT_CLASS = "w-full bg-transparent text-[13px] text-[color:var(--fg-primary)] outline-none placeholder:text-[color:var(--fg-tertiary)]";

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

    if (isResidence) {
      const validMembers = familyMembers
        .filter((m) => m.name.trim() && m.relation.trim())
        .map((m) => ({ name: m.name.trim(), relation: m.relation.trim(), age: m.age ? Number(m.age) : undefined }));
      if (validMembers.length > 0) {
        try { await updateTenantFamilyMembers({ tenantId: created.tenantId, familyMembers: validMembers }); } catch { /* non-fatal */ }
      }
    }

    resetFormState();
    // onClose intentionally NOT called — onCreated handles navigation.
    onCreated(created);
  };

  const updateFamilyMember = (id: string, key: keyof Omit<FamilyMemberForm, "id">, value: string) =>
    setFamilyMembers((cur) => cur.map((m) => m.id === id ? { ...m, [key]: value } : m));

  return (
    <div
      {...(!asPage && { role: "dialog", "aria-modal": "true" })}
      aria-labelledby="tenant-form-modal-title"
      className={asPage
        ? "flex min-h-0 w-full flex-col"
        : "fixed inset-0 z-50 flex items-stretch justify-center overflow-hidden animate-[fade-in_var(--motion-medium)_var(--ease-enter)] sm:items-center sm:px-4 sm:py-4"
      }
      style={asPage
        ? { maxHeight: "calc(100dvh - var(--topbar-h) - 3.5rem)" }
        : { background: "var(--overlay)", backdropFilter: "blur(6px)" }}
    >
      <Card className={asPage
        ? "flex min-h-0 flex-1 flex-col rounded-none border-[color:var(--border)] p-0"
        : "flex h-full w-full flex-col overflow-hidden rounded-none border-[color:var(--border)] p-0 shadow-[var(--shadow-5)] sm:h-auto sm:max-h-[88dvh] sm:w-[min(calc(100vw-2rem),42rem)] sm:rounded-[var(--radius-xl)]"
      }>
        <div className={asPage ? "relative flex min-h-0 flex-1 flex-col" : "relative flex min-h-0 flex-1 flex-col overflow-hidden"}>
          {/* Header */}
          <div className="relative flex items-start justify-between gap-4 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
            <div>
              <div id="tenant-form-modal-title" className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-1.5 text-[13px] font-semibold text-[color:var(--fg-secondary)]">
                <span className="rounded-[var(--radius-sm)] bg-[color:var(--accent-strong)] p-1 text-white">
                  <User className="h-3.5 w-3.5" />
                </span>
                Add Tenant
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[color:var(--fg-tertiary)]">Only name is required. Add other details now or later.</p>
            </div>
            {!asPage && (
              <button
                type="button"
                disabled={submitting}
                aria-label="Close"
                onClick={handleClose}
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[color:var(--fg-tertiary)] hover:bg-[color:var(--muted)] hover:text-[color:var(--fg-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Step pills */}
          <div className="relative shrink-0 overflow-x-auto border-b border-[color:var(--border)] px-4 py-2.5 sm:px-5" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-2">
              <StepPill label="1. Personal" active={step === 1} done={step > 1} onClick={step > 1 ? () => { setStep(1); setError(""); } : undefined} />
              <StepPill label="2. Emergency" active={step === 2} done={step > 2} onClick={step > 2 ? () => { setStep(2); setError(""); } : undefined} />
              <StepPill label="3. Payment" active={step === 3} done={step > 3} onClick={step > 3 ? () => { setStep(3); setError(""); } : undefined} />
              {isResidence ? <StepPill label="4. Family" active={step === familyStep} done={step > familyStep} onClick={step > familyStep ? () => { setStep(4 as TenantStep); setError(""); } : undefined} /> : null}
            </div>
          </div>

          {/* Scrollable content */}
          <div
            ref={scrollRef}
            className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4 pt-3 sm:px-5"
            style={{ touchAction: "pan-y", overscrollBehavior: "contain" }}
          >
            <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3 sm:p-4">

              {/* ── Step 1: Details ── */}
              {step === 1 ? (
                <>
                  <SectionHead title="Personal Details" subtitle="Name is the only required field. Everything else can be added later." />

                  <div className="grid gap-3">
                    <Field label="Full Name *">
                      <InputShell icon={<User className="h-4 w-4 text-[color:var(--accent)]" />}>
                        <input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} disabled={submitting} placeholder="Enter full name" className={INPUT_CLASS} />
                      </InputShell>
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Father / Mother Name">
                        <InputShell icon={<UserCheck className="h-4 w-4 text-[color:var(--accent)]" />}>
                          <input value={form.fatherName} onChange={(e) => setField("fatherName", e.target.value)} disabled={submitting} placeholder="Parent name (optional)" className={INPUT_CLASS} />
                        </InputShell>
                      </Field>

                      <Field label="Date of Birth">
                        <InputShell icon={<CalendarDays className="h-4 w-4 text-[color:var(--info)]" />}>
                          <input type="date" value={form.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setField("dateOfBirth", e.target.value)} disabled={submitting} className={`${INPUT_CLASS} [color-scheme:dark]`} />
                        </InputShell>
                      </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Phone">
                        <InputShell icon={<Phone className="h-4 w-4 text-[color:var(--success)]" />}>
                          <span className="text-[13px] font-medium text-[color:var(--fg-tertiary)]">+91</span>
                          <input value={formatPhoneDisplay(form.phone)} onChange={(e) => setField("phone", normalizePhone(e.target.value))} disabled={submitting} type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" className={INPUT_CLASS} />
                        </InputShell>
                      </Field>

                      <Field label="Email">
                        <InputShell icon={<Mail className="h-4 w-4 text-[color:var(--warning)]" />}>
                          <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} disabled={submitting} placeholder="email@example.com" className={INPUT_CLASS} />
                        </InputShell>
                      </Field>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
                    <p className="text-[12px] font-semibold text-[color:var(--fg-secondary)]">ID &amp; Occupation <span className="font-normal text-[color:var(--fg-tertiary)]">(optional)</span></p>
                    <Field label="Occupation">
                      <div className="relative">
                        <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--warning)]" />
                        <select value={form.occupation} onChange={(e) => { setField("occupation", e.target.value as OccupationType); setField("workplaceName", ""); }} disabled={submitting} className={SELECT_CLASS}>
                          <option value="">Select…</option>
                          {(Object.entries(OCCUPATION_LABELS) as [Exclude<OccupationType, "">, string][]).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </Field>
                    {form.occupation ? (
                      <Field label={form.occupation === "student" ? "Institute Name" : "Company / Business Name"}>
                        <InputShell icon={<Building2 className="h-4 w-4 text-[color:var(--info)]" />}>
                          <input value={form.workplaceName} onChange={(e) => setField("workplaceName", e.target.value)} disabled={submitting} placeholder={WORKPLACE_PLACEHOLDER[form.occupation as Exclude<OccupationType, "">]} className={INPUT_CLASS} />
                        </InputShell>
                      </Field>
                    ) : null}
                    <Field label="ID Type">
                      <div className="relative">
                        <FileBadge2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--accent)]" />
                        <select value={form.idType} onChange={(e) => setField("idType", e.target.value as IdType)} disabled={submitting} className={SELECT_CLASS}>
                          <option value="">Select ID type…</option>
                          {(Object.entries(ID_TYPE_LABELS) as [Exclude<IdType, "">, string][]).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </Field>
                    {form.idType ? (
                      <Field label="ID Number">
                        <InputShell icon={<CreditCard className="h-4 w-4 text-[color:var(--accent)]" />}>
                          <input value={form.idNumber} onChange={(e) => setField("idNumber", e.target.value)} disabled={submitting} placeholder={form.idType === "pan" ? "e.g. ABCDE1234F" : form.idType === "aadhar" ? "e.g. 1234 5678 9012" : "Enter ID number"} className={INPUT_CLASS} />
                        </InputShell>
                      </Field>
                    ) : null}
                  </div>
                </>
              ) : null}

              {/* ── Step 2: Emergency Contact ── */}
              {step === 2 ? (
                <>
                  <SectionHead title="Emergency Contact" subtitle="Fully optional — skip now, add later via Edit Tenant." />

                  {(allTenants?.length ?? 0) > 0 && (
                    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
                      <p className="text-[11px] text-[color:var(--fg-tertiary)]">Find existing tenant to auto-fill</p>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--fg-tertiary)]" />
                        <input value={ecSearch} onChange={(e) => setEcSearch(e.target.value)} disabled={submitting} placeholder="Name, phone, or room number…" className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] py-2.5 pl-9 pr-3 text-[12px] text-[color:var(--fg-primary)] outline-none placeholder:text-[color:var(--fg-tertiary)]" />
                      </div>
                      {ecSearchResults.length > 0 && (
                        <div className="flex flex-col gap-1">
                          {ecSearchResults.map((t) => (
                            <button
                              key={t.tenantId}
                              type="button"
                              disabled={submitting}
                              onClick={() => { setField("emergencyContactName", t.fullName); setField("emergencyContactPhone", t.phone); setEcSearch(""); }}
                              className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-left transition hover:bg-[color:var(--surface-strong)]"
                            >
                              <User className="h-3.5 w-3.5 shrink-0 text-[color:var(--fg-tertiary)]" />
                              <span className="flex-1 truncate text-[12px] font-medium text-[color:var(--fg-primary)]">{t.fullName}</span>
                              {t.phone ? <span className="shrink-0 text-[11px] text-[color:var(--fg-tertiary)]">{t.phone}</span> : null}
                              {t.assignment?.roomNumber ? <span className="shrink-0 rounded-full bg-[color:var(--muted)] px-2 py-0.5 text-[10px] text-[color:var(--fg-tertiary)]">Rm {t.assignment.roomNumber}</span> : null}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
                    <Field label="Contact Name">
                      <InputShell icon={<ShieldAlert className="h-4 w-4 text-[color:var(--warning)]" />}>
                        <input value={form.emergencyContactName} onChange={(e) => setField("emergencyContactName", e.target.value)} disabled={submitting} placeholder="Name of emergency contact" className={INPUT_CLASS} />
                      </InputShell>
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Relation">
                        <div className="relative">
                          <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--accent)]" />
                          <select value={form.emergencyContactRelation} onChange={(e) => setField("emergencyContactRelation", e.target.value as EmergencyRelation)} disabled={submitting} className={SELECT_CLASS}>
                            <option value="">Relation…</option>
                            {(Object.entries(RELATION_LABELS) as [Exclude<EmergencyRelation, "">, string][]).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </Field>
                      <Field label="Phone">
                        <InputShell icon={<Phone className="h-4 w-4 text-[color:var(--success)]" />}>
                          <span className="text-[13px] font-medium text-[color:var(--fg-tertiary)]">+91</span>
                          <input value={formatPhoneDisplay(form.emergencyContactPhone)} onChange={(e) => setField("emergencyContactPhone", normalizePhone(e.target.value))} disabled={submitting} type="tel" inputMode="tel" placeholder="98765 43210" className={INPUT_CLASS} />
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
                    <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--brand)_26%,transparent)] bg-[color:var(--brand-soft)] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--accent)]">First due preview</p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--fg-primary)]">{duePreview}</p>
                      <p className="mt-1 text-[11px] text-[color:var(--fg-secondary)]">
                        {billingCycle === "monthly" ? "One month from joining." : billingCycle === "weekly" ? "7 days from joining." : "Next day from joining."}
                      </p>
                    </div>
                    <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">Rent coverage</p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--fg-primary)]">{paymentCoverage}% of first cycle</p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#22c55e_0%,#6366f1_100%)] transition-[width] duration-300" style={{ width: `${paymentCoverage}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {([
                      ["monthlyRent", billingCycle === "daily" ? "Daily Rate" : billingCycle === "weekly" ? "Weekly Rate" : "Monthly Rent *", <IndianRupee key="i" className="h-4 w-4 text-[color:var(--accent)]" />, "Enter amount", true],
                      ["rentPaid", "Rent Collected", <CreditCard key="i" className="h-4 w-4 text-[color:var(--accent)]" />, "Rent amount collected", false],
                      ["advanceAmount", "Refundable Advance", <IndianRupee key="i" className="h-4 w-4 text-[color:var(--success)]" />, "0 if not collected", false],
                      ["serviceFeeAmount", "One-time Service Fee", <Receipt key="i" className="h-4 w-4 text-[color:var(--warning)]" />, "0 if not collected", false],
                    ] as const).map(([key, label, icon, placeholder, showRupee]) => (
                      <Field key={key} label={label}>
                        <InputShell icon={icon}>
                          {showRupee ? <span className="text-[13px] font-semibold text-[color:var(--fg-tertiary)]">₹</span> : null}
                          <input
                            type="number"
                            min="0"
                            value={form[key]}
                            onChange={(e) => setField(key, e.target.value)}
                            onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault(); }}
                            disabled={submitting}
                            placeholder={placeholder}
                            className={INPUT_CLASS}
                          />
                        </InputShell>
                      </Field>
                    ))}

                    <Field label="Joining / Billing Date *">
                      <InputShell icon={<CalendarDays className="h-4 w-4 text-[color:var(--info)]" />}>
                        <input type="date" value={form.paidOnDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setField("paidOnDate", e.target.value)} disabled={submitting} className={`${INPUT_CLASS} [color-scheme:dark]`} />
                      </InputShell>
                    </Field>
                  </div>

                  <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--success)_20%,transparent)] bg-[color:var(--success-soft)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--success)]">First Payment Total</p>
                        <p className="mt-1 text-[11px] text-[color:var(--fg-tertiary)]">Rent collected + advance + service fee</p>
                      </div>
                      <p className="text-base font-semibold text-[color:var(--fg-primary)]">₹{firstPaymentTotal.toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  <div>
                    <span className="mb-2 block text-[12px] font-semibold text-[color:var(--fg-secondary)]">Billing Cycle</span>
                    <div className="grid grid-cols-2 gap-1.5 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-1.5 sm:grid-cols-3">
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
                            className={`flex flex-col items-center rounded-[var(--radius-sm)] px-2 py-2 text-[11px] font-semibold transition ${
                              active ? "bg-[color:var(--cta)] text-white" : "text-[color:var(--fg-tertiary)] hover:bg-[color:var(--surface-strong)]"
                            }`}
                          >
                            {labels[cycle]}
                            <span className={`mt-0.5 text-[9px] font-medium ${active ? "text-white/75" : "text-[color:var(--fg-tertiary)]"}`}>{hints[cycle]}</span>
                          </button>
                        );
                      })}
                    </div>
                    {billingCycle !== "monthly" ? (
                      <p className="mt-2 inline-flex rounded-full border border-[color:color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color:var(--success-soft)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--success)]">
                        {billingCycle === "daily" ? "Daily tenants are free — not counted in plan limit." : "Weekly tenants are free — not counted in plan limit."}
                      </p>
                    ) : null}
                  </div>

                  {firstPaymentEntered ? (
                    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--success)_20%,transparent)] bg-[color:var(--success-soft)] p-3">
                      <p className="text-[12px] font-semibold text-[color:var(--success)]">
                        <Receipt className="mr-1 -mt-0.5 inline h-3.5 w-3.5" />
                        Payment Receipt / Screenshot <span className="font-normal text-[color:var(--fg-tertiary)]">(optional)</span>
                      </p>
                      <input ref={receiptInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => pickFile(e, setReceiptFile, setReceiptPreview)} />
                      {receiptPreview ? (
                        <div className="relative inline-block">
                          {receiptFile?.type === "application/pdf" ? (
                            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-4 py-3">
                              <Receipt className="h-5 w-5 text-[color:var(--success)]" />
                              <span className="max-w-[180px] truncate text-[13px] text-[color:var(--fg-secondary)]">{receiptFile.name}</span>
                            </div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={receiptPreview} alt="Receipt preview" className="h-32 w-full max-w-xs rounded-[var(--radius-md)] border border-[color:var(--border-strong)] object-cover" />
                          )}
                          <button type="button" onClick={() => { setReceiptFile(null); setReceiptPreview(""); }} className="absolute -right-2 -top-2 rounded-full bg-[color:var(--error)] p-1 text-white shadow-md">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => receiptInputRef.current?.click()}
                          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[color:color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color:var(--success-soft)] py-4 text-[color:var(--success)] transition hover:brightness-110"
                        >
                          <Upload className="h-4 w-4" />
                          <span className="text-[12px] font-medium">Upload receipt or screenshot</span>
                        </button>
                      )}
                    </div>
                  ) : null}
                </>
              ) : null}

              {/* ── Step 4 (RESIDENCE): Family Members ── */}
              {step === familyStep && isResidence ? (
                <>
                  <SectionHead title="Family Members" subtitle="Add people living in this unit. Fully optional — add or update anytime." />

                  <div className="flex flex-col gap-2">
                    {familyMembers.map((member, index) => (
                      <div key={member.id} className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-[color:var(--fg-secondary)]">Member {index + 1}</span>
                          {familyMembers.length > 1 ? (
                            <button type="button" onClick={() => setFamilyMembers((cur) => cur.filter((m) => m.id !== member.id))} disabled={submitting} className="rounded-full p-1 text-[color:var(--fg-tertiary)] hover:bg-[color:var(--error-soft)] hover:text-[color:var(--error)]">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Field label="Name">
                            <InputShell icon={<User className="h-4 w-4 text-[color:var(--accent)]" />}>
                              <input value={member.name} onChange={(e) => updateFamilyMember(member.id, "name", e.target.value)} disabled={submitting} placeholder="Full name" className={INPUT_CLASS} />
                            </InputShell>
                          </Field>
                          <Field label="Relation">
                            <InputShell icon={<Users className="h-4 w-4 text-[color:var(--accent)]" />}>
                              <input value={member.relation} onChange={(e) => updateFamilyMember(member.id, "relation", e.target.value)} disabled={submitting} placeholder="e.g. Spouse" className={INPUT_CLASS} />
                            </InputShell>
                          </Field>
                          <Field label="Age">
                            <InputShell icon={<CalendarDays className="h-4 w-4 text-[color:var(--warning)]" />}>
                              <input type="number" min="0" max="120" value={member.age} onChange={(e) => updateFamilyMember(member.id, "age", e.target.value)} disabled={submitting} placeholder="Age" className={INPUT_CLASS} />
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
                    className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[color:color-mix(in_srgb,var(--brand)_40%,transparent)] bg-[color:var(--brand-soft)] px-3 py-2.5 text-[13px] font-medium text-[color:var(--accent)] transition hover:brightness-110"
                  >
                    <Plus className="h-4 w-4" />
                    Add Member
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[color:var(--border)] bg-[color:var(--bg-primary)] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-5">
            {error ? (
              <div role="alert" className="mb-3 flex items-start gap-2 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-3 py-2.5 text-sm font-medium text-[color:var(--error)]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
            {submitting ? <div className="mb-3"><ProcessingPill label="Creating tenant…" /></div> : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="secondary" fullWidth onClick={step === 1 ? handleClose : () => { setStep((s) => (s - 1) as TenantStep); setError(""); }} disabled={submitting} className="sm:flex-1">
                {step === 1 ? "Cancel" : "Back"}
              </Button>

              {step === 1 ? <Button fullWidth disabled={submitting} onClick={handleNextFromDetails} className="sm:flex-1">Continue</Button> : null}
              {step === 2 ? <Button fullWidth disabled={submitting} onClick={handleNextFromEmergency} className="sm:flex-1">Continue to Payment</Button> : null}
              {step === 3 ? (
                <Button fullWidth onClick={isResidence ? handleNextFromPayment : handleSubmit} disabled={submitting} loading={!isResidence && submitting} className="sm:flex-1">
                  {submitting && !isResidence ? "Saving…" : isResidence ? "Next: Family" : "Save Tenant"}
                </Button>
              ) : null}
              {step === familyStep && isResidence ? (
                <Button fullWidth onClick={handleNextFromFamily} disabled={submitting} loading={submitting} className="sm:flex-1">
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
      <h3 className="font-display text-[15px] font-semibold text-[color:var(--fg-primary)]">{title}</h3>
      <p className="mt-1 text-[11px] text-[color:var(--fg-tertiary)]">{subtitle}</p>
    </div>
  );
}

// X-06: done step pills are <button> so keyboard users can navigate back
function StepPill({ label, active, done, onClick }: { label: string; active: boolean; done: boolean; onClick?: () => void }) {
  const cls = `inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold ${
    active
      ? "border border-[color:color-mix(in_srgb,var(--brand)_60%,transparent)] bg-[color:var(--cta)] text-white"
      : done
        ? "cursor-pointer border border-[color:color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color:var(--success-soft)] text-[color:var(--success)] transition hover:brightness-110"
        : "border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-tertiary)]"
  }`;
  if (done && onClick) {
    return <button type="button" className={cls} onClick={onClick}>{label}</button>;
  }
  return <span className={cls}>{label}</span>;
}

function InputShell({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-3">
      <span className="shrink-0">{icon}</span>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-[color:var(--fg-secondary)]">{label}</span>
      {children}
    </label>
  );
}
