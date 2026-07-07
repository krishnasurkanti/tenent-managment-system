"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  Briefcase,
  CalendarDays,
  CreditCard,
  FileText,
  IdCard,
  Mail,
  Phone,
  Search,
  Upload,
  User,
  UserCircle,
  X,
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

    // ── Client-side validation ────────────────────────────────────────────────
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

    // ── Upload all files first ────────────────────────────────────────────────
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

    // ── Save profile ──────────────────────────────────────────────────────────
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

  return (
    <div
      {...(!asPage && { role: "dialog", "aria-modal": "true" })}
      aria-labelledby="complete-profile-title"
      className={asPage
        ? "w-full"
        : "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4 sm:py-4"
      }
      {...(!asPage && { style: { background: "rgba(2,6,23,0.80)", backdropFilter: "blur(6px)" } })}
    >
      <Card className={asPage
        ? "flex w-full flex-col overflow-hidden rounded-[10px] border-white/8 bg-[linear-gradient(180deg,#111114_0%,#09090b_100%)] p-0"
        : "flex w-full flex-col overflow-hidden rounded-t-3xl rounded-b-none border-white/8 bg-[linear-gradient(180deg,#111114_0%,#09090b_100%)] p-0 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] sm:w-[min(calc(100vw-2rem),38rem)] sm:rounded-2xl sm:shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
      }>
        {/* Header */}
        <div className="relative shrink-0 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(90deg,rgba(249,115,22,0.1)_0%,rgba(168,85,247,0.05)_100%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p id="complete-profile-title" className="text-base font-semibold text-white">Complete Profile</p>
              <p className="mt-0.5 text-[11px] text-white/45">{tenant.fullName} · Fill in missing details</p>
            </div>
            {!asPage && (
              <Button
                variant="ghost"
                disabled={submitting || uploading}
                aria-label="Close"
                onClick={onClose}
                className="rounded-2xl px-3 text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className={asPage ? "px-4 pb-4 sm:px-5" : "max-h-[62dvh] overflow-y-auto px-4 pb-4 sm:px-5 sm:max-h-[70dvh]"} {...(!asPage && { style: { touchAction: "pan-y" } })}>
          <div className="space-y-5 pb-2">

            {/* ── Personal ── */}
            <section>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Personal</p>
              <div className="space-y-2.5">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {/* Phone */}
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Phone</span>
                    <div className={`flex items-center gap-2 rounded-2xl border bg-white/[0.06] px-3 py-2.5 ${fieldErrors.phone ? "border-red-500/70" : "border-white/12"}`}>
                      <Phone className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-[13px] font-medium text-white/50">+91</span>
                      <input
                        value={fmtPhone(phone)}
                        onChange={(e) => { setPhone(normalizePhone(e.target.value)); if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: "" })); }}
                        disabled={submitting || uploading}
                        type="tel"
                        inputMode="tel"
                        placeholder="98765 43210"
                        className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                      />
                    </div>
                    {fieldErrors.phone ? <p className="mt-1 text-[11px] font-medium text-red-400">{fieldErrors.phone}</p> : null}
                  </label>

                  {/* Email */}
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Email</span>
                    <div className={`flex items-center gap-2 rounded-2xl border bg-white/[0.06] px-3 py-2.5 ${fieldErrors.email ? "border-red-500/70" : "border-white/12"}`}>
                      <Mail className="h-4 w-4 shrink-0 text-sky-400" />
                      <input
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" })); }}
                        disabled={submitting || uploading}
                        type="email"
                        placeholder="tenant@email.com"
                        className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                      />
                    </div>
                    {fieldErrors.email ? <p className="mt-1 text-[11px] font-medium text-red-400">{fieldErrors.email}</p> : null}
                  </label>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {/* Father name */}
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Father / Mother Name</span>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                      <User className="h-4 w-4 shrink-0 text-white/30" />
                      <input
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        disabled={submitting || uploading}
                        placeholder="Parent name"
                        className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                      />
                    </div>
                  </label>

                  {/* Date of birth */}
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Date of Birth</span>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                      <CalendarDays className="h-4 w-4 shrink-0 text-white/30" />
                      <input
                        type="date"
                        value={dateOfBirth}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        disabled={submitting || uploading}
                        className="w-full bg-transparent text-[13px] text-white outline-none [color-scheme:dark]"
                      />
                    </div>
                  </label>
                </div>
              </div>
            </section>

            {/* ── Occupation ── */}
            <section>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Occupation</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Occupation Type</span>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                    <Briefcase className="h-4 w-4 shrink-0 text-violet-400" />
                    <select
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value as OccupationType | "")}
                      disabled={submitting || uploading}
                      className="w-full bg-transparent text-[13px] text-white outline-none [color-scheme:dark]"
                    >
                      <option value="">Select…</option>
                      {OCCUPATIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-white/70">
                    {occupation === "student" ? "College / School" : "Company / Workplace"}
                  </span>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                    <Briefcase className="h-4 w-4 shrink-0 text-white/30" />
                    <input
                      value={workplaceName}
                      onChange={(e) => setWorkplaceName(e.target.value)}
                      disabled={submitting || uploading}
                      placeholder={occupation === "student" ? "JNTU Hyderabad" : "Company name"}
                      className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                    />
                  </div>
                </label>
              </div>
            </section>

            {/* ── Documents ── */}
            <section>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Documents &amp; Photos</p>
              <div className="space-y-2.5">
                {/* ID type */}
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Government ID Type</span>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                    <IdCard className="h-4 w-4 shrink-0 text-amber-400" />
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value as IdType | "")}
                      disabled={submitting || uploading}
                      className="w-full bg-transparent text-[13px] text-white outline-none [color-scheme:dark]"
                    >
                      <option value="">Select ID type…</option>
                      {ID_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </label>

                {/* Photo uploads side by side */}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {/* Tenant photo */}
                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold text-white/70">Tenant Photo</p>
                    <input
                      ref={tenantPhotoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => pickPhoto(e, setTenantPhotoFile, setTenantPhotoPreview)}
                    />
                    {tenantPhotoPreview ? (
                      <div className="relative w-fit">
                        <img
                          src={tenantPhotoPreview}
                          alt="Tenant"
                          className="h-24 w-24 rounded-2xl border border-white/10 object-cover"
                        />
                        <button
                          type="button"
                          disabled={submitting || uploading}
                          onClick={() => { setTenantPhotoFile(null); setTenantPhotoPreview(""); }}
                          className="absolute -right-2 -top-2 rounded-full border border-white/20 bg-[#1a1a1f] p-1 text-white/60 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={submitting || uploading}
                          onClick={() => tenantPhotoRef.current?.click()}
                          className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] py-1.5 text-[11px] font-medium text-white/50 hover:bg-white/[0.07] transition"
                        >
                          <Upload className="h-3 w-3" />
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={submitting || uploading}
                        onClick={() => tenantPhotoRef.current?.click()}
                        className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-white/30 transition hover:border-white/25 hover:bg-white/[0.05]"
                      >
                        <UserCircle className="h-7 w-7" />
                        <span className="text-[11px] font-medium">Upload photo</span>
                      </button>
                    )}
                  </div>

                  {/* ID photo */}
                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold text-white/70">
                      {idType ? ID_TYPES.find((t) => t.value === idType)?.label ?? "Govt ID" : "Govt ID"} Photo
                    </p>
                    <input
                      ref={idPhotoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => pickPhoto(e, setIdPhotoFile, setIdPhotoPreview)}
                    />
                    {idPhotoPreview ? (
                      <div className="relative">
                        <img
                          src={idPhotoPreview}
                          alt="ID"
                          className="h-24 w-full rounded-2xl border border-white/10 object-cover"
                        />
                        <button
                          type="button"
                          disabled={submitting || uploading}
                          onClick={() => { setIdPhotoFile(null); setIdPhotoPreview(""); }}
                          className="absolute -right-2 -top-2 rounded-full border border-white/20 bg-[#1a1a1f] p-1 text-white/60 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={submitting || uploading}
                          onClick={() => idPhotoRef.current?.click()}
                          className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] py-1.5 text-[11px] font-medium text-white/50 hover:bg-white/[0.07] transition"
                        >
                          <Upload className="h-3 w-3" />
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={submitting || uploading}
                        onClick={() => idPhotoRef.current?.click()}
                        className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-white/30 transition hover:border-white/25 hover:bg-white/[0.05]"
                      >
                        <CreditCard className="h-7 w-7" />
                        <span className="text-[11px] font-medium">Upload ID photo</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Signed agreement — multi-file */}
                <div className="mt-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold text-white/70">
                      Signed Agreement <span className="font-normal text-white/35">(optional)</span>
                    </p>
                    {totalAgreementCount > 0 && !hasAgreementPdf && totalAgreementCount < 4 && (
                      <button
                        type="button"
                        disabled={submitting || uploading}
                        onClick={() => agreementRef.current?.click()}
                        className="text-[11px] font-medium text-blue-400 hover:text-blue-300 disabled:opacity-40"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                  <input
                    ref={agreementRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                    className="hidden"
                    onChange={pickAgreementFiles}
                  />
                  {totalAgreementCount === 0 ? (
                    <button
                      type="button"
                      disabled={submitting || uploading}
                      onClick={() => agreementRef.current?.click()}
                      className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-500/25 bg-blue-500/[0.03] text-blue-400/50 transition hover:border-blue-500/40 hover:bg-blue-500/[0.07] hover:text-blue-400 disabled:opacity-40"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="text-[11px] font-medium">Upload signed agreement</span>
                    </button>
                  ) : hasAgreementPdf ? (
                    <div className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-blue-400" />
                        <a
                          href={existingAgreementUrls[0] ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] text-white/70 truncate hover:text-blue-300"
                        >
                          {agreementFiles[0]?.name ?? "Agreement (PDF)"}
                        </a>
                      </div>
                      <button
                        type="button"
                        disabled={submitting || uploading}
                        onClick={() => { setExistingAgreementUrls([]); setAgreementFiles([]); setAgreementFilePreviews([]); }}
                        className="ml-2 shrink-0 rounded-full p-1 text-white/40 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {/* Existing server images */}
                      {existingAgreementUrls.map((url, i) => (
                        <div key={`ex-${i}`} className="relative">
                          <img src={url} alt={`Agreement ${i + 1}`} className="h-20 w-full rounded-xl object-cover border border-white/12" />
                          <button
                            type="button"
                            disabled={submitting || uploading}
                            onClick={() => setExistingAgreementUrls((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white shadow-md disabled:opacity-40"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                      {/* New file previews */}
                      {agreementFilePreviews.map((preview, i) => (
                        <div key={`new-${i}`} className="relative">
                          <img src={preview} alt={`New ${i + 1}`} className="h-20 w-full rounded-xl object-cover border border-white/12" />
                          <button
                            type="button"
                            disabled={submitting || uploading}
                            onClick={() => {
                              setAgreementFiles((prev) => prev.filter((_, idx) => idx !== i));
                              setAgreementFilePreviews((prev) => prev.filter((_, idx) => idx !== i));
                            }}
                            className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white shadow-md disabled:opacity-40"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                      {totalAgreementCount < 4 && (
                        <button
                          type="button"
                          disabled={submitting || uploading}
                          onClick={() => agreementRef.current?.click()}
                          className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-white/30 transition hover:border-blue-500/30 hover:text-blue-400 disabled:opacity-40"
                        >
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
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Emergency Contact</p>
              <div className="space-y-2.5">

                {/* Quick-fill from existing tenant */}
                {(allTenants?.length ?? 0) > 0 && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-2.5 space-y-2">
                    <p className="text-[11px] text-white/40">Find existing tenant to auto-fill</p>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                      <input
                        value={ecSearch}
                        onChange={(e) => setEcSearch(e.target.value)}
                        disabled={submitting || uploading}
                        placeholder="Name, phone, or room…"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-[12px] text-white outline-none placeholder:text-white/25"
                      />
                    </div>
                    {ecSearchResults.length > 0 && (
                      <div className="space-y-1">
                        {ecSearchResults.map((t) => (
                          <button
                            key={t.tenantId}
                            type="button"
                            disabled={submitting || uploading}
                            onClick={() => {
                              setEmergencyName(t.fullName);
                              setEmergencyPhone(t.phone);
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

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Name</span>
                    <div className={`flex items-center gap-2 rounded-2xl border bg-white/[0.06] px-3 py-2.5 ${fieldErrors.emergencyName ? "border-red-500/70" : "border-white/12"}`}>
                      <User className="h-4 w-4 shrink-0 text-red-400" />
                      <input
                        value={emergencyName}
                        onChange={(e) => { setEmergencyName(e.target.value); if (fieldErrors.emergencyName) setFieldErrors((p) => ({ ...p, emergencyName: "" })); }}
                        disabled={submitting || uploading}
                        placeholder="Contact name"
                        className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                      />
                    </div>
                    {fieldErrors.emergencyName ? <p className="mt-1 text-[11px] font-medium text-red-400">{fieldErrors.emergencyName}</p> : null}
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Relation</span>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                      <User className="h-4 w-4 shrink-0 text-white/30" />
                      <select
                        value={emergencyRelation}
                        onChange={(e) => setEmergencyRelation(e.target.value as EmergencyRelation | "")}
                        disabled={submitting || uploading}
                        className="w-full bg-transparent text-[13px] text-white outline-none [color-scheme:dark]"
                      >
                        <option value="">Select…</option>
                        {RELATIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Phone</span>
                  <div className={`flex items-center gap-2 rounded-2xl border bg-white/[0.06] px-3 py-2.5 ${fieldErrors.emergencyPhone ? "border-red-500/70" : "border-white/12"}`}>
                    <Phone className="h-4 w-4 shrink-0 text-white/30" />
                    <span className="text-[13px] font-medium text-white/50">+91</span>
                    <input
                      value={fmtPhone(emergencyPhone)}
                      onChange={(e) => { setEmergencyPhone(normalizePhone(e.target.value)); if (fieldErrors.emergencyPhone) setFieldErrors((p) => ({ ...p, emergencyPhone: "" })); }}
                      disabled={submitting || uploading}
                      type="tel"
                      inputMode="tel"
                      placeholder="98765 43210"
                      className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                    />
                  </div>
                  {fieldErrors.emergencyPhone ? <p className="mt-1 text-[11px] font-medium text-red-400">{fieldErrors.emergencyPhone}</p> : null}
                </label>
              </div>
            </section>

            {/* Error + processing */}
            {error ? (
              <div className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
            {uploading ? <ProcessingPill label="Uploading documents…" /> : null}
            {submitting ? <ProcessingPill label="Saving profile…" /> : null}

            {/* Action buttons */}
            <div className={asPage
              ? "sticky bottom-0 z-10 -mx-4 sm:-mx-5 flex flex-col-reverse gap-3 border-t border-white/10 bg-[#09090b] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:px-5"
              : "flex flex-col-reverse gap-3 border-t border-white/10 pt-3 sm:flex-row"
            }>
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={submitting || uploading}
                className="w-full rounded-2xl border-white/12 bg-white/[0.05] text-white/70 hover:text-white sm:flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={submitting || uploading}
                className="w-full rounded-2xl bg-[linear-gradient(90deg,#c2410c_0%,#ea580c_100%)] text-white shadow-[0_10px_24px_rgba(194,65,12,0.3)] sm:flex-1"
              >
                {uploading ? "Uploading…" : submitting ? "Saving…" : "Save Profile"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
