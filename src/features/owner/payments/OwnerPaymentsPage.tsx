"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { Download, ImageUp, IndianRupee, X } from "lucide-react";
import { useHostelContext } from "@/store/hostel-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { SkeletonBlock } from "@/components/ui/skeleton";
import {
  ownerHeroCardClass,
  ownerInputClass,
  ownerMetricToneClass,
  ownerPanelClass,
  ownerStatusClass,
  ownerSubtlePanelClass,
  ownerTableHeadClass,
} from "@/components/ui/owner-theme";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useToast } from "@/components/ui/toast";
import { TenantRentSearch } from "@/features/payments/components/TenantRentSearch";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { uploadTenantPaymentProof } from "@/services/tenants/tenants.service";
import { formatPaymentDate, getDueStatus } from "@/utils/payment";
import type { TenantRecord } from "@/types/tenant";

export default function OwnerPaymentsPage() {
  const { currentHostel, currentHostelId, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants(currentHostelId);
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
  const { toast } = useToast();

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
    return <Card className="rounded-[24px] p-4 text-center text-sm text-[color:var(--fg-secondary)]">Create a hostel first to view payments.</Card>;
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
    <div className={`space-y-3 transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      <section className="space-y-3 lg:hidden">
        <Card className={`${ownerHeroCardClass} rounded-[24px] p-4`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Payments</p>
          <h1 className="mt-1 text-xl font-semibold text-white">{currentHostel.hostelName}</h1>
          <div className="mt-3 grid grid-cols-[1.4fr_1fr] gap-2.5">
            <div className="rounded-[20px] bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] px-3 py-3 text-white shadow-[0_18px_36px_rgba(37,99,235,0.22)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-100/80">Collected</p>
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
            <Card className={`${ownerPanelClass} rounded-[24px] p-4 text-center text-sm text-[color:var(--fg-secondary)]`}>No tenant payment data yet.</Card>
          ) : (
            tenants.map((tenant) => {
              const latestPayment = tenant.paymentHistory[0];
              const status = getDueStatus(tenant.nextDueDate);

              return (
                <div key={tenant.tenantId} className={`rounded-[22px] px-3 py-3 ${ownerPanelClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/owner/tenants/${tenant.tenantId}`} className="truncate text-sm font-semibold text-white">
                        {tenant.fullName}
                      </Link>
                      <p className="mt-1 truncate text-[11px] text-[color:var(--fg-secondary)]">
                        Room {tenant.assignment?.roomNumber ?? "-"} / {latestPayment?.paymentMethod ?? "cash"}
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
                    <div className="truncate text-[11px] text-[color:var(--fg-secondary)]">
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
          <Card className={`overflow-hidden ${ownerPanelClass}`}>
            <div className="border-b border-[color:var(--border)] px-3 py-3">
              <h2 className="text-[14px] font-semibold text-white">Payment History</h2>
              <p className="mt-0.5 text-[10px] text-[color:var(--fg-secondary)]">All payment details are scoped to the selected hostel workspace.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[12px]">
                <thead className={ownerTableHeadClass}>
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
                      <td colSpan={8} className="px-3 py-6 text-center text-sm text-[color:var(--fg-secondary)]">
                        No tenant payment data exists yet for this hostel.
                      </td>
                    </tr>
                  ) : (
                    tenants.map((tenant) => {
                      const latestPayment = tenant.paymentHistory[0];
                      const status = getDueStatus(tenant.nextDueDate);

                      return (
                        <tr key={tenant.tenantId} className="border-t border-[color:var(--border)] align-top">
                          <td className="px-3 py-3">
                            <Link href={`/owner/tenants/${tenant.tenantId}`} className="font-semibold text-white transition hover:text-[var(--accent-electric)]">
                              {tenant.fullName}
                            </Link>
                            <p className="mt-1 text-[10px] text-[color:var(--fg-secondary)]">{tenant.tenantId} / {tenant.phone}</p>
                          </td>
                          <td className="px-3 py-3 text-[color:var(--fg-secondary)]">
                            {tenant.assignment ? `R-${tenant.assignment.roomNumber} / F-${tenant.assignment.floorNumber}` : "-"}
                          </td>
                          <td className="px-3 py-3">
                            <span className={statusClass(status.tone)}>{status.label}</span>
                          </td>
                          <td className="px-3 py-3 text-[color:var(--fg-secondary)]">
                            <span className="inline-flex rounded-full border border-[color:color-mix(in_srgb,var(--brand)_34%,transparent)] bg-[color:var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#9edcff]">
                              {latestPayment?.paymentMethod ?? "cash"}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-semibold text-white">Rs {tenant.rentPaid.toLocaleString("en-IN")}</td>
                          <td className="px-3 py-3 text-[color:var(--fg-secondary)]">{formatPaymentDate(tenant.paidOnDate)}</td>
                          <td className="px-3 py-3 font-medium text-[#ffd978]">{formatPaymentDate(tenant.nextDueDate)}</td>
                          <td className="px-3 py-3 text-[color:var(--fg-secondary)]">{renderProofCell({ tenant, latestPayment, setProofModal, setTxnIdInput, setProofImage, setProofError })}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-3">
            <Card className={`${ownerPanelClass} p-3`}>
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                <MetricBox label="Collected" value={`Rs ${collectedTotal.toLocaleString("en-IN")}`} />
                <MetricBox label="Overdue" value={String(overdueCount)} tone="danger" />
                <MetricBox label="Due Soon" value={String(dueSoonCount)} tone="warning" />
              </div>
              <div className="mt-3">
                <TenantRentSearch tenants={tenants} />
              </div>
            </Card>

            <Card className={`${ownerPanelClass} p-3`}>
              <div className="mb-2">
                <h2 className="text-[14px] font-semibold text-white">Upcoming Dues</h2>
                <p className="mt-0.5 text-[10px] text-[color:var(--fg-secondary)]">Only dues from the selected hostel are shown here.</p>
              </div>
              <div className="space-y-2">
                {dueItems.length === 0 ? (
                  <div className={`rounded-md px-3 py-3 text-sm text-[color:var(--fg-secondary)] ${ownerSubtlePanelClass}`}>No due data available yet.</div>
                ) : (
                  dueItems.map(({ tenant, status }) => (
                    <div key={tenant.tenantId} className={`rounded-[20px] px-3 py-2.5 ${ownerSubtlePanelClass}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold text-white">{tenant.fullName}</p>
                          <p className="mt-0.5 text-[9px] text-[color:var(--fg-secondary)]">
                            {tenant.tenantId} / Room {tenant.assignment?.roomNumber} / Floor {tenant.assignment?.floorNumber}
                          </p>
                          <p className="mt-0.5 text-[9px] text-[color:var(--fg-secondary)]">Next due {formatPaymentDate(tenant.nextDueDate)}</p>
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

            const { response, data } = await uploadTenantPaymentProof(payload);

            if (!response.ok) {
              const msg = data.message ?? "Unable to save payment proof.";
              setProofError(msg);
              toast(msg, "error");
              setSavingProof(false);
              return;
            }

            const updatedTenant = data.tenant as TenantRecord | undefined;

            if (!updatedTenant) {
              const msg = "Payment proof saved, but the updated tenant record was missing from the response.";
              setProofError(msg);
              toast(msg, "warning");
              setSavingProof(false);
              return;
            }

            setTenantOverrides((current) => ({
              ...current,
              [updatedTenant.tenantId]: updatedTenant,
            }));
            toast("Payment proof saved.", "success");
            setSavingProof(false);
            setProofModal(null);
            setProofImage(null);
            setTxnIdInput("");
            setProofError("");
          }}
        />
      ) : null}
    </div>
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
  const toneClass = ownerMetricToneClass(tone);

  return (
    <div className={`rounded-[18px] border px-3 py-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-1 text-[1.1rem] font-semibold leading-none">{value}</p>
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div className={`rounded-2xl px-2.5 py-2 ${ownerSubtlePanelClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">{label}</p>
      <p className="mt-1 text-[11px] font-semibold text-white">{value}</p>
    </div>
  );
}

function statusClass(tone: string) {
  return ownerStatusClass(tone);
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className={`rounded-[24px] p-4 ${ownerPanelClass}`}>
        <ProcessingPill label="Preparing payment workspace" />
        <SkeletonBlock className="mt-4 h-24 rounded-[20px]" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-32 rounded-[22px]" />
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
      <div className={`inline-flex max-w-[170px] items-center gap-1.5 rounded-xl px-1.5 py-1 ${ownerSubtlePanelClass}`}>
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
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[color:color-mix(in_srgb,var(--brand)_34%,transparent)] bg-[color:var(--brand-soft)] text-[8px] font-semibold text-[#9edcff]">
              PDF
            </div>
          )}
          <span className="truncate text-[9px] font-medium text-[color:var(--fg-primary)]">{latestPayment.proofImageName || "View proof"}</span>
        </a>
        <a
          href={latestPayment.proofImageUrl}
          download={latestPayment.proofImageName || `${tenant.tenantId}-payment-proof`}
          className="inline-flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[#9edcff] transition hover:bg-[color:var(--surface-strong)]"
          aria-label={`Download payment proof for ${tenant.fullName}`}
          title="Download proof"
        >
          <Download className="h-3 w-3" />
        </a>
      </div>
    );
  }

  if (latestPayment?.proofImageName) {
    return <span className="text-[10px] text-[color:var(--fg-secondary)]">{latestPayment.proofImageName}</span>;
  }

  if (!latestPayment) {
    return <span className="text-[10px] text-[color:var(--fg-secondary)]">No proof</span>;
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
      className="rounded-xl border border-[color:color-mix(in_srgb,var(--brand)_34%,transparent)] bg-[color:var(--brand-soft)] px-2.5 py-1.5 text-[10px] font-semibold text-[#9edcff]"
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
        <Card className={`flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden p-3.5 sm:max-h-[min(92dvh,520px)] ${ownerPanelClass}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-white">Add Payment Proof</h2>
              <p className="mt-0.5 text-[10px] text-[color:var(--fg-secondary)]">Save proof for {tenantName}. You can add transaction id, image proof, or both.</p>
            </div>
            <Button variant="ghost" className="px-2" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-1">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[color:var(--fg-primary)]">Txn ID (Optional)</span>
              <input
                value={txnId}
                onChange={(event) => onTxnIdChange(event.target.value.toUpperCase())}
                placeholder="Enter transaction id"
                className={`w-full rounded-xl px-3 py-2.5 text-[11px] outline-none ${ownerInputClass}`}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[color:var(--fg-primary)]">Receipt / Screenshot / Proof File</span>
              <div className="relative">
                <ImageUp className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => onProofImageChange(event.target.files?.[0] ?? null)}
                  className={`w-full rounded-xl px-3 py-2.5 pl-8 text-[11px] outline-none file:mr-2 file:rounded-md file:border-0 file:bg-[#2563eb] file:px-2 file:py-1 file:text-[11px] file:text-white ${ownerInputClass}`}
                />
              </div>
              <p className="mt-1 text-[9px] text-[color:var(--fg-secondary)]">Optional: image, screenshot, or PDF receipt.</p>
              {proofImage ? <p className="mt-0.5 text-[9px] text-[color:var(--fg-secondary)]">{proofImage.name}</p> : null}
            </label>
          </div>

          {error ? <p role="alert" className="mt-2.5 text-xs text-[color:var(--error)]">{error}</p> : null}
          {saving ? <ProcessingPill label="Saving proof and syncing payment record" className="mt-3" /> : null}

          <div className="mt-3 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} className="rounded-xl border-[color:var(--border)] bg-[color:var(--surface-soft)] text-white hover:bg-[color:var(--surface-strong)]">
              Cancel
            </Button>
            <Button loading={saving} onClick={onSave} className="rounded-xl">
              {saving ? "Saving..." : "Save Proof"}
            </Button>
          </div>
        </Card>
      </div>
    </div>,
    document.body,
  );
}
