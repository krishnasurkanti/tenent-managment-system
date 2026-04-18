"use client";

import { useState } from "react";
import { CalendarDays, CreditCard, FileBadge2, ImageIcon, IndianRupee, Mail, Phone, Plus, ShieldAlert, Trash2, User, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { createTenant, updateTenantFamilyMembers } from "@/services/tenants/tenants.service";
import type { BillingCycle, TenantRecord } from "@/types/tenant";

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
type FamilyMemberForm = { id: string; name: string; relation: string; age: string };

function createFamilyMember(): FamilyMemberForm {
  return { id: `fm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: "", relation: "", age: "" };
}

function getMissingFields(fields: Array<[label: string, valid: boolean]>) {
  return fields.filter(([, valid]) => !valid).map(([label]) => label);
}

export function TenantFormModal({
  open,
  onClose,
  onCreated,
  hostelId,
  propertyType,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (tenant: TenantRecord) => void;
  hostelId?: string;
  propertyType?: "PG" | "RESIDENCE";
}) {
  const isResidence = propertyType === "RESIDENCE";
  const [step, setStep] = useState<TenantStep>(1);
  const [tenantType, setTenantType] = useState<TenantType>("new");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [form, setForm] = useState(initialState);
  const [idImage, setIdImage] = useState<File | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberForm[]>([createFamilyMember()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useLockBodyScroll(open);

  if (!open) {
    return null;
  }

  const resetFormState = () => {
    setStep(1);
    setTenantType("new");
    setBillingCycle("monthly");
    setForm(initialState);
    setIdImage(null);
    setFamilyMembers([createFamilyMember()]);
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

  const handleNextFromDetails = () => {
    const missingFields = getMissingFields([
      ["full name", Boolean(form.fullName.trim())],
      ["phone number", tenantType === "old" ? true : Boolean(form.phone.trim())],
      ["ID proof image", tenantType === "old" ? true : Boolean(idImage)],
      ["ID number", tenantType === "old" ? true : Boolean(form.idNumber.trim())],
    ]);

    if (missingFields.length > 0) {
      setError(`Complete ${missingFields.join(", ")} before going to payment.`);
      return;
    }

    setError("");
    setStep(2);
  };

  const handleNextFromPayment = () => {
    const missingFields = getMissingFields([
      ["monthly rent", Boolean(form.monthlyRent) && Number(form.monthlyRent) > 0],
      ["rent paid amount", Boolean(form.rentPaid) && Number(form.rentPaid) >= 0],
      ["joining date", Boolean(form.paidOnDate)],
    ]);

    if (missingFields.length > 0) {
      setError(`Cannot continue. Missing: ${missingFields.join(", ")}.`);
      return;
    }

    setError("");
    setStep(3);
  };

  const updateFamilyMember = (id: string, key: keyof Omit<FamilyMemberForm, "id">, value: string) => {
    setFamilyMembers((current) => current.map((member) => member.id === id ? { ...member, [key]: value } : member));
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
    if (hostelId) {
      payload.append("hostelId", hostelId);
    }
    payload.append("phone", form.phone);
    payload.append("email", form.email);
    payload.append("monthlyRent", form.monthlyRent);
    payload.append("rentPaid", form.rentPaid);
    payload.append("paidOnDate", form.paidOnDate);
    payload.append("idNumber", form.idNumber);
    payload.append("emergencyContact", form.emergencyContact);
    payload.append("billingCycle", billingCycle);
    if (idImage) {
      payload.append("idImage", idImage);
    }

    let response: Response;
    let data: { tenant?: TenantRecord; message?: string };
    try {
      const result = await createTenant(payload);
      response = result.response;
      data = result.data;
    } catch {
      setError("Network error. Please check your connection and try again.");
      setSubmitting(false);
      return;
    }

    if (!response.ok) {
      setError(data.message ?? "Unable to create tenant.");
      setSubmitting(false);
      return;
    }

    const createdTenant = data.tenant as TenantRecord;

    // For RESIDENCE tenants, save valid family members after tenant creation
    if (isResidence) {
      const validMembers = familyMembers
        .filter((member) => member.name.trim() && member.relation.trim())
        .map((member) => ({
          name: member.name.trim(),
          relation: member.relation.trim(),
          age: member.age ? Number(member.age) : undefined,
        }));

      if (validMembers.length > 0) {
        try {
          await updateTenantFamilyMembers({ tenantId: createdTenant.tenantId, familyMembers: validMembers });
        } catch {
          // family save failure is non-fatal — tenant was created successfully
        }
      }
    }

    onCreated(createdTenant);
    resetFormState();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 px-3 py-4 animate-[fade-in_var(--motion-medium)_var(--ease-enter)] sm:px-4 sm:py-8">
      <div className="flex min-h-full items-center justify-center">
        <Card className="flex max-h-[min(92dvh,900px)] w-full max-w-2xl flex-col overflow-hidden border-slate-100 bg-white p-0 shadow-[0_28px_70px_rgba(15,23,42,0.14)] backdrop-blur animate-[float-up_var(--motion-medium)_var(--ease-enter)]">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(90deg,rgba(37,99,235,0.08)_0%,rgba(14,165,233,0.08)_100%)]" />

            <div className="relative flex items-start justify-between gap-4 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-white/72 px-3 py-1.5 text-[13px] font-semibold text-slate-700 shadow-sm">
                  <span className="rounded-[8px] bg-blue-600 p-1 text-white">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  Add Tenant
                </div>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">Fill details and ID proof, then payment.</p>
              </div>
              <Button variant="ghost" disabled={submitting} aria-label="Close" className="rounded-[var(--radius-pill)] px-3 text-slate-500 hover:bg-white/70" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pt-0 pb-2 sm:px-5">
              <div className="space-y-4 rounded-[var(--radius-card)] border border-slate-100 bg-slate-50 p-3 shadow-sm sm:p-4">
                <div className="flex flex-wrap gap-2">
                  <StepPill label="1. Details" active={step === 1} done={step > 1} />
                  <StepPill label="2. Payment" active={step === 2} done={isResidence && step > 2} />
                  {isResidence ? <StepPill label="3. Family" active={step === 3} done={false} /> : null}
                </div>

                {step === 1 ? (
                  <>
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-800">Personal Details &amp; ID Proof</h3>
                      <p className="mt-1 text-[11px] text-slate-500">Choose tenant type first. Old tenants can be onboarded with missing details and updated later.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setTenantType("new")}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          tenantType === "new" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"
                        }`}
                      >
                        New Tenant
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setTenantType("old")}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          tenantType === "old" ? "bg-[linear-gradient(90deg,#2563eb_0%,#16a34a_100%)] text-white" : "bg-slate-50 text-slate-700"
                        }`}
                      >
                        Old Tenant (Onboarding)
                      </button>
                    </div>

                    <div className="grid gap-3">
                      <Field label="Full Name *">
                        <InputShell icon={<User className="h-4 w-4 text-[var(--accent)]" />}>
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
                            type="tel"
                          placeholder="Enter phone number"
                          />
                        </InputShell>
                      </Field>

                      <Field label="Email (Optional)">
                        <InputShell icon={<Mail className="h-4 w-4 text-amber-500" />}>
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
                            type="tel"
                          placeholder="Enter emergency contact number"
                          />
                        </InputShell>
                      </Field>
                    </div>

                    <div>
                      <p className="mb-2 text-[12px] font-semibold text-slate-700">
                        {tenantType === "old" ? "ID Proof (Optional)" : "ID Proof"}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <UploadCard icon={ImageIcon} title="Photo Optional" subtitle="You can add tenant photo later" tone="blue" disabled />
                        <label className={`block ${submitting ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
                          <span className="sr-only">Upload ID</span>
                          <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-3 shadow-sm transition hover:opacity-95">
                            <div className="flex items-center gap-3">
                              <div className="rounded-2xl bg-white p-2.5 text-[var(--accent)] shadow-sm">
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
                      <div className="mt-2">
                        <Field label={tenantType === "old" ? "ID Number (Optional)" : "ID Number"}>
                          <InputShell icon={<FileBadge2 className="h-4 w-4 text-[var(--accent)]" />}>
                            <input
                              value={form.idNumber}
                              onChange={(event) => setForm({ ...form, idNumber: event.target.value.toUpperCase() })}
                              disabled={submitting}
                              className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                              placeholder="Enter ID number"
                            />
                          </InputShell>
                        </Field>
                      </div>
                    </div>
                  </>
                ) : null}

                {step === 3 ? (
                  <>
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-800">Family Members</h3>
                      <p className="mt-1 text-[11px] text-slate-500">Add the people living in this unit. You can skip this and add later.</p>
                    </div>

                    <div className="space-y-2">
                      {familyMembers.map((member, index) => (
                        <div key={member.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[12px] font-semibold text-slate-600">Member {index + 1}</span>
                            {familyMembers.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => setFamilyMembers((current) => current.filter((m) => m.id !== member.id))}
                                disabled={submitting}
                                className="rounded-full p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <Field label="Name *">
                              <InputShell icon={<User className="h-4 w-4 text-[var(--accent)]" />}>
                                <input
                                  value={member.name}
                                  onChange={(e) => updateFamilyMember(member.id, "name", e.target.value)}
                                  disabled={submitting}
                                  className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                                  placeholder="Full name"
                                />
                              </InputShell>
                            </Field>
                            <Field label="Relation *">
                              <InputShell icon={<Users className="h-4 w-4 text-purple-500" />}>
                                <input
                                  value={member.relation}
                                  onChange={(e) => updateFamilyMember(member.id, "relation", e.target.value)}
                                  disabled={submitting}
                                  className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                                  placeholder="e.g. Spouse"
                                />
                              </InputShell>
                            </Field>
                            <Field label="Age (Optional)">
                              <InputShell icon={<CalendarDays className="h-4 w-4 text-amber-500" />}>
                                <input
                                  type="number"
                                  min="0"
                                  max="120"
                                  value={member.age}
                                  onChange={(e) => updateFamilyMember(member.id, "age", e.target.value)}
                                  disabled={submitting}
                                  className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                                  placeholder="Age"
                                />
                              </InputShell>
                            </Field>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setFamilyMembers((current) => [...current, createFamilyMember()])}
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 px-3 py-2.5 text-[13px] font-medium text-blue-600 transition hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4" />
                      Add Member
                    </button>
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-800">Payment Details</h3>
                      <p className="mt-1 text-[11px] text-slate-500">{isResidence ? "Next, add family members." : "Final step."} Joining date and billing date will be treated as the same date.</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label={billingCycle === "daily" ? "Daily Rate" : billingCycle === "weekly" ? "Weekly Rate" : "Monthly Rent"}>
                        <InputShell icon={<IndianRupee className="h-4 w-4 text-[var(--accent)]" />}>
                          <input
                            type="number"
                            min="0"
                            value={form.monthlyRent}
                            onChange={(event) => setForm({ ...form, monthlyRent: event.target.value })}
                            disabled={submitting}
                            className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                            placeholder={billingCycle === "daily" ? "Enter daily rate" : billingCycle === "weekly" ? "Enter weekly rate" : "Enter monthly rent"}
                          />
                        </InputShell>
                      </Field>

                      <Field label="First Payment Collected">
                        <InputShell icon={<CreditCard className="h-4 w-4 text-[var(--accent)]" />}>
                          <input
                            type="number"
                            min="0"
                            value={form.rentPaid}
                            onChange={(event) => setForm({ ...form, rentPaid: event.target.value })}
                            disabled={submitting}
                            className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                            placeholder="Enter amount paid"
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

                    <div>
                      <span className="mb-2 block text-[12px] font-semibold text-slate-700">Billing Cycle</span>
                      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                        {(["monthly", "weekly", "daily"] as const).map((cycle) => {
                          const labels = { monthly: "Monthly", weekly: "Weekly", daily: "Daily" };
                          const hints = { monthly: "Calendar month", weekly: "7 days", daily: "Per night" };
                          const isActive = billingCycle === cycle;
                          return (
                            <button
                              key={cycle}
                              type="button"
                              disabled={submitting}
                              onClick={() => setBillingCycle(cycle)}
                              className={`flex flex-col items-center rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                                isActive
                                  ? cycle === "monthly"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : cycle === "weekly"
                                      ? "bg-emerald-600 text-white shadow-sm"
                                      : "bg-amber-500 text-white shadow-sm"
                                  : "text-slate-500 hover:bg-slate-50"
                              }`}
                            >
                              {labels[cycle]}
                              <span className={`mt-0.5 text-[9px] font-medium ${isActive ? "text-white/75" : "text-slate-400"}`}>
                                {hints[cycle]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {billingCycle !== "monthly" ? (
                        <p className="mt-2 text-[11px] text-emerald-600 font-medium">
                          {billingCycle === "daily"
                            ? "Daily tenants are managed free — no plan limit counted."
                            : "Weekly tenants are managed free — no plan limit counted."}
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : null}

              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
                {error ? (
                  <div className="mb-3 rounded-2xl border border-[color:var(--error)] bg-[color:var(--error-soft)] px-3 py-2.5 text-sm font-medium text-[color:var(--error)]">
                    {error}
                  </div>
                ) : null}
                {submitting ? <ProcessingPill label="Creating tenant and preparing assignment" className="mb-3" /> : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <Button
                    variant="secondary"
                    onClick={step === 1 ? handleClose : () => setStep((current) => (current - 1) as TenantStep)}
                    disabled={submitting}
                    className="w-full rounded-2xl border-slate-200 bg-white text-slate-700 shadow-sm sm:flex-1"
                  >
                    {step === 1 ? "Cancel" : "Back"}
                  </Button>

                  {step === 1 ? (
                    <Button disabled={submitting} onClick={handleNextFromDetails} className="w-full rounded-2xl sm:flex-1">
                      {tenantType === "old" ? "Continue to Payment" : "Next: Payment"}
                    </Button>
                  ) : null}

                  {step === 2 ? (
                    isResidence ? (
                      <Button onClick={handleNextFromPayment} disabled={submitting} className="w-full rounded-2xl sm:flex-1">
                        Next: Family
                      </Button>
                    ) : (
                      <Button onClick={handleSubmit} disabled={submitting} loading={submitting} className="w-full rounded-2xl sm:flex-1">
                        {submitting ? "Creating..." : "Save Tenant"}
                      </Button>
                    )
                  ) : null}

                  {step === 3 ? (
                    <Button onClick={handleSubmit} disabled={submitting} loading={submitting} className="w-full rounded-2xl sm:flex-1">
                      {submitting ? "Creating..." : "Save Tenant"}
                    </Button>
                  ) : null}
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
          ? "bg-blue-600 text-white"
          : done
            ? "border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] text-white shadow-[0_10px_22px_rgba(34,197,94,0.24)]"
            : "bg-blue-50 text-indigo-700"
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
  tone: "blue" | "neutral";
  disabled?: boolean;
}) {
  const toneClass =
    tone === "blue" ? "bg-blue-50" : "bg-slate-100";

  return (
    <div
      className={`rounded-[8px] border border-slate-200 p-3 shadow-sm ${toneClass} ${
        disabled ? "opacity-80" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white p-2.5 text-[var(--accent)] shadow-sm">
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
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
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
