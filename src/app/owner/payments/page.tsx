"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Download, ImageUp, X } from "lucide-react";
import { useHostelContext } from "@/components/hostel-context-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { formatPaymentDate, getDueStatus } from "@/lib/payment-utils";

export default function OwnerPaymentsPage() {
  const { currentHostel, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants();
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

  const tenants = allTenants.filter((tenant) => tenant.assignment?.hostelId === currentHostel.id);
  const dueItems = tenants
    .map((tenant) => ({
      tenant,
      status: getDueStatus(tenant.nextDueDate),
    }))
    .sort((left, right) => left.status.priority - right.status.priority);

  return (
    <main className={`min-h-screen transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <div className="mx-auto w-full max-w-7xl space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-[0_12px_28px_rgba(148,163,184,0.12)] md:px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Owner Payments</p>
          <h1 className="mt-0.5 text-[1.05rem] font-semibold tracking-tight text-slate-800 sm:text-[1.3rem]">
            Tenant payment cycles
          </h1>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Showing payment and due status for {currentHostel.hostelName} only.
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.62fr_0.78fr]">
          <Card className="overflow-hidden border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-3 py-2.5">
              <h2 className="text-[14px] font-semibold text-slate-800">Payment History</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">
                All payment details are scoped to the selected hostel workspace.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-2 font-medium">Tenant ID</th>
                    <th className="px-2 py-2 font-medium">Tenant</th>
                    <th className="px-2 py-2 font-medium">Mode</th>
                    <th className="px-2 py-2 font-medium">Txn ID</th>
                    <th className="px-2 py-2 font-medium">Contact</th>
                    <th className="px-2 py-2 font-medium">Room</th>
                    <th className="px-2 py-2 font-medium">Rent</th>
                    <th className="px-2 py-2 font-medium">Paid</th>
                    <th className="px-2 py-2 font-medium">Paid On</th>
                    <th className="px-2 py-2 font-medium">Next Due</th>
                    <th className="px-2 py-2 font-medium">Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-2 py-5 text-center text-sm text-slate-500">
                        No tenant payment data exists yet for this hostel.
                      </td>
                    </tr>
                  ) : (
                    tenants.map((tenant) => {
                      const latestPayment = tenant.paymentHistory[0];

                      return (
                        <tr key={tenant.tenantId} className="border-t border-slate-200 align-top">
                          <td className="px-2 py-2 font-semibold text-slate-700">{tenant.tenantId}</td>
                          <td className="px-2 py-2">
                            <Link
                              href={`/owner/tenants/${tenant.tenantId}`}
                              className="font-medium text-slate-800 transition hover:text-orange-600"
                            >
                              {tenant.fullName}
                            </Link>
                            <p className="mt-0.5 text-[9px] text-slate-500">{tenant.idNumber}</p>
                          </td>
                          <td className="px-2 py-2 text-slate-600">
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold capitalize text-slate-700">
                              {latestPayment?.paymentMethod ?? "cash"}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-slate-600">{latestPayment?.txnId || "Not provided"}</td>
                          <td className="px-2 py-2">
                            <p>{tenant.phone}</p>
                            <p className="mt-0.5 text-[9px] text-slate-500">{tenant.email}</p>
                          </td>
                          <td className="px-2 py-2">
                            {tenant.assignment ? `R-${tenant.assignment.roomNumber} / F-${tenant.assignment.floorNumber}` : "-"}
                          </td>
                          <td className="px-2 py-2 font-medium">Rs. {tenant.monthlyRent.toLocaleString("en-IN")}</td>
                          <td className="px-2 py-2 font-medium">Rs. {tenant.rentPaid.toLocaleString("en-IN")}</td>
                          <td className="px-2 py-2">{formatPaymentDate(tenant.paidOnDate)}</td>
                          <td className="px-2 py-2 font-medium text-orange-600">{formatPaymentDate(tenant.nextDueDate)}</td>
                          <td className="px-2 py-2 text-slate-600">
                            {latestPayment?.proofImageUrl ? (
                              <div className="inline-flex max-w-[154px] items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1">
                                <a
                                  href={latestPayment.proofImageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex min-w-0 items-center gap-1.5"
                                >
                                  {isImageProof(latestPayment.proofMimeType, latestPayment.proofImageName) ? (
                                    <Image
                                      src={latestPayment.proofImageUrl}
                                      alt={`Payment proof for ${tenant.fullName}`}
                                      width={28}
                                      height={28}
                                      className="h-7 w-7 rounded-md object-cover"
                                    />
                                  ) : (
                                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-200 text-[8px] font-semibold text-slate-700">
                                      PDF
                                    </div>
                                  )}
                                  <span className="truncate text-[9px] font-medium text-slate-700">
                                    {latestPayment.proofImageName || "View proof"}
                                  </span>
                                </a>
                                <a
                                  href={latestPayment.proofImageUrl}
                                  download={latestPayment.proofImageName || `${tenant.tenantId}-payment-proof`}
                                  className="inline-flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-50"
                                  aria-label={`Download payment proof for ${tenant.fullName}`}
                                  title="Download proof"
                                >
                                  <Download className="h-3 w-3" />
                                </a>
                              </div>
                            ) : latestPayment?.proofImageName ? (
                              <span className="text-[9px] text-slate-500">{latestPayment.proofImageName}</span>
                            ) : latestPayment ? (
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
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                Add Proof
                              </button>
                            ) : (
                              "No proof"
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="border-slate-200 bg-white p-3">
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
                  <div key={tenant.tenantId} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
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

      {proofModal ? (
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

            setSavingProof(false);
            setProofModal(null);
            setProofImage(null);
            window.location.reload();
          }}
        />
      ) : null}
    </main>
  );
}

function getStatusClassName(tone: string) {
  if (tone === "red") return "inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-semibold text-rose-600";
  if (tone === "orange") return "inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-semibold text-orange-600";
  if (tone === "yellow") return "inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-600";
  return "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-600";
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 px-3 py-3 sm:py-8">
      <div className="flex min-h-full items-center justify-center">
        <Card className="flex max-h-[min(92vh,520px)] w-full max-w-md flex-col overflow-hidden p-3.5">
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

          <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto pr-1">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-700">Txn ID (Optional)</span>
              <input
                value={txnId}
                onChange={(event) => onTxnIdChange(event.target.value.toUpperCase())}
                placeholder="Enter transaction id"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[11px] outline-none"
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
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 pl-8 text-[11px] outline-none file:mr-2 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-2 file:py-1 file:text-[11px] file:text-white"
                />
              </div>
              <p className="mt-1 text-[9px] text-slate-500">Optional: image, screenshot, or PDF receipt.</p>
              {proofImage ? <p className="mt-0.5 text-[9px] text-slate-500">{proofImage.name}</p> : null}
            </label>
          </div>

          {error ? <p className="mt-2.5 text-xs text-rose-600">{error}</p> : null}

          <div className="mt-3 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSave} className={saving ? "opacity-70" : ""}>
              {saving ? "Saving..." : "Save Proof"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
