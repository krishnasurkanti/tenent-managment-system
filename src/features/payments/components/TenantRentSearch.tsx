"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ImageUp, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay/modal";
import { FormField } from "@/components/ui/form/field";
import { TextInput } from "@/components/ui/form/text-input";
import { AmountInput } from "@/components/ui/form/amount-input";
import { SearchInput } from "@/components/ui/form/search-input";
import { SelectInput } from "@/components/ui/form/select-input";
import { useToast } from "@/components/ui/toast";
import { recordTenantPayment } from "@/services/tenants/tenants.service";
import { formatPaymentDate, fmtTenantId } from "@/utils/payment";
import type { TenantRecord } from "@/types/tenant";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const MODE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "online", label: "Online / UPI" },
];

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

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!normalizedQuery) return [];
    return tenants.filter((tenant) => tenant.tenantId.includes(normalizedQuery) || tenant.fullName.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, tenants]);

  const selectedTenant = selectedTenantId ? (tenants.find((tenant) => tenant.tenantId === selectedTenantId) ?? null) : null;

  const discountAmountNum = useMemo(() => {
    if (!applyDiscount || !selectedTenant) return 0;
    const val = Number(discountValue) || 0;
    if (discountType === "fixed") return Math.min(val, selectedTenant.monthlyRent);
    return Math.round((selectedTenant.monthlyRent * Math.min(val, 100)) / 100);
  }, [applyDiscount, discountType, discountValue, selectedTenant]);

  const effectiveRent = selectedTenant ? Math.max(0, selectedTenant.monthlyRent - discountAmountNum) : 0;

  const [amountTouched, setAmountTouched] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- auto-fill amount from computed effective rent until the user edits it */
  useEffect(() => {
    if (!amountTouched && selectedTenant && step === 2) {
      setAmount(String(effectiveRent));
    }
  }, [effectiveRent, selectedTenant, step, amountTouched]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const balanceDue = isPartial && selectedTenant ? Math.max(0, effectiveRent - (Number(amount) || 0)) : 0;

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
        if (targetTenant.pendingBalance && targetTenant.pendingBalance.amount > 0) {
          setIsBalanceMode(true);
          setAmount(String(targetTenant.pendingBalance.amount));
        } else {
          setIsBalanceMode(false);
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
    if (!selectedTenant) return setError("Select a tenant before recording payment.");
    if (submitting) return;

    const numericAmount = Number(amount);
    if (!amount.trim()) return setError("Enter the paid amount before recording payment.");
    if (Number.isNaN(numericAmount) || numericAmount <= 0) return setError("Enter a valid paid amount greater than 0.");
    if (!paidOnDate) return setError("Choose the payment date.");

    if (applyDiscount && !isBalanceMode) {
      const dv = Number(discountValue);
      if (!discountValue || Number.isNaN(dv) || dv <= 0) return setError("Enter a valid discount value.");
      if (discountType === "percent" && dv > 100) return setError("Percentage discount cannot exceed 100%.");
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

    if (proofFile) payload.append("proofImage", proofFile);

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
        ? `Partial payment recorded. ${inr(balanceDue)} balance pending.`
        : `Payment recorded for ${selectedTenant.fullName}.`;
    toast(successMsg, "success");
    setSubmitting(false);
    router.refresh();
    resetState();
  };

  const handleNextFromTenant = () => {
    if (!selectedTenant) return setError("Select a tenant before continuing.");

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

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="secondary" onClick={step === 1 ? resetState : () => setStep(1)} disabled={submitting}>
        {step === 1 ? "Cancel" : "Back"}
      </Button>
      <Button disabled={submitting} loading={submitting && step === 2} onClick={step === 1 ? handleNextFromTenant : handleRecordPayment}>
        {step === 1 ? "Next: Payment" : submitting ? "Recording…" : isBalanceMode ? "Collect Balance" : "Record Payment"}
      </Button>
    </div>
  );

  return (
    <>
      {!hideButton && <TenantRentSearchButton disabled={submitting} onClick={() => router.replace(`${pathname}?action=pay-rent`)} />}

      {open && mounted ? (
        <Modal
          open
          onClose={resetState}
          size="lg"
          zIndexClass="z-[80]"
          title={isBalanceMode ? "Collect balance" : "Collect rent"}
          description={isBalanceMode ? "Collecting deferred balance from a previous partial payment." : "Collect rent, record payment, and attach proof if needed."}
          footer={footer}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <StepPill label="1. Tenant" active={step === 1} done={step > 1} />
              <StepPill label="2. Payment" active={step === 2} done={false} />
            </div>

            {step === 1 ? (
              <>
                <FormField label="Search by tenant ID or name">
                  {({ id }) => (
                    <SearchInput
                      id={id}
                      value={query}
                      onValueChange={(v) => { setQuery(v); setSelectedTenantId(""); setError(""); }}
                      placeholder="Type last 5-digit ID or tenant name"
                    />
                  )}
                </FormField>

                {!normalizedQuery ? (
                  <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-4 text-sm text-[color:var(--fg-tertiary)]">
                    Start typing a tenant ID or name to find the correct tenant.
                  </div>
                ) : matches.length === 0 ? (
                  <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-4 py-4 text-sm text-[color:var(--error)]">
                    No tenant matched that search.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {matches.map((tenant) => {
                      const active = selectedTenantId === tenant.tenantId;
                      const hasPending = !!tenant.pendingBalance && tenant.pendingBalance.amount > 0;
                      return (
                        <button
                          key={tenant.tenantId}
                          type="button"
                          disabled={submitting}
                          onClick={() => { setSelectedTenantId(tenant.tenantId); setAmount(String(tenant.monthlyRent)); setAmountTouched(false); setError(""); }}
                          className={`w-full rounded-[var(--radius-md)] border px-4 py-3 text-left transition ${
                            active
                              ? "border-[color:color-mix(in_srgb,var(--brand)_45%,transparent)] bg-[color:var(--brand-soft)]"
                              : "border-[color:var(--border)] bg-[color:var(--surface-soft)] hover:border-[color:var(--border-strong)]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[color:var(--fg-primary)]">{tenant.fullName}</p>
                            {hasPending ? (
                              <span className="rounded-full border border-[color:var(--warning)] bg-[color:var(--warning-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--warning)]">
                                Balance due {inr(tenant.pendingBalance!.amount)}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">Tenant ID {fmtTenantId(tenant.tenantId)} · {tenant.phone}</p>
                          <p className="mt-0.5 text-sm text-[color:var(--fg-secondary)]">Room {tenant.assignment?.roomNumber ?? "-"}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : null}

            {selectedTenant && step >= 2 ? (
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4 text-sm text-[color:var(--fg-secondary)]">
                <p className="font-semibold text-[color:var(--fg-primary)]">{selectedTenant.fullName}</p>
                <p className="mt-1">Tenant ID: {fmtTenantId(selectedTenant.tenantId)}</p>
                <p className="mt-0.5">Room {selectedTenant.assignment?.roomNumber ?? "-"}</p>
                {isBalanceMode && selectedTenant.pendingBalance ? (
                  <p className="mt-1 font-semibold text-[color:var(--warning)]">
                    Balance due: {inr(selectedTenant.pendingBalance.amount)} (from {selectedTenant.pendingBalance.partialPaidDate})
                  </p>
                ) : (
                  <p className="mt-1">Next due: {formatPaymentDate(selectedTenant.nextDueDate)}</p>
                )}
              </div>
            ) : null}

            {selectedTenant && step === 2 ? (
              isBalanceMode ? (
                <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[color:var(--warning-soft)] p-4">
                  <p className="text-sm font-semibold text-[color:var(--warning)]">Collecting deferred balance</p>
                  {selectedTenant.pendingBalance?.note ? <p className="text-xs text-[color:var(--fg-secondary)]">{selectedTenant.pendingBalance.note}</p> : null}
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField label="Balance amount">
                      {({ id }) => <AmountInput id={id} value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^\d.]/g, "")); setAmountTouched(true); }} disabled={submitting} />}
                    </FormField>
                    <FormField label="Paid on date">
                      {({ id }) => <TextInput id={id} type="date" value={paidOnDate} onChange={(e) => setPaidOnDate(e.target.value)} disabled={submitting} leadingIcon={<CalendarDays size={15} />} className="[color-scheme:dark]" />}
                    </FormField>
                    <FormField label="Payment mode">
                      {({ id }) => <SelectInput id={id} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value === "online" ? "online" : "cash")} disabled={submitting} options={MODE_OPTIONS} />}
                    </FormField>
                    <FormField label="Txn ID (optional)">
                      {({ id }) => <TextInput id={id} value={txnId} onChange={(e) => setTxnId(e.target.value.toUpperCase())} disabled={submitting} placeholder={paymentMethod === "online" ? "Enter transaction ID" : "Optional for cash"} />}
                    </FormField>
                    <div className="md:col-span-2">
                      <FormField label="Note (optional)">
                        {({ id }) => <TextInput id={id} value={balanceNote} onChange={(e) => setBalanceNote(e.target.value)} disabled={submitting} placeholder="e.g. Balance received via UPI" />}
                      </FormField>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField label="Paid amount">
                    {({ id }) => <AmountInput id={id} value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^\d.]/g, "")); setAmountTouched(true); }} disabled={submitting} />}
                  </FormField>
                  <FormField label="Paid on date">
                    {({ id }) => <TextInput id={id} type="date" value={paidOnDate} onChange={(e) => setPaidOnDate(e.target.value)} disabled={submitting} leadingIcon={<CalendarDays size={15} />} className="[color-scheme:dark]" />}
                  </FormField>
                  <FormField label="Payment mode">
                    {({ id }) => <SelectInput id={id} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value === "online" ? "online" : "cash")} disabled={submitting} options={MODE_OPTIONS} />}
                  </FormField>
                  <FormField label="Txn ID (optional)">
                    {({ id }) => <TextInput id={id} value={txnId} onChange={(e) => setTxnId(e.target.value.toUpperCase())} disabled={submitting} placeholder={paymentMethod === "online" ? "Enter transaction ID" : "Optional for cash"} />}
                  </FormField>

                  <div className="md:col-span-2">
                    <FormField label="Proof / receipt (optional)">
                      {({ id }) => (
                        <div className="relative">
                          <ImageUp size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--fg-tertiary)]" />
                          <input
                            id={id}
                            type="file"
                            onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                            accept="image/*,.pdf"
                            disabled={submitting}
                            className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-2.5 pl-9 text-sm text-[color:var(--fg-primary)] outline-none file:mr-3 file:rounded-md file:border-0 file:bg-[color:var(--cta)] file:px-3 file:py-1.5 file:text-xs file:text-white"
                          />
                        </div>
                      )}
                    </FormField>
                    {proofFile ? <p className="mt-1 text-xs text-[color:var(--fg-tertiary)]">{proofFile.name}</p> : null}
                  </div>

                  {/* Discount */}
                  <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4 md:col-span-2">
                    <label className="flex cursor-pointer select-none items-center gap-3">
                      <input
                        type="checkbox"
                        checked={applyDiscount}
                        onChange={(e) => {
                          setApplyDiscount(e.target.checked);
                          if (!e.target.checked) { setDiscountValue(""); setDiscountMonths("1"); setDiscountNote(""); setAmountTouched(false); }
                        }}
                        disabled={submitting}
                        className="h-4 w-4 accent-[color:var(--brand)]"
                      />
                      <span className="text-sm font-medium text-[color:var(--fg-primary)]">Apply discount this month</span>
                      {selectedTenant?.activeDiscount ? (
                        <span className="rounded-full border border-[color:color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color:var(--success-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--success)]">
                          Active — {selectedTenant.activeDiscount.monthsTotal - selectedTenant.activeDiscount.monthsUsed} mo left
                        </span>
                      ) : null}
                    </label>

                    {applyDiscount ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <FormField label="Type">
                          {({ id }) => (
                            <SelectInput
                              id={id}
                              value={discountType}
                              onChange={(e) => { setDiscountType(e.target.value === "percent" ? "percent" : "fixed"); setAmountTouched(false); }}
                              disabled={submitting}
                              options={[{ value: "fixed", label: "Fixed ₹" }, { value: "percent", label: "Percent %" }]}
                            />
                          )}
                        </FormField>
                        <FormField label={discountType === "fixed" ? "Amount (₹)" : "Percent (%)"}>
                          {({ id }) => (
                            <AmountInput
                              id={id}
                              currency={discountType === "fixed" ? "₹" : "%"}
                              value={discountValue}
                              onChange={(e) => { setDiscountValue(e.target.value.replace(/[^\d.]/g, "")); setAmountTouched(false); }}
                              disabled={submitting}
                              placeholder={discountType === "fixed" ? "e.g. 500" : "e.g. 10"}
                            />
                          )}
                        </FormField>
                        <FormField label="Months">
                          {({ id }) => (
                            <TextInput id={id} inputMode="numeric" value={discountMonths} onChange={(e) => setDiscountMonths(e.target.value.replace(/\D/g, ""))} disabled={submitting || !!selectedTenant?.activeDiscount} placeholder="1" />
                          )}
                        </FormField>
                        <div className="sm:col-span-3">
                          <FormField label="Reason (optional)">
                            {({ id }) => <TextInput id={id} value={discountNote} onChange={(e) => setDiscountNote(e.target.value)} disabled={submitting} placeholder="e.g. Festive offer, long stay bonus…" />}
                          </FormField>
                        </div>
                        {discountAmountNum > 0 ? (
                          <div className="rounded-[var(--radius-sm)] border border-[color:color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color:var(--success-soft)] px-3 py-2 text-[12px] text-[color:var(--success)] sm:col-span-3">
                            Discount: {inr(discountAmountNum)} off → Effective rent: {inr(effectiveRent)}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {/* Partial */}
                  <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4 md:col-span-2">
                    <label className="flex cursor-pointer select-none items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isPartial}
                        onChange={(e) => {
                          setIsPartial(e.target.checked);
                          if (!e.target.checked) { setPartialNote(""); setDeferredTo(""); setAmountTouched(false); }
                        }}
                        disabled={submitting}
                        className="h-4 w-4 accent-[color:var(--warning)]"
                      />
                      <span className="text-sm font-medium text-[color:var(--fg-primary)]">Partial payment (collect balance later)</span>
                    </label>

                    {isPartial ? (
                      <div className="flex flex-col gap-3">
                        <div className="rounded-[var(--radius-sm)] border border-[color:color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[color:var(--warning-soft)] px-3 py-2 text-[12px] text-[color:var(--warning)]">
                          {balanceDue > 0
                            ? <>Paying {inr(Number(amount) || 0)} today — {inr(balanceDue)} balance deferred</>
                            : <>Amount equals full rent — no balance will be deferred</>}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FormField label="Collect balance by (optional)">
                            {({ id }) => <TextInput id={id} type="date" value={deferredTo} onChange={(e) => setDeferredTo(e.target.value)} disabled={submitting} leadingIcon={<CalendarDays size={15} />} className="[color-scheme:dark]" />}
                          </FormField>
                          <FormField label="Note (optional)">
                            {({ id }) => <TextInput id={id} value={partialNote} onChange={(e) => setPartialNote(e.target.value)} disabled={submitting} placeholder="e.g. Will pay rest on salary day" />}
                          </FormField>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            ) : null}

            {error ? <p role="alert" className="text-sm text-[color:var(--error)]">{error}</p> : null}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function TenantRentSearchButton({ disabled = false, onClick }: { disabled?: boolean; onClick?: () => void }) {
  return (
    <Button disabled={disabled} fullWidth onClick={onClick} className="min-h-12">
      <WalletCards size={16} /> Pay Rent
    </Button>
  );
}

function StepPill({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
        active
          ? "border border-[color:color-mix(in_srgb,var(--brand)_60%,transparent)] bg-[color:var(--cta)] text-white"
          : done
            ? "border border-[color:color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color:var(--success-soft)] text-[color:var(--success)]"
            : "border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-tertiary)]"
      }`}
    >
      {label}
    </span>
  );
}
