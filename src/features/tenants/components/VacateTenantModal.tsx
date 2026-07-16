"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BottomSheet } from "@/components/ui/overlay/bottom-sheet";
import { FormField } from "@/components/ui/form/field";
import { AmountInput } from "@/components/ui/form/amount-input";
import { TextInput } from "@/components/ui/form/text-input";
import { Textarea } from "@/components/ui/form/textarea";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { removeTenant } from "@/services/tenants/tenants.service";
import { fmtTenantId } from "@/utils/payment";
import type { TenantRecord } from "@/types/tenant";

interface Props {
  tenant: TenantRecord | null;
  onClose: () => void;
  onRemoved: (tenantId: string) => void;
  /** Render as inline page element — no overlay, no body scroll lock */
  asPage?: boolean;
}

export function VacateTenantModal({ tenant, onClose, onRemoved, asPage = false }: Props) {
  const open = tenant !== null;

  const [advanceRefundEligible, setAdvanceRefundEligible] = useState(false);
  const [refundAdvance, setRefundAdvance] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [settlementNote, setSettlementNote] = useState("");
  const [noticeGivenDate, setNoticeGivenDate] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setAdvanceRefundEligible(false);
    setRefundAdvance(false);
    setRefundAmount("");
    setSettlementNote("");
    setNoticeGivenDate("");
    setConfirmed(false);
    setSubmitting(false);
    setError("");
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const suggestedRefund = tenant ? String(tenant.advanceBalance ?? tenant.advanceAmount ?? 0) : "0";
  const displayRefund = refundAmount === "" ? suggestedRefund : refundAmount;

  const handleRemove = async () => {
    if (!tenant) return;
    if (!confirmed) return setError("Please check the confirmation box first.");
    if (submitting) return;

    const numericRefund = Number(displayRefund);
    if (Number.isNaN(numericRefund) || numericRefund < 0) {
      setError("Enter a valid refund amount.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { response, data } = await removeTenant(tenant.tenantId, {
        advanceRefundEligible,
        refundAdvance,
        refundAmount: refundAdvance ? numericRefund : 0,
        settlementNote,
        settlementDate: new Date().toISOString().slice(0, 10),
        noticeGivenDate: noticeGivenDate || null,
      });

      if (!response.ok) {
        setError((data as { message?: string }).message ?? "Unable to remove tenant.");
        setSubmitting(false);
        return;
      }

      const removedId = tenant.tenantId;
      reset();
      onRemoved(removedId);
      if (!asPage) onClose();
    } catch {
      setError("Network error. Check your connection and try again.");
      setSubmitting(false);
    }
  };

  if ((!asPage && !open) || !tenant) return null;

  const header = (
    <div className="mb-1">
      <span className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-3 py-1.5 text-[13px] font-semibold text-[color:var(--error)]">
        <LogOut size={14} /> Vacate tenant
      </span>
      <p className="mt-2 text-[13px] font-semibold text-[color:var(--fg-primary)]">{tenant.fullName}</p>
      <p className="text-[11px] text-[color:var(--fg-tertiary)]">
        #{fmtTenantId(tenant.tenantId)} · Room {tenant.assignment?.roomNumber ?? "Unassigned"}
      </p>
    </div>
  );

  const body = (
    <div className="flex flex-col gap-3">
      <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5">
        <p className="text-[11px] text-[color:var(--fg-tertiary)]">
          Removing frees the room/bed for a new tenant. Payment history is preserved.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
        <p className="text-[12px] font-semibold text-[color:var(--fg-secondary)]">Vacating settlement</p>
        <p className="text-[11px] text-[color:var(--fg-tertiary)]">
          Suggested refundable advance: ₹{(tenant.advanceBalance ?? tenant.advanceAmount ?? 0).toLocaleString("en-IN")}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <CheckRow label="Advance refund eligible?" checked={advanceRefundEligible} disabled={submitting} onChange={setAdvanceRefundEligible} />
          <CheckRow label="Refund advance?" checked={refundAdvance} disabled={submitting} onChange={setRefundAdvance} />
        </div>

        <FormField label="Refund amount">
          {({ id }) => (
            <AmountInput
              id={id}
              value={displayRefund}
              onChange={(e) => setRefundAmount(e.target.value.replace(/[^\d.]/g, ""))}
              disabled={submitting || !refundAdvance}
            />
          )}
        </FormField>

        <FormField label="Notice given date" helper="Date tenant was informed of vacating">
          {({ id }) => (
            <TextInput id={id} type="date" value={noticeGivenDate} onChange={(e) => setNoticeGivenDate(e.target.value)} disabled={submitting} className="[color-scheme:dark]" />
          )}
        </FormField>

        <FormField label="Note (optional)">
          {({ id }) => (
            <Textarea id={id} value={settlementNote} onChange={(e) => setSettlementNote(e.target.value)} disabled={submitting} rows={2} maxLength={500} placeholder="Optional settlement note" />
          )}
        </FormField>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] p-3 text-[12px]">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          disabled={submitting}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--error)]"
          data-testid="vacate-confirm-checkbox"
        />
        <span className="text-[color:var(--error)]">
          I understand <strong>{tenant.fullName}</strong> will be permanently removed. This cannot be undone.
        </span>
      </label>

      {error ? (
        <p role="alert" className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-3 py-2.5 text-[13px] text-[color:var(--error)]">{error}</p>
      ) : null}
      {submitting ? <ProcessingPill label="Removing tenant…" /> : null}
    </div>
  );

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row">
      <Button variant="secondary" fullWidth disabled={submitting} onClick={handleClose} className="sm:flex-1">
        Cancel
      </Button>
      <Button
        fullWidth
        disabled={submitting || !confirmed}
        onClick={() => void handleRemove()}
        data-testid="vacate-submit-btn"
        className="bg-[linear-gradient(90deg,#b91c1c_0%,#dc2626_100%)] sm:flex-1"
      >
        {submitting ? "Removing…" : "Vacate & Remove"}
      </Button>
    </div>
  );

  if (asPage) {
    return (
      <Card className="p-4">
        {header}
        <div className="mt-3">{body}</div>
        <div className="sticky bottom-0 z-10 mt-4 border-t border-[color:var(--border)] bg-[color:var(--bg-primary)] pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          {footer}
        </div>
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

function CheckRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 accent-[color:var(--success)]"
      />
      <span className="text-[12px] text-[color:var(--fg-secondary)]">{label}</span>
    </label>
  );
}
