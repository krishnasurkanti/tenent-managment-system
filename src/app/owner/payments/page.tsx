"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { Download, ImageUp, IndianRupee, X } from "lucide-react";
import { useHostelContext } from "@/components/hostel-context-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { TenantRentSearch } from "@/components/tenant-rent-search";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { formatPaymentDate, getDueStatus } from "@/lib/payment-utils";
import type { TenantRecord } from "@/types/tenant";

export default function OwnerPaymentsPage() {
  const { currentHostel, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants();
  const [tenantOverrides, setTenantOverrides] = useState<Record<string, TenantRecord>>({});
  const [proofModal, setProofModal] = useState<{
    tenantId: string;
    tenantName: string;
    paymentId: string;
    txnId: string;
  } | null>(null);
  const [txnIdInput, setTxnIdInput] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [savingProof, setSavingProof] = useState(false);
  const [proofError, setProofError] = useState("");
  const [mounted, setMounted] = useState(false);
  const tenants = useMemo(() => {
    if (!currentHostel) {
      return [];
    }

    return allTenants
      .filter((tenant) => tenant.assignment?.hostelId === currentHostel.id)
      .map((tenant) => tenantOverrides[tenant.tenantId] ?? tenant);
  }, [allTenants, currentHostel, tenantOverrides]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (hostelLoading || tenantLoading) {
    return <Card className="border-slate-200 bg-white p-4 text-center text-sm text-slate-600">Loading payments...</Card>;
  }

  if (!currentHostel) {
    return (
      <Card className="border-slate-200 bg-white p-4 text-center text-sm text-slate-600">
        Create a hostel first to view payments.
      </Card>
    );
  }

  const dueItems = tenants
    .map((tenant) => ({
      tenant,
      status: getDueStatus(tenant.nextDueDate),
    }))
    .sort((left, right) => left.status.priority - right.status.priority);
  const overdueCount = dueItems.filter(({ status }) => status.tone === "red").length;
  const dueSoonCount = dueItems.filter(({ status }) => status.tone === "orange" || status.tone === "yellow").length;
  const collectedTotal = tenants.reduce((sum, tenant) => sum + tenant.rentPaid, 0);

  return (
    <main className={`min-h-screen transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <div className="overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(246,243,255,0.98)_100%)] px-4 py-4 shadow-[0_24px_55px_rgba(164,140,255,0.12)] backdrop-blur md:px-5">
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(90deg,rgba(99,102,241,0.08)_0%,rgba(139,92,246,0.08)_55%,rgba(249,115,22,0.05)_100%)]" />
            <div className="relative flex flex-col gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-1.5 text-[13px] font-semibold text-slate-700 shadow-sm">
                  <span className="rounded-full bg-[var(--action-gradient)] p-1 text-white">
                    <IndianRupee className="h-3.5 w-3.5" />
                  </span>
                  Payments
                </div>
                <h1 className="mt-3 text-[1.15rem] font-semibold tracking-tight text-slate-800 sm:text-[1.4rem]">
                  Tenant payment cycles
                </h1>
                <p className="mt-1 text-[11px] text-slate-500">
                  Showing payment and due status for {currentHostel.hostelName} only.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                <SummaryBadge label="Collected" value={`Rs ${collectedTotal.toLocaleString("en-IN")}`} tone="violet" />
                <SummaryBadge label="Overdue" value={String(overdueCount)} tone="rose" />
                <SummaryBadge label="Due Soon" value={String(dueSoonCount)} tone="orange" />
                <SummaryBadge label="Tenants" value={String(tenants.length)} tone="sky" />
              </div>

              <div className="max-w-md">
                <TenantRentSearch tenants={tenants} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.62fr_0.78fr]">
          <Card className="overflow-hidden border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(247,241,255,0.94)_100%)] shadow-[0_18px_42px_rgba(170,148,255,0.1)]">
            <div className="border-b border-white/70 px-3 py-3">
              <h2 className="text-[14px] font-semibold text-slate-800">Payment History</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">
                All payment details are scoped to the selected hostel workspace.
              </p>
            </div>
            <div className="hidden xl:block overflow-x-auto">
              <table className="min-w-full text-left text-[12px]">
                <thead className="bg-[linear-gradient(180deg,#eef2ff_0%,#fdf2f8_100%)] text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-medium">Tenant</th>
                    <th className="px-3 py-3 font-medium">Room</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Mode</th>
                    <th className="px-3 py-3 font-medium">Amount</th>
                    <th className="px-3 py-3 font-medium">Paid On</th>
                    <th className="px-3 py-3 font-medium">Next Due</th>
                    <th className="px-3 py-3 font-medium">Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">
                        No tenant payment data exists yet for this hostel.
                      </td>
                    </tr>
                  ) : (
                    tenants.map((tenant) => {
                      const latestPayment = tenant.paymentHistory[0];
                      const status = getDueStatus(tenant.nextDueDate);

                      return (
                        <tr key={tenant.tenantId} className="border-t border-white/80 align-top">
                          <td className="px-3 py-3">
                            <Link href={`/owner/tenants/${tenant.tenantId}`} className="font-semibold text-slate-800 transition hover:text-indigo-600">
                              {tenant.fullName}
                            </Link>
                            <p className="mt-1 text-[10px] text-slate-500">{tenant.tenantId} • {tenant.phone}</p>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {tenant.assignment ? `R-${tenant.assignment.roomNumber} / F-${tenant.assignment.floorNumber}` : "-"}
                          </td>
                          <td className="px-3 py-3">
                            <span className={getStatusClassName(status.tone)}>{status.label}</span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            <span className="inline-flex rounded-full bg-[var(--pill-gradient)] px-2.5 py-1 text-[10px] font-semibold capitalize text-indigo-700">
                              {latestPayment?.paymentMethod ?? "cash"}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-800">Rs {tenant.rentPaid.toLocaleString("en-IN")}</td>
                          <td className="px-3 py-3 text-slate-600">{formatPaymentDate(tenant.paidOnDate)}</td>
                          <td className="px-3 py-3 font-medium text-indigo-700">{formatPaymentDate(tenant.nextDueDate)}</td>
                          <td className="px-3 py-3 text-slate-600">{renderProofCell({ tenant, latestPayment, setProofModal, setTxnIdInput, setProofImage, setProofError })}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-2.5 p-3 xl:hidden">
              {tenants.length === 0 ? (
                <div className="rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafe_100%)] px-4 py-4 text-sm text-slate-500">
                  No tenant payment data exists yet for this hostel.
                </div>
              ) : (
                tenants.map((tenant) => {
                  const latestPayment = tenant.paymentHistory[0];
                  const status = getDueStatus(tenant.nextDueDate);

                  return (
                    <div key={tenant.tenantId} className="rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafe_100%)] px-3 py-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/owner/tenants/${tenant.tenantId}`} className="text-[13px] font-semibold text-slate-800 hover:text-indigo-600">
                            {tenant.fullName}
                          </Link>
                          <p className="mt-1 text-[10px] text-slate-500">
                            {tenant.tenantId} • Room {tenant.assignment?.roomNumber ?? "-"} • Floor {tenant.assignment?.floorNumber ?? "-"}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            Paid {formatPaymentDate(tenant.paidOnDate)} • Due {formatPaymentDate(tenant.nextDueDate)}
                          </p>
                        </div>
                        <span className={getStatusClassName(status.tone)}>{status.label}</span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <MiniPaymentStat label="Rent" value={`Rs ${tenant.monthlyRent.toLocaleString("en-IN")}`} />
                        <MiniPaymentStat label="Paid" value={`Rs ${tenant.rentPaid.toLocaleString("en-IN")}`} />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="inline-flex rounded-full bg-[var(--pill-gradient)] px-2.5 py-1 text-[10px] font-semibold capitalize text-indigo-700">
                          {latestPayment?.paymentMethod ?? "cash"}
                        </span>
                        <div className="text-right text-[10px] text-slate-500">
                          {latestPayment?.txnId ? `Txn: ${latestPayment.txnId}` : "No txn id"}
                        </div>
                      </div>

                      <div className="mt-3">
                        {renderProofCell({ tenant, latestPayment, setProofModal, setTxnIdInput, setProofImage, setProofError })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(247,241,255,0.94)_100%)] p-3 shadow-[0_18px_42px_rgba(170,148,255,0.1)]">
            <div className="mb-2">
              <h2 className="text-[14px] font-semibold text-slate-800">Upcoming Dues</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">Only dues from the selected hostel are shown here.</p>
            </div>

            <div className="space-y-2">
              {dueItems.length === 0 ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  No due data available yet.
                </div>
              ) : (
                dueItems.map(({ tenant, status }) => (
                  <div key={tenant.tenantId} className="rounded-[20px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-3 py-2.5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-800">{tenant.fullName}</p>
                        <p className="mt-0.5 text-[9px] text-slate-500">
                          {tenant.tenantId} / Room {tenant.assignment?.roomNumber} / Floor {tenant.assignment?.floorNumber}
                        </p>
                        <p className="mt-0.5 text-[9px] text-slate-500">
                          Next due {formatPaymentDate(tenant.nextDueDate)}
                        </p>
                      </div>
                      <span className={getStatusClassName(status.tone)}>{status.label}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Monthly Rent</span>
                      <span className="font-semibold text-slate-700">Rs. {tenant.monthlyRent.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {proofModal && mounted ? (
        <AddProofModal
          tenantName={proofModal.tenantName}
          txnId={txnIdInput}
          onTxnIdChange={setTxnIdInput}
          proofImage={proofImage}
          onProofImageChange={setProofImage}
          error={proofError}
          saving={savingProof}
          onClose={() => {
            setProofModal(null);
            setProofImage(null);
            setProofError("");
          }}
          onSave={async () => {
            if (!txnIdInput.trim() && !proofImage) {
              setProofError("Add a transaction id or upload a receipt, screenshot, or proof file.");
              return;
            }

            setSavingProof(true);
            setProofError("");

            const payload = new FormData();
            payload.append("tenantId", proofModal.tenantId);
            payload.append("paymentId", proofModal.paymentId);
            payload.append("txnId", txnIdInput);

            if (proofImage) {
              payload.append("proofImage", proofImage);
            }

            const response = await fetch("/api/tenants/payment-proof", {
              method: "POST",
              body: payload,
            });

            const data = await response.json();

            if (!response.ok) {
              setProofError(data.message ?? "Unable to save payment proof.");
              setSavingProof(false);
              return;
            }

            setTenantOverrides((current) => ({
              ...current,
              [data.tenant.tenantId]: data.tenant as TenantRecord,
            }));
            setSavingProof(false);
            setProofModal(null);
            setProofImage(null);
            setTxnIdInput("");
            setProofError("");
          }}
        />
      ) : null}
    </main>
  );
}

function getStatusClassName(tone: string) {
  if (tone === "red") return "inline-flex rounded-full bg-[linear-gradient(90deg,#ff8ca6_0%,#ff6e8d_100%)] px-2 py-0.5 text-[9px] font-semibold text-white";
  if (tone === "orange") return "inline-flex rounded-full bg-[linear-gradient(90deg,#ffb26b_0%,#ff9a7b_100%)] px-2 py-0.5 text-[9px] font-semibold text-white";
  if (tone === "yellow") return "inline-flex rounded-full bg-[linear-gradient(90deg,#ffe08a_0%,#ffd7a3_100%)] px-2 py-0.5 text-[9px] font-semibold text-amber-900";
  return "inline-flex rounded-full bg-[linear-gradient(90deg,#80ddb7_0%,#65d0cf_100%)] px-2 py-0.5 text-[9px] font-semibold text-white";
}

function SummaryBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "violet" | "rose" | "orange" | "sky";
}) {
  const toneClass =
    tone === "violet"
      ? "bg-[linear-gradient(180deg,#eef2ff_0%,#e0e7ff_100%)] text-indigo-700"
      : tone === "rose"
        ? "bg-[linear-gradient(180deg,#fff1f2_0%,#ffe4e6_100%)] text-rose-700"
        : tone === "orange"
          ? "bg-[linear-gradient(180deg,#fff7ed_0%,#ffedd5_100%)] text-orange-700"
          : "bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_100%)] text-sky-700";

  return (
    <div className={`rounded-[22px] border border-white/80 px-3 py-3 shadow-sm ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="mt-1 text-[1.1rem] font-semibold leading-none">{value}</p>
    </div>
  );
}

function MiniPaymentStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafe_100%)] px-3 py-2 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-[12px] font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function renderProofCell({
  tenant,
  latestPayment,
  setProofModal,
  setTxnIdInput,
  setProofImage,
  setProofError,
}: {
  tenant: TenantRecord;
  latestPayment: TenantRecord["paymentHistory"][number] | undefined;
  setProofModal: React.Dispatch<React.SetStateAction<{ tenantId: string; tenantName: string; paymentId: string; txnId: string } | null>>;
  setTxnIdInput: React.Dispatch<React.SetStateAction<string>>;
  setProofImage: React.Dispatch<React.SetStateAction<File | null>>;
  setProofError: React.Dispatch<React.SetStateAction<string>>;
}) {
  if (latestPayment?.proofImageUrl) {
    return (
      <div className="inline-flex max-w-[170px] items-center gap-1.5 rounded-xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafe_100%)] px-1.5 py-1 shadow-sm">
        <a href={latestPayment.proofImageUrl} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5">
          {isImageProof(latestPayment.proofMimeType, latestPayment.proofImageName) ? (
            <Image
              src={latestPayment.proofImageUrl}
              alt={`Payment proof for ${tenant.fullName}`}
              width={28}
              height={28}
              className="h-7 w-7 rounded-md object-cover"
            />
          ) : (
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--pill-gradient)] text-[8px] font-semibold text-indigo-700">
              PDF
            </div>
          )}
          <span className="truncate text-[9px] font-medium text-slate-700">{latestPayment.proofImageName || "View proof"}</span>
        </a>
        <a
          href={latestPayment.proofImageUrl}
          download={latestPayment.proofImageName || `${tenant.tenantId}-payment-proof`}
          className="inline-flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md border border-white/80 bg-white text-indigo-700 transition hover:bg-indigo-50 hover:text-indigo-900"
          aria-label={`Download payment proof for ${tenant.fullName}`}
          title="Download proof"
        >
          <Download className="h-3 w-3" />
        </a>
      </div>
    );
  }

  if (latestPayment?.proofImageName) {
    return <span className="text-[10px] text-slate-500">{latestPayment.proofImageName}</span>;
  }

  if (!latestPayment) {
    return <span className="text-[10px] text-slate-500">No proof</span>;
  }

  return (
    <button
      type="button"
      onClick={() => {
        setProofModal({
          tenantId: tenant.tenantId,
          tenantName: tenant.fullName,
          paymentId: latestPayment.paymentId,
          txnId: latestPayment.txnId ?? "",
        });
        setTxnIdInput(latestPayment.txnId ?? "");
        setProofImage(null);
        setProofError("");
      }}
      className="rounded-xl border border-white/80 bg-[var(--action-gradient)] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-sm transition hover:text-white hover:opacity-95"
    >
      Add Proof
    </button>
  );
}

function isImageProof(mimeType?: string, fileName?: string) {
  if (mimeType?.startsWith("image/")) {
    return true;
  }

  return Boolean(fileName && /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(fileName));
}

function AddProofModal({
  tenantName,
  txnId,
  onTxnIdChange,
  proofImage,
  onProofImageChange,
  error,
  saving,
  onClose,
  onSave,
}: {
  tenantName: string;
  txnId: string;
  onTxnIdChange: (value: string) => void;
  proofImage: File | null;
  onProofImageChange: (value: File | null) => void;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  useLockBodyScroll(true);

  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-[rgba(48,28,75,0.38)] px-3 py-3 sm:py-8">
      <div className="flex min-h-full items-start justify-center sm:items-center">
        <Card className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(244,236,255,0.95)_100%)] p-3.5 shadow-[0_28px_70px_rgba(170,148,255,0.22)] sm:max-h-[min(92dvh,520px)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-slate-800">Add Payment Proof</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Save proof for {tenantName}. You can add transaction id, image proof, or both.
              </p>
            </div>
            <Button variant="ghost" className="px-2" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-1">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-700">Txn ID (Optional)</span>
              <input
                value={txnId}
                onChange={(event) => onTxnIdChange(event.target.value.toUpperCase())}
                placeholder="Enter transaction id"
                className="w-full rounded-xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-3 py-2.5 text-[11px] outline-none shadow-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-700">Receipt / Screenshot / Proof File</span>
              <div className="relative">
                <ImageUp className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => onProofImageChange(event.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] px-3 py-2.5 pl-8 text-[11px] outline-none shadow-sm file:mr-2 file:rounded-md file:border-0 file:bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] file:px-2 file:py-1 file:text-[11px] file:text-white"
                />
              </div>
              <p className="mt-1 text-[9px] text-slate-500">Optional: image, screenshot, or PDF receipt.</p>
              {proofImage ? <p className="mt-0.5 text-[9px] text-slate-500">{proofImage.name}</p> : null}
            </label>
          </div>

          {error ? <p className="mt-2.5 text-xs text-rose-600">{error}</p> : null}

          <div className="mt-3 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} className="rounded-xl border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f6efff_100%)]">
              Cancel
            </Button>
            <Button onClick={onSave} className={`rounded-xl bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] text-white ${saving ? "opacity-70" : ""}`}>
              {saving ? "Saving..." : "Save Proof"}
            </Button>
          </div>
        </Card>
      </div>
    </div>,
    document.body,
  );
}
