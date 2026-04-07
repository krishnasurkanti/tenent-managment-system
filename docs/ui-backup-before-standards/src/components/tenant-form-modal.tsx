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
    setForm(initialState);
    setIdImage(null);
    setSubmitting(false);
    setError("");
  };

  const handleClose = () => {
    resetFormState();
    onClose();
  };

  const handleNextFromPersonal = () => {
    if (!form.fullName.trim() || !form.phone.trim()) {
      setError("Please complete full name and phone first.");
      return;
    }

    setError("");
    setStep(2);
  };

  const handleNextFromId = () => {
    if (!idImage) {
      setError("Please upload an ID proof before continuing.");
      return;
    }

    setError("");
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!idImage) {
      setError("Please select an ID image.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = new FormData();
    payload.append("fullName", form.fullName);
    payload.append("phone", form.phone);
    payload.append("email", form.email);
    payload.append("monthlyRent", form.monthlyRent);
    payload.append("rentPaid", form.rentPaid);
    payload.append("paidOnDate", form.paidOnDate);
    payload.append("idNumber", form.idNumber);
    payload.append("emergencyContact", form.emergencyContact);
    payload.append("idImage", idImage);

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
              <Button variant="ghost" className="rounded-2xl px-3 text-slate-500 hover:bg-white/70" onClick={handleClose}>
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
                      <p className="mt-1 text-[11px] text-slate-500">Start with the tenant basics first. No need to see payment and proof before this is done.</p>
                    </div>

                    <div className="grid gap-3">
                      <Field label="Full Name *">
                        <InputShell icon={<User className="h-4 w-4 text-violet-500" />}>
                          <input
                            value={form.fullName}
                            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                            className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                            placeholder="Enter full name"
                          />
                        </InputShell>
                      </Field>

                      <Field label="Phone *">
                        <InputShell icon={<Phone className="h-4 w-4 text-emerald-500" />}>
                          <span className="text-[13px] font-medium text-slate-600">+91</span>
                          <input
                            value={form.phone}
                            onChange={(event) => setForm({ ...form, phone: event.target.value })}
                            className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                            placeholder="Enter phone number"
                          />
                        </InputShell>
                      </Field>

                      <Field label="Email">
                        <InputShell icon={<Mail className="h-4 w-4 text-orange-400" />}>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(event) => setForm({ ...form, email: event.target.value })}
                            className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                            placeholder="Enter email address"
                          />
                        </InputShell>
                      </Field>

                      <Field label="Emergency Contact">
                        <InputShell icon={<ShieldAlert className="h-4 w-4 text-amber-500" />}>
                          <span className="text-[13px] font-medium text-slate-600">+91</span>
                          <input
                            value={form.emergencyContact}
                            onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })}
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
                      <p className="mt-1 text-[11px] text-slate-500">Now collect ID information and proof. Once saved here, the last section is payment.</p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <UploadCard icon={ImageIcon} title="Upload Photo" subtitle="Optional preview style" tone="violet" disabled />
                      <label className="block cursor-pointer">
                        <span className="sr-only">Upload ID</span>
                        <div className="rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,#f3eaff_0%,#ece4ff_100%)] p-3 shadow-[0_12px_26px_rgba(170,148,255,0.1)] transition hover:opacity-95">
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-white/78 p-2.5 text-violet-600 shadow-sm">
                              <FileBadge2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-slate-800">{idImage ? "ID Selected" : "Upload ID"}</p>
                              <p className="mt-1 text-[11px] text-slate-500">{idImage?.name ?? "Photo or ID number required"}</p>
                            </div>
                          </div>
                          <input type="file" accept="image/*" onChange={(event) => setIdImage(event.target.files?.[0] ?? null)} className="hidden" />
                        </div>
                      </label>
                    </div>

                    <Field label="ID Number">
                      <InputShell icon={<FileBadge2 className="h-4 w-4 text-violet-500" />}>
                        <input
                          value={form.idNumber}
                          onChange={(event) => setForm({ ...form, idNumber: event.target.value.toUpperCase() })}
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
                      <p className="mt-1 text-[11px] text-slate-500">Final section here. After saving this, the next guided step is room assignment.</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Monthly Rent">
                        <InputShell icon={<IndianRupee className="h-4 w-4 text-fuchsia-500" />}>
                          <input
                            type="number"
                            min="0"
                            value={form.monthlyRent}
                            onChange={(event) => setForm({ ...form, monthlyRent: event.target.value })}
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
                            className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                            placeholder="Enter rent paid amount"
                          />
                        </InputShell>
                      </Field>

                      <Field label="Paid On Date">
                        <InputShell icon={<CalendarDays className="h-4 w-4 text-sky-500" />}>
                          <input
                            type="date"
                            value={form.paidOnDate}
                            onChange={(event) => setForm({ ...form, paidOnDate: event.target.value })}
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
                    className="w-full rounded-2xl border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f6efff_100%)] text-slate-700 shadow-[0_10px_24px_rgba(170,148,255,0.08)] sm:flex-1"
                  >
                    {step === 1 ? "Cancel" : "Back"}
                  </Button>

                  {step === 1 ? (
                    <Button onClick={handleNextFromPersonal} className="w-full rounded-2xl bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] text-white shadow-[0_16px_30px_rgba(198,145,255,0.24)] hover:opacity-95 sm:flex-1">
                      Next: ID Proof
                    </Button>
                  ) : null}

                  {step === 2 ? (
                    <Button onClick={handleNextFromId} className="w-full rounded-2xl bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] text-white shadow-[0_16px_30px_rgba(198,145,255,0.24)] hover:opacity-95 sm:flex-1">
                      Next: Payment
                    </Button>
                  ) : null}

                  {step === 3 ? (
                    <Button
                      onClick={handleSubmit}
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
            ? "bg-emerald-100 text-emerald-700"
            : "bg-[var(--pill-gradient)] text-violet-700"
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
