"use client";

import { useRef, useState } from "react";
import {
  AlertCircle, Briefcase, CalendarDays, CreditCard, FileText, IdCard,
  Mail, Phone, Search, Upload, User, UserCircle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { csrfFetch } from "@/lib/csrf-client";
import type { EmergencyRelation, IdType, OccupationType, TenantRecord } from "@/types/tenant";

const ID_TYPES: { value: IdType; label: string }[] = [
  { value: "aadhar", label: "Aadhar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "driving_licence", label: "Driving Licence" },
  { value: "other", label: "Other Govt ID" },
];

const OCCUPATIONS: { value: OccupationType; label: string }[] = [
  { value: "employed", label: "Employed" },
  { value: "student", label: "Student" },
  { value: "self_employed", label: "Self-Employed" },
  { value: "other", label: "Other" },
];

const RELATIONS: { value: EmergencyRelation; label: string }[] = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "spouse", label: "Spouse" },
  { value: "friend", label: "Friend" },
  { value: "other", label: "Other" },
];

// Shared token classes
const LABEL = "mb-1.5 block text-[12px] font-semibold text-[color:var(--fg-secondary)]";
const SECTION = "mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-tertiary)]";
const INPUT = "w-full bg-transparent text-[13px] text-[color:var(--fg-primary)] outline-none placeholder:text-[color:var(--fg-tertiary)]";
const shell = (err?: string) =>
  `flex items-center gap-2 rounded-[var(--radius-md)] border bg-[color:var(--surface-soft)] px-3 py-2.5 ${err ? "border-[color:var(--error)]" : "border-[color:var(--border-strong)]"}`;

function normalizePhone(v: string) {
  return v.replace(/\D/g, "").replace(/^91/, "").slice(0, 10);
}
function fmtPhone(v: string) {
  const d = normalizePhone(v);
  return d.length <= 5 ? d : `${d.slice(0, 5)} ${d.slice(5)}`;
}

async function uploadDoc(file: File, docType: "tenant_photo" | "id_photo" | "agreement"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("docType", docType);
  const res = await csrfFetch("/api/tenants/upload-document", { method: "POST", body: fd });
  const json = (await res.json()) as { url?: string; message?: string };
  if (!res.ok) throw new Error(json.message ?? "Upload failed.");
  return json.url ?? "";
}

