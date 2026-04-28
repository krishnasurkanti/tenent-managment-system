"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, CreditCard, IndianRupee, WalletCards, X } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useToast } from "@/components/ui/toast";
import { recordTenantPayment } from "@/services/tenants/tenants.service";
import { formatPaymentDate } from "@/utils/payment";
import type { TenantRecord } from "@/types/tenant";

type PaymentMode = "cash" | "upi" | "bank";

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank Transfer" },
];

export function PaymentCollectionModal({
  open,
  tenant,
  onClose,
  onSuccess,
}: {
  open: boolean;
  tenant: TenantRecord | null;
  onClose: () => void;
  onSuccess: (updated: TenantRecord) => void;
}) {
  const [amount, setAmount] = useState("");
  const [paidOnDate, setPaidOnDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [txnId, setTxnId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  const { toast } = useToast();
  useLockBodyScroll(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-fill amount when tenant changes
  useEffect(() => {
    if (tenant) {
      setAmount(String(tenant.monthlyRent));
    }
    setError("");
    setTxnId("");
    setPaymentMode("cash");
    setPaidOnDate(new Date().toISOString().slice(0, 10));
    setSubmitting(false);
  }, [tenant]);

  const handleSubmit = async () => {
    if (!tenant || submitting) return;

    const numericAmount = Number(amount);
    if (!amount.trim()) {
      setError("Enter the paid amount.");
      return;
    }
    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!paidOnDate) {
      setError("Choose the payment date.");
      return;
    }
    if (paymentMode !== "cash" && !txnId.trim()) {
      setError("Transaction ID is required for non-cash payments.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = new FormData();
    payload.append("tenantId", tenant.tenantId);
    payload.append("amount", String(numericAmount));
    payload.append("paidOnDate", paidOnDate);
    payload.append("paymentMethod", paymentMode === "cash" ? "cash" : "online");
    payload.append("txnId", txnId);

    const { response, data } = await recordTenantPayment(payload);

    if (!response.ok) {
      const msg = data.message ?? "Unable to record payment.";
      setError(msg);
      toast(msg, "error");
      setSubmitting(false);
      return;
    }

    toast(`Payment recorded for ${tenant.fullName}.`, "success");
    onSuccess(data.tenant as TenantRecord);
    onClose();
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center px-3 py-4 sm:px-4 sm:py-8"
      style={{ background: "rgba(2,6,23,0.72)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-[10px] border border-white/12 bg-[linear-gradient(180deg,#131d2e_0%,#0d1525_100%)] shadow-[0_40px_100px_rgba(0,0,0,0.6)] animate-[float-up_var(--motion-medium)_var(--ease-enter)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div className="absolute inset-x-0 top-0 h-20 rounded-t-[28px] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.1),transparent_70%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5">
                <span className="rounded-xl bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] p-1 text-white shadow-[0_8px_16px_rgba(37,99,235,0.28)]">
                  <WalletCards className="h-3.5 w-3.5" />
                </span>
                <span className="text-[12px] font-semibold text-white/70">Payment Collection</span>
              </div>
              <p className="mt-2 text-[11px] text-white/40">Collect rent, record payment, and attach proof if needed.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close"
              className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/50 transition hover:bg-white/[0.10] hover:text-white disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-none touch-pan-y px-5 pb-2 sm:px-6">
          {/* Tenant info card */}
          {tenant ? (
            <div className="mb-5 rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Tenant</p>
              <p className="mt-1.5 text-base font-semibold text-white">{tenant.fullName}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <InfoPill label="ID" value={`#${tenant.tenantId}`} />
                <InfoPill
                  label="Room"
                  value={
                    tenant.assignment
                      ? `F${tenant.assignment.floorNumber} / R${tenant.assignment.roomNumber}`
                      : "Pending"
                  }
                />
                <InfoPill label="Rent" value={`Rs ${tenant.monthlyRent.toLocaleString("en-IN")}`} />
                <InfoPill label="Due" value={formatPaymentDate(tenant.nextDueDate)} />
              </div>
            </div>
          ) : null}

          {/* Form */}
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <DarkField label="Paid Amount" icon={<IndianRupee className="h-4 w-4" />}>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={submitting}
                  placeholder="Enter amount"
                  className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                />
              </DarkField>

              <DarkField label="Paid On Date" icon={<CalendarDays className="h-4 w-4" />}>
                <input
                  type="date"
                  value={paidOnDate}
                  onChange={(e) => setPaidOnDate(e.target.value)}
                  disabled={submitting}
                  className="w-full bg-transparent text-[13px] text-white outline-none [color-scheme:dark]"
                />
              </DarkField>
            </div>

            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-white/60">Payment Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setPaymentMode(mode.value)}
                    disabled={submitting}
                    className={`rounded-2xl border px-3 py-2.5 text-[12px] font-semibold transition ${
                      paymentMode === mode.value
                        ? "border-[#38bdf8]/60 bg-[#38bdf8]/10 text-[#38bdf8]"
                        : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {paymentMode !== "cash" ? (
              <DarkField
                label="Transaction ID *"
                icon={<CreditCard className="h-4 w-4" />}
              >
                <input
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value.toUpperCase())}
                  disabled={submitting}
                  placeholder="Enter transaction ID"
                  className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
                />
              </DarkField>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-[12px] font-medium text-red-400">{error}</p>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-2.5 text-[13px] font-semibold text-white/70 transition hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#1d4ed8_0%,#2563eb_100%)] px-5 text-[13px] font-semibold text-white shadow-[0_14px_32px_rgba(37,99,235,0.3)] transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? (
              "Recording..."
            ) : (
              <>
                <Check className="h-4 w-4" />
                Record Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">{label}</p>
      <p className="mt-1 text-[12px] font-semibold text-white/80">{value}</p>
    </div>
  );
}

function DarkField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-white/60">{label}</span>
      <div className="flex items-center gap-2.5 rounded-2xl border border-white/12 bg-white/[0.05] px-3.5 py-3 text-white/40 transition focus-within:border-[#38bdf8]/40 focus-within:bg-white/[0.07]">
        <span className="flex-shrink-0">{icon}</span>
        {children}
      </div>
    </label>
  );
}
