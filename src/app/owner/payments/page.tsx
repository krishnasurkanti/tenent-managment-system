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
    return <LoadingState />;
  }

  if (!currentHostel) {
    return <Card className="rounded-[24px] p-4 text-center text-sm text-slate-600">Create a hostel first to view payments.</Card>;
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
    <main className={`space-y-3 transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <section className="space-y-3 lg:hidden">
        <Card className="rounded-[24px] border-slate-100 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Payments</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{currentHostel.hostelName}</h1>
          <div className="mt-3 grid grid-cols-[1.4fr_1fr] gap-2.5">
            <div className="rounded-[20px] bg-[var(--action-gradient)] px-3 py-3 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-100">Collected</p>
              <p className="mt-1 text-[1.5rem] font-semibold leading-none">Rs {collectedTotal.toLocaleString("en-IN")}</p>
            </div>
            <div className="grid gap-2">
              <MetricBox label="Due" value={String(dueSoonCount)} tone="warning" />
              <MetricBox label="Late" value={String(overdueCount)} tone="danger" />
            </div>
          </div>
          <div className="mt-3">
            <TenantRentSearch tenants={tenants} />
          </div>
        </Card>

        <div className="space-y-2.5">
          {tenants.length === 0 ? (
            <Card className="rounded-[24px] border-slate-100 p-4 text-center text-sm text-slate-500">No tenant payment data yet.</Card>
          ) : (
            tenants.map((tenant) => {
              const latestPayment = tenant.paymentHistory[0];
              const status = getDueStatus(tenant.nextDueDate);

              return (
                <div key={tenant.tenantId} className="rounded-[22px] border border-slate-100 bg-white px-3 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/owner/tenants/${tenant.tenantId}`} className="truncate text-sm font-semibold text-slate-900">
                        {tenant.fullName}
                      </Link>
                      <p className="mt-1 truncate text-[11px] text-slate-500">
                        Room {tenant.assignment?.roomNumber ?? "-"} • {latestPayment?.paymentMethod ?? "cash"}
                      </p>
                    </div>
                    <span className={statusClass(status.tone)}>{status.label}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <MiniValue label="Amount" value={`Rs ${tenant.rentPaid.toLocaleString("en-IN")}`} />
                    <MiniValue label="Paid" value={formatPaymentDate(tenant.paidOnDate)} />
                    <MiniValue label="Next" value={formatPaymentDate(tenant.nextDueDate)} />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="truncate text-[11px] text-slate-500">
                      {latestPayment?.txnId ? `Txn: ${latestPayment.txnId}` : "No txn id"}
                    </div>
                    <div>{renderProofCell({ tenant, latestPayment, setProofModal, setTxnIdInput, setProofImage, setProofError })}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="hidden lg:block">
        <div className="grid gap-3 xl:grid-cols-[1.62fr_0.78fr]">
          <Card className="overflow-hidden border-white/70 bg-white shadow-[0_18px_42px_rgba(170,148,255,0.1)]">
            <div className="border-b border-white/70 px-3 py-3">
              <h2 className="text-[14px] font-semibold text-slate-800">Payment History</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">All payment details are scoped to the selected hostel workspace.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[12px]">
                <thead className="bg-slate-50 text-slate-500">
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
                            <Link href={`/owner/tenants/${tenant.tenantId}`} className="font-semibold text-slate-800 transition hover:text-[var(--accent)]">
                              {tenant.fullName}
                            </Link>
                            <p className="mt-1 text-[10px] text-slate-500">{tenant.tenantId} • {tenant.phone}</p>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {tenant.assignment ? `R-${tenant.assignment.roomNumber} / F-${tenant.assignment.floorNumber}` : "-"}
                          </td>
                          <td className="px-3 py-3">
                            <span className={statusClass(status.tone)}>{status.label}</span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            <span className="inline-flex rounded-full bg-[var(--pill-gradient)] px-2.5 py-1 text-[10px] font-semibold capitalize text-[var(--accent)]">
                              {latestPayment?.paymentMethod ?? "cash"}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-800">Rs {tenant.rentPaid.toLocaleString("en-IN")}</td>
                          <td className="px-3 py-3 text-slate-600">{formatPaymentDate(tenant.paidOnDate)}</td>
                          <td className="px-3 py-3 font-medium text-[var(--accent)]">{formatPaymentDate(tenant.nextDueDate)}</td>
                          <td className="px-3 py-3 text-slate-600">{renderProofCell({ tenant, latestPayment, setProofModal, setTxnIdInput, setProofImage, setProofError })}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-3">
            <Card className="border-white/70 bg-white p-3 shadow-[0_18px_42px_rgba(170,148,255,0.1)]">
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                <MetricBox label="Collected" value={`Rs ${collectedTotal.toLocaleString("en-IN")}`} />
                <MetricBox label="Overdue" value={String(overdueCount)} tone="danger" />
                <MetricBox label="Due Soon" value={String(dueSoonCount)} tone="warning" />
              </div>
              <div className="mt-3">
                <TenantRentSearch tenants={tenants} />
              </div>
            </Card>

            <Card className="border-white/70 bg-white p-3 shadow-[0_18px_42px_rgba(170,148,255,0.1)]">
              <div className="mb-2">
                <h2 className="text-[14px] font-semibold text-slate-800">Upcoming Dues</h2>
                <p className="mt-0.5 text-[10px] text-slate-500">Only dues from the selected hostel are shown here.</p>
              </div>
              <div className="space-y-2">
                {dueItems.length === 0 ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">No due data available yet.</div>
                ) : (
                  dueItems.map(({ tenant, status }) => (
                    <div key={tenant.tenantId} className="rounded-[20px] border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-800">{tenant.fullName}</p>
                          <p className="mt-0.5 text-[9px] text-slate-500">
                            {tenant.tenantId} / Room {tenant.assignment?.roomNumber} / Floor {tenant.assignment?.floorNumber}
                          </p>
                          <p className="mt-0.5 text-[9px] text-slate-500">Next due {formatPaymentDate(tenant.nextDueDate)}</p>
                        </div>
                        <span className={statusClass(status.tone)}>{status.label}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </section>

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

function MetricBox({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-[var(--warning-soft)] text-amber-700"
      : tone === "danger"
        ? "bg-[var(--danger-soft)] text-rose-700"
        : "bg-[var(--pill-gradient)] text-[var(--accent)]";

  return (
    <div className={`rounded-[18px] px-3 py-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-1 text-[1.1rem] font-semibold leading-none">{value}</p>
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-[11px] font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function statusClass(tone: string) {
  if (tone === "red") return "inline-flex rounded-full bg-[var(--danger-soft)] px-2 py-1 text-[10px] font-semibold text-rose-700";
  if (tone === "orange" || tone === "yellow") return "inline-flex rounded-full bg-[var(--warning-soft)] px-2 py-1 text-[10px] font-semibold text-amber-700";
  return "inline-flex rounded-full bg-[var(--success-soft)] px-2 py-1 text-[10px] font-semibold text-emerald-700";
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="h-40 animate-pulse rounded-[24px] bg-slate-100" />
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-[22px] bg-slate-100" />
        ))}
      </div>
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
      <div className="inline-flex max-w-[170px] items-center gap-1.5 rounded-xl border border-slate-100 bg-white px-1.5 py-1 shadow-sm">
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
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--pill-gradient)] text-[8px] font-semibold text-[var(--accent)]">
              PDF
            </div>
          )}
          <span className="truncate text-[9px] font-medium text-slate-700">{latestPayment.proofImageName || "View proof"}</span>
        </a>
        <a
          href={latestPayment.proofImageUrl}
          download={latestPayment.proofImageName || `${tenant.tenantId}-payment-proof`}
          className="inline-flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md border border-slate-100 bg-white text-[var(--accent)] transition hover:bg-blue-50"
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
      className="rounded-xl border border-blue-200 bg-[var(--pill-gradient)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--accent)]"
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
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-[rgba(15,23,42,0.42)] px-3 py-3 sm:py-8">
      <div className="flex min-h-full items-start justify-center sm:items-center">
        <Card className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden border-slate-100 bg-white p-3.5 shadow-[0_28px_70px_rgba(15,23,42,0.22)] sm:max-h-[min(92dvh,520px)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-slate-800">Add Payment Proof</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">Save proof for {tenantName}. You can add transaction id, image proof, or both.</p>
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
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-[11px] outline-none shadow-sm"
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
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 pl-8 text-[11px] outline-none shadow-sm file:mr-2 file:rounded-md file:border-0 file:bg-[var(--action-gradient)] file:px-2 file:py-1 file:text-[11px] file:text-white"
                />
              </div>
              <p className="mt-1 text-[9px] text-slate-500">Optional: image, screenshot, or PDF receipt.</p>
              {proofImage ? <p className="mt-0.5 text-[9px] text-slate-500">{proofImage.name}</p> : null}
            </label>
          </div>

          {error ? <p className="mt-2.5 text-xs text-rose-600">{error}</p> : null}

          <div className="mt-3 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} className="rounded-xl border-white/80 bg-white">
              Cancel
            </Button>
            <Button onClick={onSave} className={`rounded-xl bg-[var(--action-gradient)] text-white ${saving ? "opacity-70" : ""}`}>
              {saving ? "Saving..." : "Save Proof"}
            </Button>
          </div>
        </Card>
      </div>
    </div>,
    document.body,
  );
}
