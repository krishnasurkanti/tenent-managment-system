"use client";

import { useState } from "react";
import { CalendarDays, CreditCard, FileBadge2, ImageIcon, IndianRupee, Mail, Phone, ShieldAlert, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import type { TenantRecord } from "@/types/tenant";

const initialState = {
  fullName: "",
  phone: "",
  email: "",
  monthlyRent: "",
  rentPaid: "",
  paidOnDate: new Date().toISOString().slice(0, 10),
  idNumber: "",
  emergencyContact: "",
};

type TenantStep = 1 | 2 | 3;
type TenantType = "new" | "old";

function getMissingFields(fields: Array<[label: string, valid: boolean]>) {
  return fields.filter(([, valid]) => !valid).map(([label]) => label);
}

export function TenantFormModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (tenant: TenantRecord) => void;
}) {
  const [step, setStep] = useState<TenantStep>(1);
  const [tenantType, setTenantType] = useState<TenantType>("new");
  const [form, setForm] = useState(initialState);
  const [idImage, setIdImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useLockBodyScroll(open);

  if (!open) {
    return null;
  }

  const resetFormState = () => {
    setStep(1);
    setTenantType("new");
    setForm(initialState);
    setIdImage(null);
    setSubmitting(false);
    setError("");
  };

  const handleClose = () => {
    if (submitting) {
      return;
    }

    resetFormState();
    onClose();
  };

  const handleNextFromPersonal = () => {
    const missingFields = getMissingFields([
      ["full name", Boolean(form.fullName.trim())],
      ["phone number", tenantType === "old" ? true : Boolean(form.phone.trim())],
    ]);

    if (missingFields.length > 0) {
      setError(`Complete ${missingFields.join(" and ")} before going to ID proof.`);
      return;
    }

    setError("");
    setStep(2);
  };

  const handleNextFromId = () => {
    if (tenantType === "old") {
      setError("");
      setStep(3);
      return;
    }

    const missingFields = getMissingFields([
      ["ID proof image", Boolean(idImage)],
      ["ID number", Boolean(form.idNumber.trim())],
    ]);

    if (missingFields.length > 0) {
      setError(`Add ${missingFields.join(" and ")} before going to payment.`);
      return;
    }

    setError("");
    setStep(3);
  };

  const handleSubmit = async () => {
    const missingFields = getMissingFields([
      ["full name", Boolean(form.fullName.trim())],
      ["phone number", tenantType === "old" ? true : Boolean(form.phone.trim())],
      ["ID proof image", tenantType === "old" ? true : Boolean(idImage)],
      ["ID number", tenantType === "old" ? true : Boolean(form.idNumber.trim())],
      ["monthly rent", Boolean(form.monthlyRent) && Number(form.monthlyRent) > 0],
      ["rent paid amount", Boolean(form.rentPaid) && Number(form.rentPaid) >= 0],
      ["joining date", Boolean(form.paidOnDate)],
    ]);

    if (missingFields.length > 0) {
      setError(`Cannot save tenant yet. Missing: ${missingFields.join(", ")}.`);
      return;
    }

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = new FormData();
    payload.append("fullName", form.fullName);
    payload.append("tenantType", tenantType);
    payload.append("phone", form.phone);
    payload.append("email", form.email);
    payload.append("monthlyRent", form.monthlyRent);
    payload.append("rentPaid", form.rentPaid);
    payload.append("paidOnDate", form.paidOnDate);
    payload.append("idNumber", form.idNumber);
    payload.append("emergencyContact", form.emergencyContact);
    if (idImage) {
      payload.append("idImage", idImage);
    }

    const response = await fetch("/api/tenants", {
      method: "POST",
      body: payload,
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message ?? "Unable to create tenant.");
      setSubmitting(false);
      return;
    }

    onCreated(data.tenant as TenantRecord);
    resetFormState();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(48,28,75,0.28)] px-3 py-4 sm:px-4 sm:py-8">
      <div className="flex min-h-full items-center justify-center">
        <Card className="max-h-[min(94vh,920px)] w-full max-w-2xl overflow-hidden border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(244,236,255,0.95)_100%)] p-0 shadow-[0_28px_70px_rgba(170,148,255,0.22)] backdrop-blur">
          <div className="relative flex max-h-[min(94vh,920px)] flex-col overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(90deg,rgba(136,108,255,0.1)_0%,rgba(255,170,198,0.1)_55%,rgba(255,214,165,0.08)_100%)]" />
            <div className="absolute right-4 top-8 h-24 w-24 rounded-full bg-[rgba(255,190,214,0.18)] blur-3xl" />
            <div className="absolute left-0 top-18 h-28 w-28 rounded-full bg-[rgba(152,124,255,0.14)] blur-3xl" />

            <div className="relative flex items-start justify-between gap-4 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-1.5 text-[13px] font-semibold text-slate-700 shadow-sm">
                  <span className="rounded-full bg-[linear-gradient(135deg,#8d71ff_0%,#ff8fb0_100%)] p-1 text-white">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  Add Tenant
                </div>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">Go one section at a time: personal details, ID proof, then payment.</p>
              </div>
              <Button variant="ghost" disabled={submitting} className="rounded-2xl px-3 text-slate-500 hover:bg-white/70" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative flex-1 overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="space-y-4 rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.7)_0%,rgba(247,241,255,0.9)_100%)] p-3 shadow-[0_18px_40px_rgba(170,148,255,0.12)] sm:p-4">
                <div className="flex flex-wrap gap-2">
                  <StepPill label="1. Personal" active={step === 1} done={step > 1} />
                  <StepPill label="2. ID Proof" active={step === 2} done={step > 2} />
                  <StepPill label="3. Payment" active={step === 3} done={false} />
                </div>

                {step === 1 ? (
                  <>
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-800">Personal Details</h3>
                      <p className="mt-1 text-[11px] text-slate-500">Choose tenant type first. Old tenants can be onboarded with missing details and updated later.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/80 bg-white/70 p-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setTenantType("new")}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          tenantType === "new" ? "bg-[var(--action-gradient)] text-white" : "bg-white text-slate-700"
                        }`}
                      >
                        New Tenant
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setTenantType("old")}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          tenantType === "old" ? "bg-[linear-gradient(90deg,#0ea5e9_0%,#22c55e_100%)] text-white" : "bg-white text-slate-700"
                        }`}
                      >
                        Old Tenant (Onboarding)
                      </button>
                    </div>

                    <div className="grid gap-3">
                      <Field label="Full Name *">
                        <InputShell icon={<User className="h-4 w-4 text-violet-500" />}>
                          <input
                            value={form.fullName}
                            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                            disabled={submitting}
                            className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                            placeholder="Enter full name"
                          />
                        </InputShell>
                      </Field>

                      <Field label={tenantType === "old" ? "Phone (Add Later if Needed)" : "Phone *"}>
                        <InputShell icon={<Phone className="h-4 w-4 text-emerald-500" />}>
                          <span className="text-[13px] font-medium text-slate-600">+91</span>
                          <input
                            value={form.phone}
                            onChange={(event) => setForm({ ...form, phone: event.target.value })}
                            disabled={submitting}
                            className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                            placeholder="Enter phone number"
                          />
                        </InputShell>
                      </Field>

                      <Field label="Email (Optional)">
                        <InputShell icon={<Mail className="h-4 w-4 text-orange-400" />}>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(event) => setForm({ ...form, email: event.target.value })}
                            disabled={submitting}
                            className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                            placeholder="Enter email address"
                          />
                        </InputShell>
                      </Field>

                      <Field label="Emergency Contact (Optional)">
                        <InputShell icon={<ShieldAlert className="h-4 w-4 text-amber-500" />}>
                          <span className="text-[13px] font-medium text-slate-600">+91</span>
                          <input
                            value={form.emergencyContact}
                            onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })}
                            disabled={submitting}
                            className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                            placeholder="Enter emergency contact number"
                          />
                        </InputShell>
                      </Field>
                    </div>
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-800">ID Proof</h3>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {tenantType === "old"
                          ? "ID details are optional for old tenant onboarding. You can add later."
                          : "Collect ID information and proof before final payment step."}
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <UploadCard icon={ImageIcon} title="Photo Optional" subtitle="You can add tenant photo later" tone="violet" disabled />
                      <label className={`block ${submitting ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
                        <span className="sr-only">Upload ID</span>
                        <div className="rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,#f3eaff_0%,#ece4ff_100%)] p-3 shadow-[0_12px_26px_rgba(170,148,255,0.1)] transition hover:opacity-95">
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-white/78 p-2.5 text-violet-600 shadow-sm">
                              <FileBadge2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-slate-800">{idImage ? "ID Selected" : "Upload ID"}</p>
                              <p className="mt-1 text-[11px] text-slate-500">{idImage?.name ?? "Optional for old tenant onboarding"}</p>
                            </div>
                          </div>
                          <input type="file" accept="image/*" disabled={submitting} onChange={(event) => setIdImage(event.target.files?.[0] ?? null)} className="hidden" />
                        </div>
                      </label>
                    </div>

                    <Field label={tenantType === "old" ? "ID Number (Optional)" : "ID Number"}>
                      <InputShell icon={<FileBadge2 className="h-4 w-4 text-violet-500" />}>
                        <input
                          value={form.idNumber}
                          onChange={(event) => setForm({ ...form, idNumber: event.target.value.toUpperCase() })}
                          disabled={submitting}
                          className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                          placeholder="Enter ID number"
                        />
                      </InputShell>
                    </Field>
                  </>
                ) : null}

                {step === 3 ? (
                  <>
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-800">Payment Details</h3>
                      <p className="mt-1 text-[11px] text-slate-500">Final step. Joining date and billing date will be treated as the same date.</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Monthly Rent">
                        <InputShell icon={<IndianRupee className="h-4 w-4 text-fuchsia-500" />}>
                          <input
                            type="number"
                            min="0"
                            value={form.monthlyRent}
                            onChange={(event) => setForm({ ...form, monthlyRent: event.target.value })}
                            disabled={submitting}
                            className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                            placeholder="Enter monthly rent"
                          />
                        </InputShell>
                      </Field>

                      <Field label="Rent Paid">
                        <InputShell icon={<CreditCard className="h-4 w-4 text-violet-500" />}>
                          <input
                            type="number"
                            min="0"
                            value={form.rentPaid}
                            onChange={(event) => setForm({ ...form, rentPaid: event.target.value })}
                            disabled={submitting}
                            className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                            placeholder="Enter rent paid amount"
                          />
                        </InputShell>
                      </Field>

                      <Field label="Joining / Billing Date">
                        <InputShell icon={<CalendarDays className="h-4 w-4 text-sky-500" />}>
                          <input
                            type="date"
                            value={form.paidOnDate}
                            onChange={(event) => setForm({ ...form, paidOnDate: event.target.value })}
                            disabled={submitting}
                            className="w-full bg-transparent text-[13px] text-slate-700 outline-none"
                          />
                        </InputShell>
                      </Field>
                    </div>
                  </>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-600">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                  <Button
                    variant="secondary"
                    onClick={step === 1 ? handleClose : () => setStep((current) => (current === 3 ? 2 : 1))}
                    disabled={submitting}
                    className="w-full rounded-2xl border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f6efff_100%)] text-slate-700 shadow-[0_10px_24px_rgba(170,148,255,0.08)] sm:flex-1"
                  >
                    {step === 1 ? "Cancel" : "Back"}
                  </Button>

                  {step === 1 ? (
                    <Button disabled={submitting} onClick={handleNextFromPersonal} className="w-full rounded-2xl bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] text-white shadow-[0_16px_30px_rgba(198,145,255,0.24)] hover:opacity-95 sm:flex-1">
                      Next: ID Proof
                    </Button>
                  ) : null}

                  {step === 2 ? (
                    <Button disabled={submitting} onClick={handleNextFromId} className="w-full rounded-2xl bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] text-white shadow-[0_16px_30px_rgba(198,145,255,0.24)] hover:opacity-95 sm:flex-1">
                      {tenantType === "old" ? "Skip ID and Continue" : "Next: Payment"}
                    </Button>
                  ) : null}

                  {step === 3 ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className={`w-full rounded-2xl bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] text-white shadow-[0_16px_30px_rgba(198,145,255,0.24)] hover:opacity-95 sm:flex-1 ${
                        submitting ? "opacity-70" : ""
                      }`}
                    >
                      {submitting ? "Creating..." : "Save Tenant"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StepPill({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold ${
        active
          ? "bg-[var(--action-gradient)] text-white"
          : done
            ? "bg-[var(--success-soft)] text-emerald-700"
            : "bg-[var(--pill-gradient)] text-indigo-700"
      }`}
    >
      {label}
    </span>
  );
}

function UploadCard({
  icon: Icon,
  title,
  subtitle,
  tone,
  disabled = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tone: "violet" | "pink";
  disabled?: boolean;
}) {
  const toneClass =
    tone === "violet"
      ? "bg-[linear-gradient(180deg,#f3eaff_0%,#ece4ff_100%)]"
      : "bg-[linear-gradient(180deg,#ffe9f0_0%,#ffdfe9_100%)]";

  return (
    <div
      className={`rounded-[22px] border border-white/80 p-3 shadow-[0_12px_26px_rgba(170,148,255,0.1)] ${toneClass} ${
        disabled ? "opacity-80" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white/78 p-2.5 text-violet-600 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-800">{title}</p>
          <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function InputShell({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-3 py-3 shadow-[0_10px_24px_rgba(170,148,255,0.08)]">
      <span className="shrink-0">{icon}</span>
      {children}
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
      <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}
