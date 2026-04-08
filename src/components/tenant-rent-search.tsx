"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { CalendarDays, ImageUp, Search, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import type { TenantRecord } from "@/types/tenant";

export function TenantRentSearch({ tenants }: { tenants: TenantRecord[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [query, setQuery] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [amount, setAmount] = useState("");
  const [paidOnDate, setPaidOnDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [txnId, setTxnId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [pendingProofPaymentId, setPendingProofPaymentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useLockBodyScroll(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return tenants.filter((tenant) => {
      const tenantIdMatch = tenant.tenantId.includes(normalizedQuery);
      const nameMatch = tenant.fullName.toLowerCase().includes(normalizedQuery);
      return tenantIdMatch || nameMatch;
    });
  }, [normalizedQuery, tenants]);

  const selectedTenant = matches.find((tenant) => tenant.tenantId === selectedTenantId) ?? null;

  const resetState = () => {
    setOpen(false);
    setStep(1);
    setQuery("");
    setSelectedTenantId("");
    setAmount("");
    setPaidOnDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod("cash");
    setTxnId("");
    setProofFile(null);
    setPendingProofPaymentId("");
    setError("");
    setMessage("");
    setSubmitting(false);
  };

  const handleRecordPayment = async () => {
    if (!selectedTenant) {
      setError("Select a tenant before recording payment.");
      return;
    }

    if (submitting) {
      return;
    }

    const numericAmount = Number(amount);

    if (!amount.trim()) {
      setError("Enter the paid amount before recording payment.");
      return;
    }

    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      setError("Enter a valid paid amount greater than or equal to 0.");
      return;
    }

    if (!paidOnDate) {
      setError("Choose the payment date.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    const payload = new FormData();
    payload.append("tenantId", selectedTenant.tenantId);
    payload.append("amount", String(numericAmount));
    payload.append("paidOnDate", paidOnDate);
    payload.append("paymentMethod", paymentMethod);
    payload.append("txnId", txnId);

    if (proofFile) {
      payload.append("proofImage", proofFile);
    }

    const response = await fetch("/api/tenants/pay-rent", {
      method: "POST",
      body: payload,
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message ?? "Unable to record payment.");
      setSubmitting(false);
      return;
    }

    const updatedTenant = data.tenant as TenantRecord;
    const latestPayment = updatedTenant.paymentHistory[0];

    setPendingProofPaymentId(latestPayment?.paymentId ?? "");
    setMessage(
      proofFile
        ? `Payment recorded for ${selectedTenant.fullName}.`
        : `Payment recorded for ${selectedTenant.fullName}. Add proof now or do it later from Payments.`,
    );
    setSubmitting(false);
    setStep(3);
    router.refresh();
  };

  const handleUploadProof = async () => {
    if (!selectedTenant || !pendingProofPaymentId) {
      setError("Payment record not found for proof upload.");
      return;
    }

    if (submitting) {
      return;
    }

    if (!txnId.trim() && !proofFile) {
      setError("Cannot save proof yet. Add a transaction id or upload a receipt, screenshot, or proof file.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = new FormData();
    payload.append("tenantId", selectedTenant.tenantId);
    payload.append("paymentId", pendingProofPaymentId);
    payload.append("txnId", txnId);

    if (proofFile) {
      payload.append("proofImage", proofFile);
    }

    const response = await fetch("/api/tenants/payment-proof", {
      method: "POST",
      body: payload,
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message ?? "Unable to save payment proof.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.refresh();
    resetState();
  };

  const handleNextFromTenant = () => {
    if (!selectedTenant) {
      setError("Select a tenant before continuing.");
      return;
    }

    setError("");
    setStep(2);
  };

  return (
    <>
      <Button
        disabled={submitting}
        className="min-h-12 w-full rounded-2xl border border-white/80 bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] px-4 text-[13px] font-semibold text-white shadow-[0_16px_30px_rgba(198,145,255,0.24)] hover:text-white hover:opacity-95"
        onClick={() => {
          resetState();
          setOpen(true);
        }}
      >
        <WalletCards className="mr-2 h-4 w-4" />
        Pay Rent
      </Button>

      {open && mounted
        ? createPortal(
        <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-[rgba(48,28,75,0.38)] px-4 py-4 sm:py-8">
          <div className="flex min-h-full items-start justify-center sm:items-center">
            <Card className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(244,236,255,0.95)_100%)] p-6 shadow-[0_28px_70px_rgba(170,148,255,0.22)] sm:max-h-[min(92dvh,760px)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-1.5 text-[13px] font-semibold text-slate-700 shadow-sm">
                    <span className="rounded-full bg-[linear-gradient(135deg,#8d71ff_0%,#ff8fb0_100%)] p-1 text-white">
                      <WalletCards className="h-3.5 w-3.5" />
                    </span>
                    Payments
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-800">Pay Rent</h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">Select tenant, record payment, then attach proof if needed.</p>
                </div>
                <Button variant="ghost" disabled={submitting} className="rounded-2xl px-3" onClick={resetState}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-6 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
                <div className="flex flex-wrap gap-2">
                  <StepPill label="1. Tenant" active={step === 1} done={step > 1} />
                  <StepPill label="2. Payment" active={step === 2} done={step > 2} />
                  <StepPill label="3. Proof" active={step === 3} done={false} />
                </div>

                {step === 1 ? (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Search by tenant ID or name</span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                        <input
                          value={query}
                          onChange={(event) => {
                            setQuery(event.target.value);
                            setSelectedTenantId("");
                            setMessage("");
                            setError("");
                          }}
                          disabled={submitting}
                          placeholder="Type last 5-digit ID or tenant name"
                          className="w-full rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-3 pl-11 text-sm text-slate-700 outline-none shadow-sm placeholder:text-slate-400"
                        />
                      </div>
                    </label>

                    {!normalizedQuery ? (
                      <div className="rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-4 text-sm text-[var(--muted-foreground)] shadow-sm">
                        Start typing a tenant ID or name to find the correct tenant.
                      </div>
                    ) : matches.length === 0 ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                        No tenant matched that search.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {matches.map((tenant) => {
                          const active = selectedTenantId === tenant.tenantId;

                          return (
                            <button
                              key={tenant.tenantId}
                              type="button"
                              disabled={submitting}
                              onClick={() => {
                                setSelectedTenantId(tenant.tenantId);
                                setAmount(String(tenant.monthlyRent));
                                setMessage("");
                                setError("");
                              }}
                              className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                                active
                                  ? "border-pink-200 bg-[linear-gradient(90deg,#ffe7f2_0%,#efe6ff_100%)]"
                                  : "border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] hover:border-violet-200"
                              }`}
                            >
                              <p className="font-semibold text-[var(--foreground)]">{tenant.fullName}</p>
                              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Tenant ID {tenant.tenantId} • {tenant.phone}</p>
                              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                                Floor {tenant.assignment?.floorNumber ?? "-"} • Room {tenant.assignment?.roomNumber ?? "-"}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : null}

                {selectedTenant && step >= 2 ? (
                  <div className="rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] p-4 text-sm text-[var(--muted-foreground)] shadow-sm">
                    <p className="font-semibold text-[var(--foreground)]">{selectedTenant.fullName}</p>
                    <p className="mt-1">Tenant ID: {selectedTenant.tenantId}</p>
                    <p className="mt-1">Floor {selectedTenant.assignment?.floorNumber ?? "-"} / Room {selectedTenant.assignment?.roomNumber ?? "-"}</p>
                    <p className="mt-1">Current next due: {selectedTenant.nextDueDate}</p>
                  </div>
                ) : null}

                {selectedTenant && step === 2 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Paid Amount</span>
                      <input
                        type="number"
                        min="0"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        disabled={submitting}
                        className="w-full rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-3 text-sm text-slate-700 outline-none shadow-sm"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Paid On Date</span>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                        <input
                          type="date"
                          value={paidOnDate}
                          onChange={(event) => setPaidOnDate(event.target.value)}
                          disabled={submitting}
                          className="w-full rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-3 pl-11 text-sm text-slate-700 outline-none shadow-sm"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Payment Mode</span>
                      <select
                        value={paymentMethod}
                        onChange={(event) => setPaymentMethod(event.target.value === "online" ? "online" : "cash")}
                        disabled={submitting}
                        className="w-full rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-3 text-sm text-slate-700 outline-none shadow-sm"
                      >
                        <option value="cash">Cash</option>
                        <option value="online">Online</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Txn ID (Optional)</span>
                      <input
                        value={txnId}
                        onChange={(event) => setTxnId(event.target.value.toUpperCase())}
                        disabled={submitting}
                        placeholder={paymentMethod === "online" ? "Enter online transaction id" : "Optional for cash payment"}
                        className="w-full rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-3 text-sm text-slate-700 outline-none shadow-sm placeholder:text-slate-400"
                      />
                    </label>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-4 text-sm text-[var(--muted-foreground)] shadow-sm">
                      Payment recorded. Add proof now or skip and do it later from the payments page.
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Txn ID (Optional)</span>
                      <input
                        value={txnId}
                        onChange={(event) => setTxnId(event.target.value.toUpperCase())}
                        disabled={submitting}
                        placeholder="Enter transaction id"
                        className="w-full rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-3 text-sm text-slate-700 outline-none shadow-sm placeholder:text-slate-400"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Proof File (Optional)</span>
                      <div className="relative">
                        <ImageUp className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                        <input
                          type="file"
                          onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                          accept="image/*,.pdf"
                          disabled={submitting}
                          className="w-full rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-4 py-3 pl-11 text-sm text-slate-700 outline-none shadow-sm file:mr-3 file:rounded-xl file:border-0 file:bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] file:px-3 file:py-2 file:text-white"
                        />
                      </div>
                      {proofFile ? <p className="mt-1 text-xs text-slate-500">{proofFile.name}</p> : null}
                    </label>
                  </div>
                ) : null}
              </div>

              {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
              {message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={step === 1 ? resetState : () => setStep((current) => (current === 3 ? 2 : 1))}
                  disabled={submitting}
                  className="rounded-2xl border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f6efff_100%)]"
                >
                  {step === 1 ? "Cancel" : "Back"}
                </Button>

                {step === 3 && pendingProofPaymentId ? (
                  <>
                    <Button variant="secondary" disabled={submitting} onClick={resetState} className="rounded-2xl border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f6efff_100%)]">
                      Add Later
                    </Button>
                    <Button disabled={submitting} onClick={handleUploadProof} className={`rounded-2xl bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] text-white hover:text-white ${submitting ? "opacity-70" : ""}`}>
                      {submitting ? "Saving..." : "Save Proof"}
                    </Button>
                  </>
                ) : (
                  <Button
                    disabled={submitting}
                    onClick={step === 1 ? handleNextFromTenant : handleRecordPayment}
                    className={`rounded-2xl bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] text-white hover:text-white ${submitting ? "opacity-70" : ""}`}
                  >
                    {step === 1 ? "Next: Payment" : submitting ? "Recording..." : "Record Payment"}
                  </Button>
                )}
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
          ? "border border-violet-200 bg-[var(--action-gradient)] text-white shadow-sm"
          : done
            ? "border border-emerald-200 bg-[linear-gradient(180deg,#ecfdf5_0%,#d1fae5_100%)] text-emerald-700"
            : "border border-violet-100 bg-[linear-gradient(180deg,#f8f5ff_0%,#f2ebff_100%)] text-violet-700"
      }`}
    >
      {label}
    </span>
  );
}
