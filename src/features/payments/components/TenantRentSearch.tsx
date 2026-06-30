"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { CalendarDays, ImageUp, Search, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useToast } from "@/components/ui/toast";
import { recordTenantPayment } from "@/services/tenants/tenants.service";
import { formatPaymentDate, fmtTenantId } from "@/utils/payment";
import type { TenantRecord } from "@/types/tenant";

export function TenantRentSearch({ tenants, hideButton }: { tenants: TenantRecord[]; hideButton?: boolean }) {
  return (
    <Suspense fallback={hideButton ? null : <TenantRentSearchButton disabled />}>
      <TenantRentSearchContent tenants={tenants} hideButton={hideButton} />
    </Suspense>
  );
}

function TenantRentSearchContent({ tenants, hideButton }: { tenants: TenantRecord[]; hideButton?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [amount, setAmount] = useState("");
  const [paidOnDate, setPaidOnDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [txnId, setTxnId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  // Discount
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [discountValue, setDiscountValue] = useState("");
  const [discountMonths, setDiscountMonths] = useState("1");
  const [discountNote, setDiscountNote] = useState("");

  // Partial payment
  const [isPartial, setIsPartial] = useState(false);
  const [partialNote, setPartialNote] = useState("");
  const [deferredTo, setDeferredTo] = useState("");

  // Balance collection mode
  const [isBalanceMode, setIsBalanceMode] = useState(false);
  const [balanceNote, setBalanceNote] = useState("");

  const { toast } = useToast();

  useLockBodyScroll(open);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!normalizedQuery) return [];
    return tenants.filter((tenant) => {
      const tenantIdMatch = tenant.tenantId.includes(normalizedQuery);
      const nameMatch = tenant.fullName.toLowerCase().includes(normalizedQuery);
      return tenantIdMatch || nameMatch;
    });
  }, [normalizedQuery, tenants]);

  const selectedTenant = selectedTenantId
    ? (tenants.find((tenant) => tenant.tenantId === selectedTenantId) ?? null)
    : null;

  // Computed effective amount after discount
  const discountAmountNum = useMemo(() => {
    if (!applyDiscount || !selectedTenant) return 0;
    const val = Number(discountValue) || 0;
    if (discountType === "fixed") return Math.min(val, selectedTenant.monthlyRent);
    return Math.round((selectedTenant.monthlyRent * Math.min(val, 100)) / 100);
  }, [applyDiscount, discountType, discountValue, selectedTenant]);

  const effectiveRent = selectedTenant ? Math.max(0, selectedTenant.monthlyRent - discountAmountNum) : 0;

  // Auto-fill amount from effective rent (unless user already changed it)
  const [amountTouched, setAmountTouched] = useState(false);
  useEffect(() => {
    if (!amountTouched && selectedTenant && step === 2) {
      setAmount(String(effectiveRent));
    }
  }, [effectiveRent, selectedTenant, step, amountTouched]);

  const balanceDue = isPartial && selectedTenant
    ? Math.max(0, effectiveRent - (Number(amount) || 0))
    : 0;

  useEffect(() => {
    const action = searchParams.get("action");
    const tenantId = searchParams.get("tenantId");

    if (action !== "pay-rent") {
      queueMicrotask(() => setOpen(false));
      return;
    }

    const targetTenant = tenantId ? tenants.find((tenant) => tenant.tenantId === tenantId) : null;

    queueMicrotask(() => {
      setOpen(true);
      setError("");

      if (targetTenant) {
        setQuery(targetTenant.tenantId);
        setSelectedTenantId(targetTenant.tenantId);
        setAmountTouched(false);
        setPaidOnDate(new Date().toISOString().slice(0, 10));
        setStep(2);
        // Auto-detect balance mode (only when balance is positive — negative means credit)
        if (targetTenant.pendingBalance && targetTenant.pendingBalance.amount > 0) {
          setIsBalanceMode(true);
          setAmount(String(targetTenant.pendingBalance.amount));
        } else {
          setIsBalanceMode(false);
          // Pre-fill active discount if exists
          if (targetTenant.activeDiscount) {
            setApplyDiscount(true);
            setDiscountType(targetTenant.activeDiscount.type);
            setDiscountValue(String(targetTenant.activeDiscount.value));
            setDiscountMonths(String(targetTenant.activeDiscount.monthsTotal - targetTenant.activeDiscount.monthsUsed));
          } else {
            setApplyDiscount(false);
          }
        }
      } else {
        setQuery("");
        setSelectedTenantId("");
        setStep(1);
      }
    });
  }, [searchParams, tenants]);

  const resetState = () => {
    setOpen(false);
    setStep(1);
    setQuery("");
    setSelectedTenantId("");
    setAmount("");
    setAmountTouched(false);
    setPaidOnDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod("cash");
    setTxnId("");
    setProofFile(null);
    setError("");
    setSubmitting(false);
    setApplyDiscount(false);
    setDiscountType("fixed");
    setDiscountValue("");
    setDiscountMonths("1");
    setDiscountNote("");
    setIsPartial(false);
    setPartialNote("");
    setDeferredTo("");
    setIsBalanceMode(false);
    setBalanceNote("");
    if (searchParams.get("action") === "pay-rent") {
      router.replace(pathname);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedTenant) {
      setError("Select a tenant before recording payment.");
      return;
    }

    if (submitting) return;

    const numericAmount = Number(amount);

    if (!amount.trim()) {
      setError("Enter the paid amount before recording payment.");
      return;
    }

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid paid amount greater than 0.");
      return;
    }

    if (!paidOnDate) {
      setError("Choose the payment date.");
      return;
    }

    if (applyDiscount && !isBalanceMode) {
      const dv = Number(discountValue);
      if (!discountValue || Number.isNaN(dv) || dv <= 0) {
        setError("Enter a valid discount value.");
        return;
      }
      if (discountType === "percent" && dv > 100) {
        setError("Percentage discount cannot exceed 100%.");
        return;
      }
    }

    setSubmitting(true);
    setError("");

    const payload = new FormData();
    payload.append("tenantId", selectedTenant.tenantId);
    payload.append("amount", String(numericAmount));
    payload.append("paidOnDate", paidOnDate);
    payload.append("paymentMethod", paymentMethod);
    payload.append("txnId", txnId);

    if (isBalanceMode) {
      payload.append("isBalanceCollection", "true");
      if (balanceNote.trim()) payload.append("balanceNote", balanceNote.trim());
    } else {
      if (applyDiscount && discountValue && Number(discountValue) > 0) {
        payload.append("discountType", discountType);
        payload.append("discountValue", discountValue);
        payload.append("discountMonths", discountMonths || "1");
        if (discountNote.trim()) payload.append("discountNote", discountNote.trim());
      }
      if (isPartial && balanceDue > 0) {
        payload.append("isPartial", "true");
        if (partialNote.trim()) payload.append("partialNote", partialNote.trim());
        if (deferredTo.trim()) payload.append("deferredTo", deferredTo.trim());
      }
    }

    if (proofFile) {
      payload.append("proofImage", proofFile);
    }

    const { response, data } = await recordTenantPayment(payload);

    if (!response.ok) {
      const msg = data.message ?? "Unable to record payment.";
      setError(msg);
      toast(msg, "error");
      setSubmitting(false);
      return;
    }

    const successMsg = isBalanceMode
      ? `Balance collected for ${selectedTenant.fullName}.`
      : isPartial && balanceDue > 0
        ? `Partial payment recorded. ₹${balanceDue.toLocaleString("en-IN")} balance pending.`
        : `Payment recorded for ${selectedTenant.fullName}.`;
    toast(successMsg, "success");
    setSubmitting(false);
    router.refresh();
    resetState();
  };

  const handleNextFromTenant = () => {
    if (!selectedTenant) {
      setError("Select a tenant before continuing.");
      return;
    }

    // When moving to step 2, set up modes based on tenant state
    const hasPending = !!selectedTenant.pendingBalance && selectedTenant.pendingBalance.amount > 0;
    const hasActiveDiscount = !!selectedTenant.activeDiscount;

    setIsBalanceMode(hasPending);
    if (hasPending) {
      setAmount(String(selectedTenant.pendingBalance!.amount));
    } else {
      if (hasActiveDiscount) {
        setApplyDiscount(true);
        setDiscountType(selectedTenant.activeDiscount!.type);
        setDiscountValue(String(selectedTenant.activeDiscount!.value));
        setDiscountMonths(String(selectedTenant.activeDiscount!.monthsTotal - selectedTenant.activeDiscount!.monthsUsed));
      }
      setAmountTouched(false);
    }

    setError("");
    setStep(2);
  };

  return (
    <>
      {!hideButton && (
        <TenantRentSearchButton
          disabled={submitting}
          onClick={() => router.replace(`${pathname}?action=pay-rent`)}
        />
      )}

      {open && mounted
        ? createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto overscroll-none touch-pan-y px-3 py-3 sm:items-center sm:px-4 sm:py-4"
          style={{ background: "rgba(2,6,23,0.72)", backdropFilter: "blur(6px)" }}
        >
          <div className="flex min-h-full w-full max-w-2xl items-start justify-center sm:items-center">
            <Card className="flex max-h-[90dvh] w-[min(calc(100vw-2rem),42rem)] flex-col overflow-hidden border-white/12 bg-[linear-gradient(180deg,#131d2e_0%,#0d1525_100%)] p-3 sm:p-4 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[13px] font-semibold text-white/70">
                    <span className="rounded-xl bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] p-1 text-white shadow-[0_8px_16px_rgba(37,99,235,0.28)]">
                      <WalletCards className="h-3.5 w-3.5" />
                    </span>
                    Payment Collection
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
                    {isBalanceMode ? "Collect Balance" : "Collect Rent"}
                  </h2>
                  <p className="mt-1 text-sm text-white/45">
                    {isBalanceMode
                      ? "Collecting deferred balance from a previous partial payment."
                      : "Collect rent, record payment, and attach proof if needed."}
                  </p>
                </div>
                <Button variant="ghost" disabled={submitting} aria-label="Close" className="rounded-2xl px-3 text-white/60 hover:text-white" onClick={resetState}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 sm:mt-4 flex-1 space-y-4 overflow-y-auto overscroll-none touch-pan-y pr-1">
                <div className="flex flex-wrap gap-2">
                  <StepPill label="1. Tenant" active={step === 1} done={step > 1} />
                  <StepPill label="2. Payment" active={step === 2} done={false} />
                </div>

                {step === 1 ? (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-white/70">Search by tenant ID or name</span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                        <input
                          value={query}
                          onChange={(event) => {
                            const next = event.target.value;
                            setQuery(next);
                            if (step === 1) setSelectedTenantId("");
                            setError("");
                          }}
                          disabled={submitting}
                          placeholder="Type last 5-digit ID or tenant name"
                          className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 pl-11 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#38bdf8]/40"
                        />
                      </div>
                    </label>

                    {!normalizedQuery ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/40">
                        Start typing a tenant ID or name to find the correct tenant.
                      </div>
                    ) : matches.length === 0 ? (
                      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-400">
                        No tenant matched that search.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {matches.map((tenant) => {
                          const active = selectedTenantId === tenant.tenantId;
                          const hasPending = !!tenant.pendingBalance && tenant.pendingBalance.amount > 0;

                          return (
                            <button
                              key={tenant.tenantId}
                              type="button"
                              disabled={submitting}
                              onClick={() => {
                                setSelectedTenantId(tenant.tenantId);
                                setAmount(String(tenant.monthlyRent));
                                setAmountTouched(false);
                                setError("");
                              }}
                              className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                                active
                                  ? "border-[#38bdf8]/40 bg-[#38bdf8]/10"
                                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-white">{tenant.fullName}</p>
                                {hasPending && (
                                  <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
                                    Balance due ₹{tenant.pendingBalance!.amount.toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-white/50">Tenant ID {fmtTenantId(tenant.tenantId)} • {tenant.phone}</p>
                              <p className="mt-1 text-sm text-white/50">
                                Room {tenant.assignment?.roomNumber ?? "-"}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : null}

                {selectedTenant && step >= 2 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/50">
                    <p className="font-semibold text-white">{selectedTenant.fullName}</p>
                    <p className="mt-1">Tenant ID: {fmtTenantId(selectedTenant.tenantId)}</p>
                    <p className="mt-1">Room {selectedTenant.assignment?.roomNumber ?? "-"}</p>
                    {isBalanceMode && selectedTenant.pendingBalance ? (
                      <p className="mt-1 font-semibold text-orange-400">
                        Balance due: ₹{selectedTenant.pendingBalance.amount.toLocaleString("en-IN")} (from {selectedTenant.pendingBalance.partialPaidDate})
                      </p>
                    ) : (
                      <p className="mt-1">Next due: {formatPaymentDate(selectedTenant.nextDueDate)}</p>
                    )}
                  </div>
                ) : null}

                {selectedTenant && step === 2 ? (
                  <>
                    {/* ── Balance collection mode ── */}
                    {isBalanceMode ? (
                      <div className="rounded-2xl border border-orange-500/30 bg-orange-500/[0.07] p-4 space-y-3">
                        <p className="text-sm font-semibold text-orange-300">Collecting deferred balance</p>
                        {selectedTenant.pendingBalance?.note && (
                          <p className="text-xs text-white/50">{selectedTenant.pendingBalance.note}</p>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-white/70">Balance Amount</span>
                            <input
                              type="number"
                              min="0"
                              value={amount}
                              onChange={(e) => { setAmount(e.target.value); setAmountTouched(true); }}
                              disabled={submitting}
                              className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none focus:border-[#38bdf8]/40 [color-scheme:dark]"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-white/70">Paid On Date</span>
                            <div className="relative">
                              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                              <input
                                type="date"
                                value={paidOnDate}
                                onChange={(e) => setPaidOnDate(e.target.value)}
                                disabled={submitting}
                                className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 pl-11 text-sm text-white outline-none focus:border-[#38bdf8]/40 [color-scheme:dark]"
                              />
                            </div>
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-white/70">Payment Mode</span>
                            <select
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value === "online" ? "online" : "cash")}
                              disabled={submitting}
                              className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none focus:border-[#38bdf8]/40 [color-scheme:dark]"
                            >
                              <option value="cash">Cash</option>
                              <option value="online">Online / UPI</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-white/70">Txn ID (Optional)</span>
                            <input
                              value={txnId}
                              onChange={(e) => setTxnId(e.target.value.toUpperCase())}
                              disabled={submitting}
                              placeholder={paymentMethod === "online" ? "Enter transaction ID" : "Optional for cash"}
                              className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#38bdf8]/40"
                            />
                          </label>
                          <label className="block md:col-span-2">
                            <span className="mb-2 block text-sm font-medium text-white/70">Note (Optional)</span>
                            <input
                              value={balanceNote}
                              onChange={(e) => setBalanceNote(e.target.value)}
                              disabled={submitting}
                              placeholder="e.g. Balance received via UPI"
                              className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#38bdf8]/40"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      /* ── Normal payment mode ── */
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-white/70">Paid Amount</span>
                          <input
                            type="number"
                            min="0"
                            value={amount}
                            onChange={(e) => { setAmount(e.target.value); setAmountTouched(true); }}
                            disabled={submitting}
                            className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none focus:border-[#38bdf8]/40 [color-scheme:dark]"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-white/70">Paid On Date</span>
                          <div className="relative">
                            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                            <input
                              type="date"
                              value={paidOnDate}
                              onChange={(e) => setPaidOnDate(e.target.value)}
                              disabled={submitting}
                              className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 pl-11 text-sm text-white outline-none focus:border-[#38bdf8]/40 [color-scheme:dark]"
                            />
                          </div>
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-white/70">Payment Mode</span>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value === "online" ? "online" : "cash")}
                            disabled={submitting}
                            className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none focus:border-[#38bdf8]/40 [color-scheme:dark]"
                          >
                            <option value="cash">Cash</option>
                            <option value="online">Online / UPI</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-white/70">Txn ID (Optional)</span>
                          <input
                            value={txnId}
                            onChange={(e) => setTxnId(e.target.value.toUpperCase())}
                            disabled={submitting}
                            placeholder={paymentMethod === "online" ? "Enter transaction ID" : "Optional for cash"}
                            className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#38bdf8]/40"
                          />
                        </label>

                        <label className="block md:col-span-2">
                          <span className="mb-2 block text-sm font-medium text-white/70">Proof / Receipt (Optional)</span>
                          <div className="relative">
                            <ImageUp className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                            <input
                              type="file"
                              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                              accept="image/*,.pdf"
                              disabled={submitting}
                              className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 pl-11 text-sm text-white outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-blue-600/80 file:px-3 file:py-1.5 file:text-xs file:text-white"
                            />
                          </div>
                          {proofFile ? <p className="mt-1 text-xs text-white/40">{proofFile.name}</p> : null}
                        </label>

                        {/* ── Discount section ── */}
                        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={applyDiscount}
                              onChange={(e) => {
                                setApplyDiscount(e.target.checked);
                                if (!e.target.checked) {
                                  setDiscountValue("");
                                  setDiscountMonths("1");
                                  setDiscountNote("");
                                  setAmountTouched(false);
                                }
                              }}
                              disabled={submitting}
                              className="h-4 w-4 rounded border-white/20 bg-white/10 accent-blue-500"
                            />
                            <span className="text-sm font-medium text-white/80">Apply discount this month</span>
                            {selectedTenant?.activeDiscount && (
                              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                Active — {selectedTenant.activeDiscount.monthsTotal - selectedTenant.activeDiscount.monthsUsed} mo left
                              </span>
                            )}
                          </label>

                          {applyDiscount && (
                            <div className="grid gap-3 sm:grid-cols-3">
                              <label className="block">
                                <span className="mb-1.5 block text-xs font-medium text-white/60">Type</span>
                                <select
                                  value={discountType}
                                  onChange={(e) => { setDiscountType(e.target.value === "percent" ? "percent" : "fixed"); setAmountTouched(false); }}
                                  disabled={submitting}
                                  className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:border-[#38bdf8]/40 [color-scheme:dark]"
                                >
                                  <option value="fixed">Fixed ₹</option>
                                  <option value="percent">Percent %</option>
                                </select>
                              </label>
                              <label className="block">
                                <span className="mb-1.5 block text-xs font-medium text-white/60">
                                  {discountType === "fixed" ? "Amount (₹)" : "Percent (%)"}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  max={discountType === "percent" ? 100 : undefined}
                                  value={discountValue}
                                  onChange={(e) => { setDiscountValue(e.target.value); setAmountTouched(false); }}
                                  disabled={submitting}
                                  placeholder={discountType === "fixed" ? "e.g. 500" : "e.g. 10"}
                                  className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#38bdf8]/40 [color-scheme:dark]"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1.5 block text-xs font-medium text-white/60">Months</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={discountMonths}
                                  onChange={(e) => setDiscountMonths(e.target.value)}
                                  disabled={submitting || !!selectedTenant?.activeDiscount}
                                  placeholder="1"
                                  className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#38bdf8]/40 [color-scheme:dark] disabled:opacity-50"
                                />
                              </label>
                              <label className="block sm:col-span-3">
                                <span className="mb-1.5 block text-xs font-medium text-white/60">Reason (Optional)</span>
                                <input
                                  value={discountNote}
                                  onChange={(e) => setDiscountNote(e.target.value)}
                                  disabled={submitting}
                                  placeholder="e.g. Festive offer, long stay bonus…"
                                  className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#38bdf8]/40"
                                />
                              </label>
                              {discountAmountNum > 0 && (
                                <div className="sm:col-span-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] px-3 py-2 text-[12px] text-emerald-300">
                                  Discount: ₹{discountAmountNum.toLocaleString("en-IN")} off → Effective rent: ₹{effectiveRent.toLocaleString("en-IN")}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ── Partial payment section ── */}
                        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isPartial}
                              onChange={(e) => {
                                setIsPartial(e.target.checked);
                                if (!e.target.checked) {
                                  setPartialNote("");
                                  setDeferredTo("");
                                  setAmountTouched(false);
                                }
                              }}
                              disabled={submitting}
                              className="h-4 w-4 rounded border-white/20 bg-white/10 accent-orange-500"
                            />
                            <span className="text-sm font-medium text-white/80">Partial payment (collect balance later)</span>
                          </label>

                          {isPartial && (
                            <div className="space-y-3">
                              <div className="rounded-xl border border-orange-500/30 bg-orange-500/[0.07] px-3 py-2 text-[12px] text-orange-300">
                                {balanceDue > 0
                                  ? <>Paying ₹{(Number(amount) || 0).toLocaleString("en-IN")} today — ₹{balanceDue.toLocaleString("en-IN")} balance deferred</>
                                  : <>Amount equals full rent — no balance will be deferred</>
                                }
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block">
                                  <span className="mb-1.5 block text-xs font-medium text-white/60">Collect balance by (Optional)</span>
                                  <div className="relative">
                                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                                    <input
                                      type="date"
                                      value={deferredTo}
                                      onChange={(e) => setDeferredTo(e.target.value)}
                                      disabled={submitting}
                                      className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 pl-9 text-sm text-white outline-none focus:border-[#38bdf8]/40 [color-scheme:dark]"
                                    />
                                  </div>
                                </label>
                                <label className="block">
                                  <span className="mb-1.5 block text-xs font-medium text-white/60">Note (Optional)</span>
                                  <input
                                    value={partialNote}
                                    onChange={(e) => setPartialNote(e.target.value)}
                                    disabled={submitting}
                                    placeholder="e.g. Will pay rest on salary day"
                                    className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#38bdf8]/40"
                                  />
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              {error ? <p role="alert" className="mt-4 text-sm text-red-400">{error}</p> : null}

              <div className="mt-3 sm:mt-4 flex flex-col-reverse gap-3 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={step === 1 ? resetState : () => setStep(1)}
                  disabled={submitting}
                  className="rounded-2xl border-white/12 bg-white/[0.05] text-white/70 hover:text-white"
                >
                  {step === 1 ? "Cancel" : "Back"}
                </Button>

                <Button
                  disabled={submitting}
                  onClick={step === 1 ? handleNextFromTenant : handleRecordPayment}
                  className={`rounded-2xl bg-[linear-gradient(90deg,#1d4ed8_0%,#2563eb_100%)] text-white hover:text-white hover:brightness-110 ${submitting ? "opacity-70" : ""}`}
                >
                  {step === 1
                    ? "Next: Payment"
                    : submitting
                      ? "Recording..."
                      : isBalanceMode
                        ? "Collect Balance"
                        : "Record Payment"}
                </Button>
              </div>
            </Card>
          </div>
        </div>,
        document.body,
      )
        : null}
    </>
  );
}

function TenantRentSearchButton({
  disabled = false,
  onClick,
}: {
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      disabled={disabled}
      className="min-h-12 w-full rounded-2xl border border-blue-500 bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-soft)] hover:text-white hover:opacity-95"
      onClick={onClick}
    >
      <WalletCards className="mr-2 h-4 w-4" />
      Pay Rent
    </Button>
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
          ? "border border-blue-500/60 bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)]"
          : done
            ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
            : "border border-white/12 bg-white/[0.05] text-white/40"
      }`}
    >
      {label}
    </span>
  );
}
