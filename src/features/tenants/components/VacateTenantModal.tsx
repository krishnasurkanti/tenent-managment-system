"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { removeTenant } from "@/services/tenants/tenants.service";
import { fmtTenantId } from "@/utils/payment";
import type { TenantRecord } from "@/types/tenant";

interface Props {
  tenant: TenantRecord | null;
  onClose: () => void;
  onRemoved: (tenantId: string) => void;
}

export function VacateTenantModal({ tenant, onClose, onRemoved }: Props) {
  const open = tenant !== null;

  const [advanceRefundEligible, setAdvanceRefundEligible] = useState(false);
  const [refundAdvance, setRefundAdvance] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [settlementNote, setSettlementNote] = useState("");
  const [noticeGivenDate, setNoticeGivenDate] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useLockBodyScroll(open);

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

  // Sync refund amount when tenant changes
  const suggestedRefund = tenant
    ? String(tenant.advanceBalance ?? tenant.advanceAmount ?? 0)
    : "0";

  const handleOpen = () => {
    // Pre-fill refund amount each time modal opens
    setRefundAmount(suggestedRefund);
  };

  // Called once when tenant is truthy and modal mounts
  // We use a key-based approach in the parent, but also do a simple init here
  const displayRefund = refundAmount === "" ? suggestedRefund : refundAmount;

  const handleRemove = async () => {
    if (!tenant) return;
    if (!confirmed) { setError("Please check the confirmation box first."); return; }
    if (submitting) return;

    const numericRefund = Number(displayRefund);
    if (Number.isNaN(numericRefund) || numericRefund < 0) {
      setError("Enter a valid refund amount.");
      return;
    }

    setSubmitting(true);
    setError("");

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
    onClose();
    onRemoved(removedId);
  };

  if (!open || !tenant) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vacate-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4 sm:py-4"
      style={{ background: "rgba(2,6,23,0.82)", backdropFilter: "blur(6px)" }}
    >
      <Card className="flex w-full max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl rounded-b-none border-white/8 bg-[linear-gradient(180deg,#111114_0%,#09090b_100%)] p-0 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] sm:w-[min(calc(100vw-2rem),40rem)] sm:max-h-[88dvh] sm:rounded-2xl sm:shadow-[0_40px_100px_rgba(0,0,0,0.6)]">

        {/* Header */}
        <div className="relative shrink-0 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(90deg,rgba(239,68,68,0.12)_0%,rgba(220,38,38,0.05)_100%)]" />
          <div className="relative">
            <div id="vacate-modal-title" className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[13px] font-semibold text-red-400">
              <LogOut className="h-3.5 w-3.5" />
              Vacate Tenant
            </div>
            <p className="mt-2 text-[13px] font-semibold text-white">{tenant.fullName}</p>
            <p className="text-[11px] text-white/45">
              #{fmtTenantId(tenant.tenantId)} · Room {tenant.assignment?.roomNumber ?? "Unassigned"}
            </p>
          </div>
        </div>

        {/* Scrollable body */}
        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        >
          <div className="space-y-3">

            {/* Info strip */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <p className="text-[11px] text-white/40">
                Removing frees the room/bed for a new tenant. Payment history is preserved.
              </p>
            </div>

            {/* Settlement */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 space-y-3">
              <p className="text-[12px] font-semibold text-white/70">Vacating settlement</p>
              <p className="text-[11px] text-white/40">
                Suggested refundable advance: ₹{(tenant.advanceBalance ?? tenant.advanceAmount ?? 0).toLocaleString("en-IN")}
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advanceRefundEligible}
                    onChange={(e) => setAdvanceRefundEligible(e.target.checked)}
                    disabled={submitting}
                    className="mt-0.5 h-4 w-4 accent-emerald-500"
                  />
                  <span className="text-[12px] text-white/70">Advance refund eligible?</span>
                </label>
                <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refundAdvance}
                    onChange={(e) => setRefundAdvance(e.target.checked)}
                    disabled={submitting}
                    className="mt-0.5 h-4 w-4 accent-emerald-500"
                  />
                  <span className="text-[12px] text-white/70">Refund advance?</span>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Refund amount</span>
                <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5">
                  <span className="text-[13px] text-white/40">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={displayRefund}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    disabled={submitting || !refundAdvance}
                    className="w-full bg-transparent text-[13px] text-white outline-none disabled:opacity-40 placeholder:text-white/25"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Notice given date</span>
                <span className="mb-1.5 block text-[11px] text-white/35">Date tenant was informed of vacating (e.g. 30 days ago)</span>
                <input
                  type="date"
                  value={noticeGivenDate}
                  onChange={(e) => setNoticeGivenDate(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-[13px] text-white outline-none [color-scheme:dark] [&::-webkit-datetime-edit]:text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-white/70">Note (optional)</span>
                <textarea
                  value={settlementNote}
                  onChange={(e) => setSettlementNote(e.target.value)}
                  disabled={submitting}
                  rows={2}
                  placeholder="Optional settlement note"
                  className="w-full resize-none rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-white/25"
                />
              </label>
            </div>

            {/* Confirmation */}
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/[0.08] p-3 text-[12px]">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 h-4 w-4 shrink-0 accent-red-500"
              />
              <span className="text-red-300">
                I understand <strong>{tenant.fullName}</strong> will be permanently removed. This cannot be undone.
              </span>
            </label>

            {error ? (
              <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-400">{error}</p>
            ) : null}
            {submitting ? <ProcessingPill label="Removing tenant…" /> : null}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 bg-[#09090b] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={handleClose}
              className="w-full rounded-2xl border-white/12 bg-white/[0.05] text-white/70 hover:text-white sm:flex-1"
            >
              Cancel
            </Button>
            <Button
              disabled={submitting || !confirmed}
              onClick={() => void handleRemove()}
              className="w-full rounded-2xl bg-[linear-gradient(90deg,#b91c1c_0%,#dc2626_100%)] text-white shadow-[0_10px_24px_rgba(185,28,28,0.3)] hover:brightness-110 disabled:opacity-50 sm:flex-1"
            >
              {submitting ? "Removing…" : "Vacate & Remove"}
            </Button>
          </div>
        </div>

      </Card>
    </div>
  );
}
