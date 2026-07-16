"use client";

import { useState } from "react";
import { AlertCircle, CalendarDays, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BottomSheet } from "@/components/ui/overlay/bottom-sheet";
import { FormField } from "@/components/ui/form/field";
import { TextInput } from "@/components/ui/form/text-input";
import { PhoneInput } from "@/components/ui/form/phone-input";
import { AmountInput } from "@/components/ui/form/amount-input";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { createTenant } from "@/services/tenants/tenants.service";
import type { TenantRecord } from "@/types/tenant";

export function QuickAddTenantModal({
  open,
  onClose,
  onCreated,
  hostelId,
  asPage = false,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (tenant: TenantRecord) => void;
  hostelId?: string;
  /** Render as inline page element (no overlay, no body lock) */
  asPage?: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!asPage && !open) return null;

  const reset = () => {
    setFullName("");
    setPhone("");
    setMonthlyRent("");
    setJoiningDate(new Date().toISOString().slice(0, 10));
    setSubmitting(false);
    setError("");
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!fullName.trim()) return setError("Name is required.");
    if (!monthlyRent || Number(monthlyRent) <= 0) return setError("Enter monthly rent.");
    if (!joiningDate) return setError("Enter joining date.");
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const { response, data } = await createTenant({
        fullName: fullName.trim(),
        phone: phone || undefined,
        monthlyRent,
        rentPaid: "0",
        paidOnDate: joiningDate,
        billingCycle: "monthly",
        hostelId: hostelId ?? undefined,
      });

      if (!response.ok) {
        setError(data.message ?? "Unable to create tenant.");
        setSubmitting(false);
        return;
      }

      reset();
      // onClose intentionally NOT called — onCreated handles navigation
      onCreated(data.tenant as TenantRecord);
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  };

  const body = (
    <div className="flex flex-col gap-3">
      <FormField label="Full name" required error={error && !fullName.trim() ? error : undefined}>
        {({ id }) => (
          <TextInput
            id={id}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSave()}
            disabled={submitting}
            placeholder="Tenant full name"
            autoFocus
          />
        )}
      </FormField>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Phone (optional)">
          {({ id }) => (
            <PhoneInput id={id} value={phone} onValueChange={setPhone} disabled={submitting} placeholder="98765 43210" />
          )}
        </FormField>
        <FormField label="Monthly rent" required>
          {({ id }) => (
            <AmountInput
              id={id}
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value.replace(/[^\d.]/g, ""))}
              disabled={submitting}
              placeholder="8500"
            />
          )}
        </FormField>
      </div>

      <FormField label="Joining date" required>
        {({ id }) => (
          <TextInput
            id={id}
            type="date"
            value={joiningDate}
            onChange={(e) => setJoiningDate(e.target.value)}
            disabled={submitting}
            leadingIcon={<CalendarDays size={15} />}
            className="[color-scheme:dark]"
          />
        )}
      </FormField>

      {error && fullName.trim() ? (
        <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-3 py-2.5 text-sm font-medium text-[color:var(--error)]">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      {submitting ? <ProcessingPill label="Creating tenant…" /> : null}
    </div>
  );

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row">
      <Button variant="secondary" fullWidth onClick={handleClose} disabled={submitting} className="sm:flex-1">
        Cancel
      </Button>
      <Button
        fullWidth
        onClick={() => void handleSave()}
        loading={submitting}
        className="bg-[linear-gradient(90deg,#b45309_0%,#d97706_100%)] sm:flex-1"
      >
        {submitting ? "Saving…" : "Save Tenant"}
      </Button>
    </div>
  );

  const header = (
    <div className="mb-3">
      <span className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[color:var(--warning-soft)] px-3 py-1.5 text-[13px] font-semibold text-[color:var(--warning)]">
        <Zap size={14} /> Quick Add
      </span>
      <p className="mt-2 text-[11px] text-[color:var(--fg-tertiary)]">Name + rent only. Fill remaining details later.</p>
    </div>
  );

  if (asPage) {
    return (
      <Card className="p-4">
        {header}
        {body}
        <div className="mt-4 border-t border-[color:var(--border)] pt-3">{footer}</div>
      </Card>
    );
  }

  return (
    <BottomSheet open={open} onClose={handleClose} footer={footer}>
      {header}
      {body}
    </BottomSheet>
  );
}
