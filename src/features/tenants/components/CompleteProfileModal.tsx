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
}: {
  tenant: TenantRecord;
  onClose: () => void;
  onSaved: (updated: TenantRecord) => void;
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
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [agreementPreview, setAgreementPreview] = useState<string>(tenant.agreementUrl ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const tenantPhotoRef = useRef<HTMLInputElement>(null);
  const idPhotoRef = useRef<HTMLInputElement>(null);
  const agreementRef = useRef<HTMLInputElement>(null);

  useLockBodyScroll(true);

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
    setError("");
    if (submitting) return;
    setSubmitting(true);

    try {
      let tenantPhotoUrl = tenant.tenantPhotoUrl;
      let idPhotoUrl = tenant.idPhotoUrl;
      let agreementUrl = tenant.agreementUrl;

      if (tenantPhotoFile) tenantPhotoUrl = await uploadDoc(tenantPhotoFile, "tenant_photo");
      if (idPhotoFile) idPhotoUrl = await uploadDoc(idPhotoFile, "id_photo");
      if (agreementFile) agreementUrl = await uploadDoc(agreementFile, "agreement");

      const payload: Record<string, unknown> = {
        expectedUpdatedAt: tenant.updatedAt,
        phone: normalizePhone(phone),
        email: email.trim(),
        fatherName: fatherName.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        occupation: occupation || undefined,
        workplaceName: workplaceName.trim() || undefined,
        idType: idType || undefined,
        emergencyContactName: emergencyName.trim() || undefined,
        emergencyContactRelation: emergencyRelation || undefined,
        emergencyContactPhone: normalizePhone(emergencyPhone) || undefined,
      };
      if (tenantPhotoUrl !== tenant.tenantPhotoUrl) payload.tenantPhotoUrl = tenantPhotoUrl;
      if (idPhotoUrl !== tenant.idPhotoUrl) payload.idPhotoUrl = idPhotoUrl;
      if (agreementUrl !== tenant.agreementUrl) payload.agreementUrl = agreementUrl;

      const res = await csrfFetch(`/api/tenants/${encodeURIComponent(tenant.tenantId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; tenant?: TenantRecord; message?: string };

      if (!res.ok) {
        if (res.status === 409) {
          setError("Tenant was updated elsewhere. Refresh and try again.");
        } else {
          setError(data.message ?? "Update failed.");
        }
        return;
      }

      onSaved(data.tenant ?? { ...tenant, ...payload, tenantPhotoUrl, idPhotoUrl, agreementUrl } as TenantRecord);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-profile-title"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4 sm:py-4"
      style={{ background: "rgba(2,6,23,0.80)", backdropFilter: "blur(6px)" }}
    >
      <Card className="flex w-full flex-col overflow-hidden rounded-t-3xl rounded-b-none border-white/8 bg-[linear-gradient(180deg,#111114_0%,#09090b_100%)] p-0 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] sm:w-[min(calc(100vw-2rem),38rem)] sm:rounded-2xl sm:shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="relative shrink-0 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(90deg,rgba(249,115,22,0.1)_0%,rgba(168,85,247,0.05)_100%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p id="complete-profile-title" className="text-base font-semibold text-white">Complete Profile</p>
              <p className="mt-0.5 text-[11px] text-white/45">{tenant.fullName} · Fill in missing details</p>
            </div>
            <Button
              variant="ghost"
              disabled={submitting}
              aria-label="Close"
              onClick={onClose}
              className="rounded-2xl px-3 text-white/60 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="max-h-[62dvh] overflow-y-auto px-4 pb-2 sm:px-5 sm:max-h-[70dvh]">
          <div className="space-y-5 pb-2">

            {/* ── Personal ── */}
            <section>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Personal</p>
              <div className="space-y-2.5">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {/* Phone */}
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Phone</span>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                      <Phone className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-[13px] font-medium text-white/50">+91</span>
                      <input
                        value={fmtPhone(phone)}
                        onChange={(e) => setPhone(normalizePhone(e.target.value))}
                        disabled={submitting}
                        type="tel"
                        inputMode="tel"
                        placeholder="98765 43210"
                        className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                      />
                    </div>
                  </label>

                  {/* Email */}
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Email</span>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                      <Mail className="h-4 w-4 shrink-0 text-sky-400" />
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={submitting}
                        type="email"
                        placeholder="tenant@email.com"
                        className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                      />
                    </div>
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
                        disabled={submitting}
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
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        disabled={submitting}
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
                      disabled={submitting}
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
                      disabled={submitting}
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
                      disabled={submitting}
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
                          disabled={submitting}
                          onClick={() => { setTenantPhotoFile(null); setTenantPhotoPreview(""); }}
                          className="absolute -right-2 -top-2 rounded-full border border-white/20 bg-[#1a1a1f] p-1 text-white/60 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
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
                        disabled={submitting}
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
                          disabled={submitting}
                          onClick={() => { setIdPhotoFile(null); setIdPhotoPreview(""); }}
                          className="absolute -right-2 -top-2 rounded-full border border-white/20 bg-[#1a1a1f] p-1 text-white/60 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
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
                        disabled={submitting}
                        onClick={() => idPhotoRef.current?.click()}
                        className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-white/30 transition hover:border-white/25 hover:bg-white/[0.05]"
                      >
                        <CreditCard className="h-7 w-7" />
                        <span className="text-[11px] font-medium">Upload ID photo</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Signed agreement */}
                <div className="mt-2.5">
                  <p className="mb-1.5 text-[12px] font-semibold text-white/70">
                    Signed Agreement <span className="font-normal text-white/35">(optional)</span>
                  </p>
                  <input
                    ref={agreementRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                    className="hidden"
                    onChange={(e) => pickPhoto(e, setAgreementFile, setAgreementPreview)}
                  />
                  {agreementPreview ? (
                    <div className="relative">
                      {agreementFile?.type === "application/pdf" || (!agreementFile && tenant.agreementUrl?.endsWith(".pdf")) ? (
                        <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3">
                          <FileText className="h-5 w-5 text-blue-400" />
                          <span className="text-[13px] text-white/70 truncate max-w-[220px]">
                            {agreementFile?.name ?? "Agreement uploaded"}
                          </span>
                        </div>
                      ) : (
                        <img
                          src={agreementPreview}
                          alt="Agreement"
                          className="h-24 w-full rounded-2xl border border-white/10 object-cover"
                        />
                      )}
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => { setAgreementFile(null); setAgreementPreview(""); }}
                        className="absolute -right-2 -top-2 rounded-full border border-white/20 bg-[#1a1a1f] p-1 text-white/60 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => agreementRef.current?.click()}
                        className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] py-1.5 text-[11px] font-medium text-white/50 hover:bg-white/[0.07] transition"
                      >
                        <Upload className="h-3 w-3" />
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => agreementRef.current?.click()}
                      className="flex h-16 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-blue-500/25 bg-blue-500/[0.03] text-blue-400/50 transition hover:border-blue-500/40 hover:bg-blue-500/[0.07] hover:text-blue-400"
                    >
                      <FileText className="h-5 w-5" />
                      <span className="text-[11px] font-medium">Upload signed agreement</span>
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* ── Emergency Contact ── */}
            <section>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Emergency Contact</p>
              <div className="space-y-2.5">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Name</span>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                      <User className="h-4 w-4 shrink-0 text-red-400" />
                      <input
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        disabled={submitting}
                        placeholder="Contact name"
                        className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Relation</span>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                      <User className="h-4 w-4 shrink-0 text-white/30" />
                      <select
                        value={emergencyRelation}
                        onChange={(e) => setEmergencyRelation(e.target.value as EmergencyRelation | "")}
                        disabled={submitting}
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
                  <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-white/30" />
                    <span className="text-[13px] font-medium text-white/50">+91</span>
                    <input
                      value={fmtPhone(emergencyPhone)}
                      onChange={(e) => setEmergencyPhone(normalizePhone(e.target.value))}
                      disabled={submitting}
                      type="tel"
                      inputMode="tel"
                      placeholder="98765 43210"
                      className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                    />
                  </div>
                </label>
              </div>
            </section>

            {/* Error */}
            {error ? (
              <div className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
            {submitting ? <ProcessingPill label="Saving profile…" /> : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-4 py-3 sm:flex-row sm:px-5">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
            className="w-full rounded-2xl border-white/12 bg-white/[0.05] text-white/70 hover:text-white sm:flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={submitting}
            className="w-full rounded-2xl bg-[linear-gradient(90deg,#c2410c_0%,#ea580c_100%)] text-white shadow-[0_10px_24px_rgba(194,65,12,0.3)] sm:flex-1"
          >
            {submitting ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
