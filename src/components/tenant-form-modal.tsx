"use client";

import { useState } from "react";
import { X } from "lucide-react";
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

export function TenantFormModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (tenant: TenantRecord) => void;
}) {
  const [form, setForm] = useState(initialState);
  const [idImage, setIdImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useLockBodyScroll(open);

  if (!open) {
    return null;
  }

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
    setForm(initialState);
    setIdImage(null);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 px-4 py-4 sm:py-8">
      <div className="flex min-h-full items-center justify-center">
      <Card className="flex max-h-[min(92vh,820px)] w-full max-w-2xl flex-col overflow-hidden p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Add New Tenant</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Submit the tenant details. We use the last 5 digits of the phone number as the tenant ID when available, or create a unique 5-digit ID if it is already taken.
            </p>
          </div>
          <Button variant="ghost" className="px-3" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 grid flex-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <Field label="Full Name">
            <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" placeholder="Enter full name" />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" placeholder="Enter phone number" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" placeholder="Enter email address" />
          </Field>
          <Field label="Monthly Rent">
            <input type="number" min="0" value={form.monthlyRent} onChange={(event) => setForm({ ...form, monthlyRent: event.target.value })} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" placeholder="Enter monthly rent" />
          </Field>
          <Field label="Rent Paid">
            <input type="number" min="0" value={form.rentPaid} onChange={(event) => setForm({ ...form, rentPaid: event.target.value })} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" placeholder="Enter rent paid amount" />
          </Field>
          <Field label="Paid On Date">
            <input type="date" value={form.paidOnDate} onChange={(event) => setForm({ ...form, paidOnDate: event.target.value })} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" />
          </Field>
          <Field label="ID Number">
            <input value={form.idNumber} onChange={(event) => setForm({ ...form, idNumber: event.target.value.toUpperCase() })} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" placeholder="Ex: IGTOS785U" />
          </Field>
          <Field label="Emergency Contact">
            <input value={form.emergencyContact} onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none" placeholder="Enter emergency contact" />
          </Field>
          <Field label="ID Image">
            <input type="file" accept="image/*" onChange={(event) => setIdImage(event.target.files?.[0] ?? null)} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-[var(--accent)] file:px-3 file:py-2 file:text-white" />
          </Field>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className={submitting ? "opacity-70" : ""}>
            {submitting ? "Creating..." : "Create Tenant"}
          </Button>
        </div>
      </Card>
      </div>
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
      <span className="mb-2 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