export function CompleteProfileModal({
  tenant,
  onClose,
  onSaved,
  allTenants,
  asPage = false,
}: {
  tenant: TenantRecord;
  onClose: () => void;
  onSaved: (updated: TenantRecord) => void;
  allTenants?: TenantRecord[];
  /** Render as inline page element (no overlay, no body lock) */
  asPage?: boolean;
}) {
  const [phone, setPhone] = useState(tenant.phone ?? "");
  const [email, setEmail] = useState(tenant.email ?? "");
  const [fatherName, setFatherName] = useState(tenant.fatherName ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(tenant.dateOfBirth ?? "");
  const [occupation, setOccupation] = useState<OccupationType | "">(tenant.occupation ?? "");
  const [workplaceName, setWorkplaceName] = useState(tenant.workplaceName ?? "");
  const [idType, setIdType] = useState<IdType | "">(tenant.idType ?? "");
  const [emergencyName, setEmergencyName] = useState(tenant.emergencyContactName ?? "");
  const [emergencyRelation, setEmergencyRelation] = useState<EmergencyRelation | "">(tenant.emergencyContactRelation ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(tenant.emergencyContactPhone ?? "");

  const [tenantPhotoFile, setTenantPhotoFile] = useState<File | null>(null);
  const [tenantPhotoPreview, setTenantPhotoPreview] = useState<string>(tenant.tenantPhotoUrl ?? "");
  const [idPhotoFile, setIdPhotoFile] = useState<File | null>(null);
  const [idPhotoPreview, setIdPhotoPreview] = useState<string>(tenant.idPhotoUrl ?? "");
  const [existingAgreementUrls, setExistingAgreementUrls] = useState<string[]>(tenant.agreementUrls ?? []);
  const [agreementFiles, setAgreementFiles] = useState<File[]>([]);
  const [agreementFilePreviews, setAgreementFilePreviews] = useState<string[]>([]);

  const [ecSearch, setEcSearch] = useState("");
  const ecSearchResults = (() => {
    const q = ecSearch.trim().toLowerCase();
    if (!q || !allTenants?.length) return [];
    return allTenants
      .filter((t) => t.tenantId !== tenant.tenantId && (
        t.fullName.toLowerCase().includes(q) ||
        t.phone.includes(q) ||
        (t.assignment?.roomNumber?.toLowerCase().includes(q) ?? false)
      ))
      .slice(0, 3);
  })();

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const tenantPhotoRef = useRef<HTMLInputElement>(null);
  const idPhotoRef = useRef<HTMLInputElement>(null);
  const agreementRef = useRef<HTMLInputElement>(null);

  const totalAgreementCount = existingAgreementUrls.length + agreementFiles.length;
  const hasAgreementPdf = (existingAgreementUrls.length === 1 && existingAgreementUrls[0].match(/\.pdf$/i)) ||
    (agreementFiles.length === 1 && agreementFiles[0].type === "application/pdf");

  function pickAgreementFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!picked.length) return;
    const pdf = picked.find((f) => f.type === "application/pdf");
    if (pdf) {
      if (pdf.size > 10 * 1024 * 1024) { setError("Agreement too large. Max 10 MB."); return; }
      setError("");
      setExistingAgreementUrls([]);
      setAgreementFiles([pdf]);
      setAgreementFilePreviews(["__pdf__"]);
      return;
    }
    const images = picked.filter((f) => f.type.startsWith("image/"));
    const canAdd = 4 - totalAgreementCount;
    if (canAdd <= 0) { setError("Maximum 4 agreement images."); return; }
    const oversized = images.find((f) => f.size > 10 * 1024 * 1024);
    if (oversized) { setError("File too large. Max 10 MB each."); return; }
    setError("");
    const toAdd = images.slice(0, canAdd);
    setAgreementFiles((prev) => [...prev, ...toAdd]);
    toAdd.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => setAgreementFilePreviews((p) => [...p, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }

  useLockBodyScroll(!asPage);

  const pickPhoto = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5 MB."); return; }
    setFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(String(ev.target?.result ?? ""));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (submitting || uploading) return;
    setError("");

    const fe: Record<string, string> = {};
    const phoneDigits = normalizePhone(phone);
    if (phone && phoneDigits.length !== 10) fe.phone = "Phone must be 10 digits.";
    const emailVal = email.trim();
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) fe.email = "Enter a valid email.";
    const ecPhone = normalizePhone(emergencyPhone);
    if (emergencyPhone && ecPhone.length !== 10) fe.emergencyPhone = "Emergency phone must be 10 digits.";
    if ((emergencyRelation || ecPhone) && !emergencyName.trim()) fe.emergencyName = "Enter the contact's name.";

    if (Object.keys(fe).length > 0) { setFieldErrors(fe); return; }
    setFieldErrors({});

    let tenantPhotoUrl = tenant.tenantPhotoUrl;
    let idPhotoUrl = tenant.idPhotoUrl;
    let finalAgreementUrls = existingAgreementUrls;

    const hasUploads = tenantPhotoFile || idPhotoFile || agreementFiles.length > 0;
    if (hasUploads) {
      setUploading(true);
      try {
        const [tpUrl, ipUrl, ...agUrls] = await Promise.all([
          tenantPhotoFile ? uploadDoc(tenantPhotoFile, "tenant_photo") : Promise.resolve(tenantPhotoUrl ?? ""),
          idPhotoFile ? uploadDoc(idPhotoFile, "id_photo") : Promise.resolve(idPhotoUrl ?? ""),
          ...agreementFiles.map((f) => uploadDoc(f, "agreement")),
        ]);
        if (tenantPhotoFile) tenantPhotoUrl = tpUrl;
        if (idPhotoFile) idPhotoUrl = ipUrl;
        if (agreementFiles.length > 0) finalAgreementUrls = [...existingAgreementUrls, ...agUrls];
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed. Try again.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        expectedUpdatedAt: tenant.updatedAt,
        phone: phoneDigits,
        email: emailVal,
        fatherName: fatherName.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        occupation: occupation || undefined,
        workplaceName: workplaceName.trim() || undefined,
        idType: idType || undefined,
        emergencyContactName: emergencyName.trim() || undefined,
        emergencyContactRelation: emergencyRelation || undefined,
        emergencyContactPhone: ecPhone || undefined,
      };
      if (tenantPhotoUrl !== tenant.tenantPhotoUrl) payload.tenantPhotoUrl = tenantPhotoUrl;
      if (idPhotoUrl !== tenant.idPhotoUrl) payload.idPhotoUrl = idPhotoUrl;
      if (JSON.stringify(finalAgreementUrls) !== JSON.stringify(tenant.agreementUrls ?? [])) payload.agreementUrls = finalAgreementUrls;

      const res = await csrfFetch(`/api/tenants/${encodeURIComponent(tenant.tenantId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; tenant?: TenantRecord; message?: string };

      if (!res.ok) {
        if (res.status === 409) setError("Tenant was updated elsewhere. Refresh and try again.");
        else setError(data.message ?? "Update failed. Try again.");
        return;
      }

      onSaved(data.tenant ?? { ...tenant, ...payload, tenantPhotoUrl, idPhotoUrl, agreementUrls: finalAgreementUrls } as TenantRecord);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || uploading;

  return (
    <div
      {...(!asPage && { role: "dialog", "aria-modal": "true" })}
      aria-labelledby="complete-profile-title"
      className={asPage ? "w-full" : "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4 sm:py-4"}
      {...(!asPage && { style: { background: "var(--overlay)", backdropFilter: "blur(6px)" } })}
    >
      <Card className={asPage
        ? "flex w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border-[color:var(--border)] p-0"
        : "flex w-full flex-col overflow-hidden rounded-t-[var(--radius-xl)] border-[color:var(--border)] p-0 shadow-[var(--shadow-5)] sm:w-[min(calc(100vw-2rem),38rem)] sm:rounded-[var(--radius-xl)]"
      }>
        {/* Header */}
        <div className="relative shrink-0 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p id="complete-profile-title" className="text-base font-semibold text-[color:var(--fg-primary)]">Complete Profile</p>
              <p className="mt-0.5 text-[11px] text-[color:var(--fg-tertiary)]">{tenant.fullName} · Fill in missing details</p>
            </div>
            {!asPage && (
              <button type="button" disabled={busy} aria-label="Close" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[color:var(--fg-tertiary)] hover:bg-[color:var(--muted)] hover:text-[color:var(--fg-primary)]">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className={asPage ? "px-4 pb-4 sm:px-5" : "max-h-[62dvh] overflow-y-auto px-4 pb-4 sm:px-5 sm:max-h-[70dvh]"} {...(!asPage && { style: { touchAction: "pan-y" } })}>
          <div className="flex flex-col gap-5 pb-2">

            {/* ── Personal ── */}
            <section>
              <p className={SECTION}>Personal</p>
              <div className="flex flex-col gap-2.5">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="block">
                    <span className={LABEL}>Phone</span>
                    <div className={shell(fieldErrors.phone)}>
                      <Phone className="h-4 w-4 shrink-0 text-[color:var(--success)]" />
                      <span className="text-[13px] font-medium text-[color:var(--fg-tertiary)]">+91</span>
                      <input value={fmtPhone(phone)} onChange={(e) => { setPhone(normalizePhone(e.target.value)); if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: "" })); }} disabled={busy} type="tel" inputMode="tel" placeholder="98765 43210" className={INPUT} />
                    </div>
                    {fieldErrors.phone ? <p className="mt-1 text-[11px] font-medium text-[color:var(--error)]">{fieldErrors.phone}</p> : null}
                  </label>

                  <label className="block">
                    <span className={LABEL}>Email</span>
                    <div className={shell(fieldErrors.email)}>
                      <Mail className="h-4 w-4 shrink-0 text-[color:var(--info)]" />
                      <input value={email} onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" })); }} disabled={busy} type="email" placeholder="tenant@email.com" className={INPUT} />
                    </div>
                    {fieldErrors.email ? <p className="mt-1 text-[11px] font-medium text-[color:var(--error)]">{fieldErrors.email}</p> : null}
                  </label>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="block">
                    <span className={LABEL}>Father / Mother Name</span>
                    <div className={shell()}>
                      <User className="h-4 w-4 shrink-0 text-[color:var(--fg-tertiary)]" />
                      <input value={fatherName} onChange={(e) => setFatherName(e.target.value)} disabled={busy} placeholder="Parent name" className={INPUT} />
                    </div>
                  </label>

                  <label className="block">
                    <span className={LABEL}>Date of Birth</span>
                    <div className={shell()}>
                      <CalendarDays className="h-4 w-4 shrink-0 text-[color:var(--fg-tertiary)]" />
                      <input type="date" value={dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDateOfBirth(e.target.value)} disabled={busy} className={`${INPUT} [color-scheme:dark]`} />
                    </div>
                  </label>
                </div>
              </div>
            </section>

            {/* ── Occupation ── */}
            <section>
              <p className={SECTION}>Occupation</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <label className="block">
                  <span className={LABEL}>Occupation Type</span>
                  <div className={shell()}>
                    <Briefcase className="h-4 w-4 shrink-0 text-[color:var(--accent)]" />
                    <select value={occupation} onChange={(e) => setOccupation(e.target.value as OccupationType | "")} disabled={busy} className={`${INPUT} [color-scheme:dark] [&>option]:bg-[color:var(--bg-elevated)]`}>
                      <option value="">Select…</option>
                      {OCCUPATIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </label>

                <label className="block">
                  <span className={LABEL}>{occupation === "student" ? "College / School" : "Company / Workplace"}</span>
                  <div className={shell()}>
                    <Briefcase className="h-4 w-4 shrink-0 text-[color:var(--fg-tertiary)]" />
                    <input value={workplaceName} onChange={(e) => setWorkplaceName(e.target.value)} disabled={busy} placeholder={occupation === "student" ? "JNTU Hyderabad" : "Company name"} className={INPUT} />
                  </div>
                </label>
              </div>
            </section>

            {/* ── Documents ── */}
            <section>
              <p className={SECTION}>Documents &amp; Photos</p>
              <div className="flex flex-col gap-2.5">
                <label className="block">
                  <span className={LABEL}>Government ID Type</span>
                  <div className={shell()}>
                    <IdCard className="h-4 w-4 shrink-0 text-[color:var(--warning)]" />
                    <select value={idType} onChange={(e) => setIdType(e.target.value as IdType | "")} disabled={busy} className={`${INPUT} [color-scheme:dark] [&>option]:bg-[color:var(--bg-elevated)]`}>
                      <option value="">Select ID type…</option>
                      {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </label>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {/* Tenant photo */}
                  <div>
                    <p className={LABEL}>Tenant Photo</p>
                    <input ref={tenantPhotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e, setTenantPhotoFile, setTenantPhotoPreview)} />
                    {tenantPhotoPreview ? (
                      <div className="relative w-fit">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={tenantPhotoPreview} alt="Tenant" className="h-24 w-24 rounded-[var(--radius-md)] border border-[color:var(--border)] object-cover" />
                        <RemoveBtn disabled={busy} onClick={() => { setTenantPhotoFile(null); setTenantPhotoPreview(""); }} />
                        <ChangeBtn disabled={busy} onClick={() => tenantPhotoRef.current?.click()} />
                      </div>
                    ) : (
                      <UploadBox disabled={busy} onClick={() => tenantPhotoRef.current?.click()} icon={<UserCircle className="h-7 w-7" />} label="Upload photo" />
                    )}
                  </div>

                  {/* ID photo */}
                  <div>
                    <p className={LABEL}>{idType ? ID_TYPES.find((t) => t.value === idType)?.label ?? "Govt ID" : "Govt ID"} Photo</p>
                    <input ref={idPhotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e, setIdPhotoFile, setIdPhotoPreview)} />
                    {idPhotoPreview ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={idPhotoPreview} alt="ID" className="h-24 w-full rounded-[var(--radius-md)] border border-[color:var(--border)] object-cover" />
                        <RemoveBtn disabled={busy} onClick={() => { setIdPhotoFile(null); setIdPhotoPreview(""); }} />
                        <ChangeBtn disabled={busy} onClick={() => idPhotoRef.current?.click()} />
                      </div>
                    ) : (
                      <UploadBox disabled={busy} onClick={() => idPhotoRef.current?.click()} icon={<CreditCard className="h-7 w-7" />} label="Upload ID photo" />
                    )}
                  </div>
                </div>

                {/* Signed agreement */}
                <div className="mt-2.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className={LABEL + " mb-0"}>Signed Agreement <span className="font-normal text-[color:var(--fg-tertiary)]">(optional)</span></p>
                    {totalAgreementCount > 0 && !hasAgreementPdf && totalAgreementCount < 4 && (
                      <button type="button" disabled={busy} onClick={() => agreementRef.current?.click()} className="text-[11px] font-medium text-[color:var(--accent)] hover:brightness-110 disabled:opacity-40">+ Add</button>
                    )}
                  </div>
                  <input ref={agreementRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" className="hidden" onChange={pickAgreementFiles} />
                  {totalAgreementCount === 0 ? (
                    <button type="button" disabled={busy} onClick={() => agreementRef.current?.click()} className="flex h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[color:color-mix(in_srgb,var(--brand)_25%,transparent)] bg-[color:var(--brand-soft)] text-[color:var(--accent)] transition hover:brightness-110 disabled:opacity-40">
                      <FileText className="h-4 w-4" />
                      <span className="text-[11px] font-medium">Upload signed agreement</span>
                    </button>
                  ) : hasAgreementPdf ? (
                    <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-[color:var(--accent)]" />
                        <a href={existingAgreementUrls[0] ?? "#"} target="_blank" rel="noopener noreferrer" className="truncate text-[12px] text-[color:var(--fg-secondary)] hover:text-[color:var(--accent)]">
                          {agreementFiles[0]?.name ?? "Agreement (PDF)"}
                        </a>
                      </div>
                      <button type="button" disabled={busy} onClick={() => { setExistingAgreementUrls([]); setAgreementFiles([]); setAgreementFilePreviews([]); }} className="ml-2 shrink-0 rounded-full p-1 text-[color:var(--fg-tertiary)] hover:text-[color:var(--error)]">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {existingAgreementUrls.map((url, i) => (
                        <div key={`ex-${i}`} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Agreement ${i + 1}`} className="h-20 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-strong)] object-cover" />
                          <SmallRemove disabled={busy} onClick={() => setExistingAgreementUrls((prev) => prev.filter((_, idx) => idx !== i))} />
                        </div>
                      ))}
                      {agreementFilePreviews.map((preview, i) => (
                        <div key={`new-${i}`} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={preview} alt={`New ${i + 1}`} className="h-20 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-strong)] object-cover" />
                          <SmallRemove disabled={busy} onClick={() => { setAgreementFiles((prev) => prev.filter((_, idx) => idx !== i)); setAgreementFilePreviews((prev) => prev.filter((_, idx) => idx !== i)); }} />
                        </div>
                      ))}
                      {totalAgreementCount < 4 && (
                        <button type="button" disabled={busy} onClick={() => agreementRef.current?.click()} className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-dashed border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-tertiary)] transition hover:text-[color:var(--accent)] disabled:opacity-40">
                          <Upload className="h-4 w-4" />
                          <span className="text-[10px]">Add</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Emergency Contact ── */}
            <section>
              <p className={SECTION}>Emergency Contact</p>
              <div className="flex flex-col gap-2.5">
                {(allTenants?.length ?? 0) > 0 && (
                  <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-2.5">
                    <p className="text-[11px] text-[color:var(--fg-tertiary)]">Find existing tenant to auto-fill</p>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--fg-tertiary)]" />
                      <input value={ecSearch} onChange={(e) => setEcSearch(e.target.value)} disabled={busy} placeholder="Name, phone, or room…" className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] py-2 pl-9 pr-3 text-[12px] text-[color:var(--fg-primary)] outline-none placeholder:text-[color:var(--fg-tertiary)]" />
                    </div>
                    {ecSearchResults.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {ecSearchResults.map((t) => (
                          <button key={t.tenantId} type="button" disabled={busy} onClick={() => { setEmergencyName(t.fullName); setEmergencyPhone(t.phone); setEcSearch(""); }} className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-left transition hover:bg-[color:var(--surface-strong)]">
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

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="block">
                    <span className={LABEL}>Name</span>
                    <div className={shell(fieldErrors.emergencyName)}>
                      <User className="h-4 w-4 shrink-0 text-[color:var(--error)]" />
                      <input value={emergencyName} onChange={(e) => { setEmergencyName(e.target.value); if (fieldErrors.emergencyName) setFieldErrors((p) => ({ ...p, emergencyName: "" })); }} disabled={busy} placeholder="Contact name" className={INPUT} />
                    </div>
                    {fieldErrors.emergencyName ? <p className="mt-1 text-[11px] font-medium text-[color:var(--error)]">{fieldErrors.emergencyName}</p> : null}
                  </label>

                  <label className="block">
                    <span className={LABEL}>Relation</span>
                    <div className={shell()}>
                      <User className="h-4 w-4 shrink-0 text-[color:var(--fg-tertiary)]" />
                      <select value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value as EmergencyRelation | "")} disabled={busy} className={`${INPUT} [color-scheme:dark] [&>option]:bg-[color:var(--bg-elevated)]`}>
                        <option value="">Select…</option>
                        {RELATIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                  </label>
                </div>

                <label className="block">
                  <span className={LABEL}>Phone</span>
                  <div className={shell(fieldErrors.emergencyPhone)}>
                    <Phone className="h-4 w-4 shrink-0 text-[color:var(--fg-tertiary)]" />
                    <span className="text-[13px] font-medium text-[color:var(--fg-tertiary)]">+91</span>
                    <input value={fmtPhone(emergencyPhone)} onChange={(e) => { setEmergencyPhone(normalizePhone(e.target.value)); if (fieldErrors.emergencyPhone) setFieldErrors((p) => ({ ...p, emergencyPhone: "" })); }} disabled={busy} type="tel" inputMode="tel" placeholder="98765 43210" className={INPUT} />
                  </div>
                  {fieldErrors.emergencyPhone ? <p className="mt-1 text-[11px] font-medium text-[color:var(--error)]">{fieldErrors.emergencyPhone}</p> : null}
                </label>
              </div>
            </section>

            {error ? (
              <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-3 py-2.5 text-sm font-medium text-[color:var(--error)]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
            {uploading ? <ProcessingPill label="Uploading documents…" /> : null}
            {submitting ? <ProcessingPill label="Saving profile…" /> : null}

            <div className={asPage
              ? "sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:-mx-5 sm:flex-row sm:px-5"
              : "flex flex-col-reverse gap-2 border-t border-[color:var(--border)] pt-3 sm:flex-row"
            }>
              <Button variant="secondary" fullWidth onClick={onClose} disabled={busy} className="sm:flex-1">Cancel</Button>
              <Button fullWidth onClick={() => void handleSave()} disabled={busy} className="sm:flex-1">
                {uploading ? "Uploading…" : submitting ? "Saving…" : "Save Profile"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RemoveBtn({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="absolute -right-2 -top-2 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--bg-elevated)] p-1 text-[color:var(--fg-tertiary)] hover:text-[color:var(--fg-primary)]">
      <X className="h-3 w-3" />
    </button>
  );
}

function ChangeBtn({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] py-1.5 text-[11px] font-medium text-[color:var(--fg-secondary)] transition hover:bg-[color:var(--surface-strong)]">
      <Upload className="h-3 w-3" /> Change
    </button>
  );
}

function SmallRemove({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="absolute -right-1.5 -top-1.5 rounded-full bg-[color:var(--error)] p-0.5 text-white shadow-md disabled:opacity-40">
      <X className="h-2.5 w-2.5" />
    </button>
  );
}

function UploadBox({ disabled, onClick, icon, label }: { disabled: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] text-[color:var(--fg-tertiary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-strong)]">
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}
