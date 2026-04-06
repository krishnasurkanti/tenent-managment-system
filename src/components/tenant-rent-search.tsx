"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ImageUp, Search, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import type { TenantRecord } from "@/types/tenant";

export function TenantRentSearch({ tenants }: { tenants: TenantRecord[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  useLockBodyScroll(open);

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

  const closeModal = () => {
    setOpen(false);
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

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      setError("Enter a valid paid amount.");
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
    router.refresh();
  };

  const handleSaveProofLater = () => {
    closeModal();
  };

  const handleUploadProof = async () => {
    if (!selectedTenant || !pendingProofPaymentId) {
      setError("Payment record not found for proof upload.");
      return;
    }

    if (!txnId.trim() && !proofFile) {
      setError("Add a transaction id or upload a receipt, screenshot, or proof file.");
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

    setMessage(`Payment proof saved for ${selectedTenant.fullName}.`);
    setSubmitting(false);
    router.refresh();
    closeModal();
  };

  return (
    <>
      <Button
        className="min-h-12 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-[13px] font-semibold text-emerald-700 shadow-none hover:bg-emerald-100"
        onClick={() => {
          setQuery("");
          setSelectedTenantId("");
          setAmount("");
          setPaidOnDate(new Date().toISOString().slice(0, 10));
          setPaymentMethod("cash");
          setTxnId("");
          setProofFile(null);
          setError("");
          setMessage("");
          setOpen(true);
        }}
      >
        <WalletCards className="mr-2 h-4 w-4" />
        Pay Rent
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 px-4 py-4 sm:py-8">
          <div className="flex min-h-full items-center justify-center">
            <Card className="flex max-h-[min(92vh,760px)] w-full max-w-2xl flex-col overflow-hidden p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Pay Rent</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Search by tenant ID or name, confirm room and floor details, then record the payment.
                </p>
              </div>
              <Button variant="ghost" className="px-3" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Search by tenant ID or name</span>
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
                    placeholder="Type last 5-digit ID or tenant name"
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 pl-11 text-sm outline-none"
                  />
                </div>
              </label>

              {!normalizedQuery ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-4 text-sm text-[var(--muted-foreground)]">
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
                        onClick={() => {
                          setSelectedTenantId(tenant.tenantId);
                          setAmount(String(tenant.monthlyRent));
                          setMessage("");
                          setError("");
                        }}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                          active
                            ? "border-[var(--accent)] bg-[var(--muted)]"
                            : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--border-strong)]"
                        }`}
                      >
                        <p className="font-semibold text-[var(--foreground)]">{tenant.fullName}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          Tenant ID {tenant.tenantId} • {tenant.phone}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          Floor {tenant.assignment?.floorNumber ?? "-"} • Room {tenant.assignment?.roomNumber ?? "-"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedTenant ? (
                <>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 text-sm text-[var(--muted-foreground)]">
                    <p className="font-semibold text-[var(--foreground)]">{selectedTenant.fullName}</p>
                    <p className="mt-1">Tenant ID: {selectedTenant.tenantId}</p>
                    <p className="mt-1">
                      Floor {selectedTenant.assignment?.floorNumber ?? "-"} / Room {selectedTenant.assignment?.roomNumber ?? "-"}
                    </p>
                    <p className="mt-1">Current next due: {selectedTenant.nextDueDate}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">Paid Amount</span>
                      <input
                        type="number"
                        min="0"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">Paid On Date</span>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                        <input
                          type="date"
                          value={paidOnDate}
                          onChange={(event) => setPaidOnDate(event.target.value)}
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 pl-11 text-sm outline-none"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">Payment Mode</span>
                      <select
                        value={paymentMethod}
                        onChange={(event) => setPaymentMethod(event.target.value === "online" ? "online" : "cash")}
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
                      >
                        <option value="cash">Cash</option>
                        <option value="online">Online</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">Txn ID (Optional)</span>
                      <input
                        value={txnId}
                        onChange={(event) => setTxnId(event.target.value.toUpperCase())}
                        placeholder={paymentMethod === "online" ? "Enter online transaction id" : "Optional for cash payment"}
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
                      />
                    </label>

                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-sm font-medium">Payment Proof (Optional)</span>
                      <div className="relative">
                        <ImageUp className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                        <input
                          type="file"
                          onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                          accept="image/*,.pdf"
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 pl-11 text-sm outline-none file:mr-3 file:rounded-xl file:border-0 file:bg-[var(--accent)] file:px-3 file:py-2 file:text-white"
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Optional: image, screenshot, or PDF receipt.</p>
                      {proofFile ? <p className="mt-1 text-xs text-slate-500">{proofFile.name}</p> : null}
                    </label>
                  </div>
                </>
              ) : null}
            </div>

            {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
            {message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              {pendingProofPaymentId ? (
                <>
                  <Button variant="secondary" onClick={handleSaveProofLater}>
                    Add Later
                  </Button>
                  <Button onClick={handleUploadProof} className={submitting ? "opacity-70" : ""}>
                    {submitting ? "Saving..." : "Save Proof"}
                  </Button>
                </>
              ) : (
                <Button onClick={handleRecordPayment} className={submitting ? "opacity-70" : ""}>
                  {submitting ? "Recording..." : "Record Payment"}
                </Button>
              )}
            </div>
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}
