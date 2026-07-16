"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, ImageUp } from "lucide-react";
import { useHostelContext } from "@/store/hostel-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/ui/data/status-badge";
import { DataTable, type Column } from "@/components/ui/data/data-table";
import { Modal } from "@/components/ui/overlay/modal";
import { FormField } from "@/components/ui/form/field";
import { TextInput } from "@/components/ui/form/text-input";
import { ProcessingPill } from "@/components/ui/processing-pill";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { TenantRentSearch } from "@/features/payments/components/TenantRentSearch";
import { useOwnerTenants } from "@/hooks/use-owner-tenants";
import { uploadTenantPaymentProof } from "@/services/tenants/tenants.service";
import { formatPaymentDate, getDueStatus, fmtTenantId } from "@/utils/payment";
import type { TenantRecord } from "@/types/tenant";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function toStatusTone(tone: string): StatusTone {
  if (tone === "red") return "overdue";
  if (tone === "orange") return "due";
  if (tone === "yellow") return "due-soon";
  return "paid";
}

type ProofTarget = { tenantId: string; tenantName: string; paymentId: string; txnId: string };

export default function OwnerPaymentsPage() {
  const { currentHostel, currentHostelId, loading: hostelLoading, isSwitching } = useHostelContext();
  const { tenants: allTenants, loading: tenantLoading } = useOwnerTenants(currentHostelId);
  const [tenantOverrides, setTenantOverrides] = useState<Record<string, TenantRecord>>({});
  const [proofModal, setProofModal] = useState<ProofTarget | null>(null);
  const [txnIdInput, setTxnIdInput] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [savingProof, setSavingProof] = useState(false);
  const [proofError, setProofError] = useState("");
  const { toast } = useToast();

  const tenants = useMemo(() => {
    if (!currentHostel) return [];
    return allTenants
      .filter((tenant) => tenant.assignment?.hostelId === currentHostel.id)
      .map((tenant) => tenantOverrides[tenant.tenantId] ?? tenant);
  }, [allTenants, currentHostel, tenantOverrides]);

  const openProof = (tenant: TenantRecord, latestPayment: TenantRecord["paymentHistory"][number]) => {
    setProofModal({ tenantId: tenant.tenantId, tenantName: tenant.fullName, paymentId: latestPayment.paymentId, txnId: latestPayment.txnId ?? "" });
    setTxnIdInput(latestPayment.txnId ?? "");
    setProofImage(null);
    setProofError("");
  };

  const columns = useMemo<Column<TenantRecord>[]>(() => [
    {
      key: "tenant",
      header: "Tenant",
      render: (t) => (
        <div>
          <Link href={`/owner/tenants/${t.tenantId}`} className="font-semibold text-[color:var(--fg-primary)] hover:text-[color:var(--accent-electric)]">
            {t.fullName}
          </Link>
          <p className="mt-0.5 text-[10px] text-[color:var(--fg-secondary)]">{fmtTenantId(t.tenantId)} · {t.phone}</p>
        </div>
      ),
    },
    { key: "room", header: "Room", render: (t) => (t.assignment?.roomNumber ? `Room ${t.assignment.roomNumber}` : "—") },
    { key: "status", header: "Status", render: (t) => { const s = getDueStatus(t.nextDueDate); return <StatusBadge status={toStatusTone(s.tone)}>{s.label}</StatusBadge>; } },
    {
      key: "mode",
      header: "Mode",
      render: (t) => (
        <span className="inline-flex rounded-full border border-[color:color-mix(in_srgb,var(--brand)_34%,transparent)] bg-[color:var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold capitalize text-[color:var(--accent-electric)]">
          {t.paymentHistory[0]?.paymentMethod ?? "cash"}
        </span>
      ),
    },
    { key: "amount", header: "Amount", render: (t) => <span className="font-semibold text-[color:var(--fg-primary)]">{inr(t.paymentHistory[0]?.amount ?? t.rentPaid)}</span> },
    { key: "paid", header: "Paid On", render: (t) => formatPaymentDate(t.paidOnDate) },
    { key: "next", header: "Next Due", render: (t) => <span className="font-medium text-[color:var(--warning)]">{formatPaymentDate(t.nextDueDate)}</span> },
    { key: "proof", header: "Proof", render: (t) => <ProofCell tenant={t} latestPayment={t.paymentHistory[0]} onAdd={openProof} /> },
  ], []);

  if (hostelLoading || tenantLoading) return <LoadingState />;

  if (!currentHostel) {
    return <Card className="p-6"><EmptyState title="No hostel yet" description="Create a hostel first to view payments." /></Card>;
  }

  const dueItems = tenants
    .map((tenant) => ({ tenant, status: getDueStatus(tenant.nextDueDate) }))
    .sort((left, right) => left.status.priority - right.status.priority);
  const overdueCount = dueItems.filter(({ status }) => status.tone === "red").length;
  const dueSoonCount = dueItems.filter(({ status }) => status.tone === "orange" || status.tone === "yellow").length;
  const collectedTotal = dueItems
    .filter(({ status }) => status.tone === "green")
    .reduce((sum, { tenant }) => sum + tenant.rentPaid, 0);
  const expectedTotal = tenants.reduce((sum, tenant) => sum + tenant.monthlyRent, 0);
  const collectionRate = expectedTotal > 0 ? Math.round((collectedTotal / expectedTotal) * 100) : 0;
  const proofCoverage = tenants.filter((tenant) => {
    const payment = tenant.paymentHistory[0];
    return Boolean(payment?.proofImageUrl || payment?.txnId);
  }).length;

  return (
    <div className={`flex flex-col gap-4 transition-opacity ${isSwitching ? "opacity-70" : "opacity-100"}`}>
      {/* ── Header ── */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Payments</p>
          <h1 className="font-display mt-0.5 text-[clamp(1.35rem,4.5vw,1.75rem)] font-bold text-[color:var(--fg-primary)]">Rent payments</h1>
          <p className="truncate text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">{currentHostel.hostelName} · {collectionRate}% collected</p>
        </div>
        <Link href="/owner/payments?action=pay-rent">
          <Button>Collect Rent</Button>
        </Link>
      </header>

      {/* ── Summary ── */}
      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard label="Collected" value={inr(collectedTotal)} helper="This cycle" tone="success" />
        <StatCard label="Expected" value={inr(expectedTotal)} helper="Tenant rent total" />
        <StatCard label="Needs attention" value={overdueCount + dueSoonCount} helper="Due soon + overdue" tone={overdueCount + dueSoonCount ? "warning" : "plain"} />
        <StatCard label="Proof coverage" value={`${proofCoverage}/${tenants.length}`} helper="Txn ID or file" />
      </section>

      {tenants.length === 0 ? (
        <Card><EmptyState title="No payment data" description="Payment history will appear once tenants are added." /></Card>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <section className="flex flex-col gap-2.5 lg:hidden">
            {tenants.map((tenant) => {
              const latestPayment = tenant.paymentHistory[0];
              const status = getDueStatus(tenant.nextDueDate);
              return (
                <div key={tenant.tenantId} className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-3 shadow-[var(--shadow-1)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/owner/tenants/${tenant.tenantId}`} className="truncate text-[length:var(--text-sm-size)] font-semibold text-[color:var(--fg-primary)]">
                        {tenant.fullName}
                      </Link>
                      <p className="mt-0.5 truncate text-[11px] text-[color:var(--fg-secondary)]">
                        Room {tenant.assignment?.roomNumber ?? "—"} · {latestPayment?.paymentMethod ?? "cash"}
                      </p>
                    </div>
                    <StatusBadge status={toStatusTone(status.tone)}>{status.label}</StatusBadge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <MiniValue label="Amount" value={inr(latestPayment?.amount ?? tenant.rentPaid)} />
                    <MiniValue label="Paid" value={formatPaymentDate(tenant.paidOnDate)} />
                    <MiniValue label="Next" value={formatPaymentDate(tenant.nextDueDate)} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="truncate text-[11px] text-[color:var(--fg-secondary)]">
                      {latestPayment?.txnId ? `Txn: ${latestPayment.txnId}` : "No txn id"}
                    </span>
                    <ProofCell tenant={tenant} latestPayment={latestPayment} onAdd={openProof} />
                  </div>
                </div>
              );
            })}
          </section>

          {/* ── Desktop table ── */}
          <section className="hidden lg:block">
            <DataTable columns={columns} rows={tenants} getRowKey={(t) => t.tenantId} />
          </section>
        </>
      )}

      {proofModal ? (
        <AddProofModal
          target={proofModal}
          txnId={txnIdInput}
          onTxnIdChange={setTxnIdInput}
          proofImage={proofImage}
          onProofImageChange={(file) => {
            if (file && file.size > 5 * 1024 * 1024) {
              setProofError("File is too large. Maximum size is 5 MB.");
              return;
            }
            setProofError("");
            setProofImage(file);
          }}
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
            if (proofImage) payload.append("proofImage", proofImage);

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
            setTenantOverrides((current) => ({ ...current, [updatedTenant.tenantId]: updatedTenant }));
            toast("Payment proof saved.", "success");
            setSavingProof(false);
            setProofModal(null);
            setProofImage(null);
            setTxnIdInput("");
            setProofError("");
          }}
        />
      ) : null}

      <TenantRentSearch tenants={tenants} hideButton />
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-secondary)]">{label}</p>
      <p className="mt-1 truncate text-[11px] font-semibold text-[color:var(--fg-primary)]">{value}</p>
    </div>
  );
}

function ProofCell({
  tenant,
  latestPayment,
  onAdd,
}: {
  tenant: TenantRecord;
  latestPayment: TenantRecord["paymentHistory"][number] | undefined;
  onAdd: (tenant: TenantRecord, payment: TenantRecord["paymentHistory"][number]) => void;
}) {
  if (latestPayment?.proofImageUrl) {
    return (
      <div className="inline-flex max-w-[170px] items-center gap-1.5 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-1.5 py-1">
        <a href={latestPayment.proofImageUrl} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5">
          {isImageProof(latestPayment.proofMimeType, latestPayment.proofImageName) ? (
            <Image src={latestPayment.proofImageUrl} alt={`Payment proof for ${tenant.fullName}`} width={28} height={28} className="h-7 w-7 rounded-md object-cover" />
          ) : (
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[color:color-mix(in_srgb,var(--brand)_34%,transparent)] bg-[color:var(--brand-soft)] text-[8px] font-semibold text-[color:var(--accent-electric)]">PDF</div>
          )}
          <span className="truncate text-[9px] font-medium text-[color:var(--fg-primary)]">{latestPayment.proofImageName || "View proof"}</span>
        </a>
        <a
          href={latestPayment.proofImageUrl}
          download={latestPayment.proofImageName || `${tenant.tenantId}-payment-proof`}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--accent-electric)] hover:bg-[color:var(--surface-strong)]"
          aria-label={`Download payment proof for ${tenant.fullName}`}
          title="Download proof"
        >
          <Download className="h-3 w-3" />
        </a>
      </div>
    );
  }
  if (latestPayment?.proofImageName) return <span className="text-[10px] text-[color:var(--fg-secondary)]">{latestPayment.proofImageName}</span>;
  if (!latestPayment) return <span className="text-[10px] text-[color:var(--fg-secondary)]">No proof</span>;
  return (
    <button
      type="button"
      onClick={() => onAdd(tenant, latestPayment)}
      className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--brand)_34%,transparent)] bg-[color:var(--brand-soft)] px-2.5 py-1.5 text-[10px] font-semibold text-[color:var(--accent-electric)]"
    >
      Add Proof
    </button>
  );
}

function isImageProof(mimeType?: string, fileName?: string) {
  if (mimeType?.startsWith("image/")) return true;
  return Boolean(fileName && /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(fileName));
}

function AddProofModal({
  target,
  txnId,
  onTxnIdChange,
  proofImage,
  onProofImageChange,
  error,
  saving,
  onClose,
  onSave,
}: {
  target: ProofTarget;
  txnId: string;
  onTxnIdChange: (value: string) => void;
  proofImage: File | null;
  onProofImageChange: (value: File | null) => void;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Add payment proof"
      description={`Save proof for ${target.tenantName}. Add a transaction id, a file, or both.`}
      size="sm"
      zIndexClass="z-[80]"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="small" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="small" loading={saving} onClick={onSave}>{saving ? "Saving…" : "Save Proof"}</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <FormField label="Txn ID (optional)">
          {({ id }) => (
            <TextInput id={id} value={txnId} onChange={(e) => onTxnIdChange(e.target.value.toUpperCase())} placeholder="Enter transaction id" />
          )}
        </FormField>
        <FormField label="Receipt / screenshot / proof file" helper="Optional: image, screenshot, or PDF receipt.">
          {({ id }) => (
            <div className="relative">
              <ImageUp size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--fg-tertiary)]" />
              <input
                id={id}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => onProofImageChange(e.target.files?.[0] ?? null)}
                className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-2.5 pl-9 text-[11px] text-[color:var(--fg-primary)] outline-none file:mr-2 file:rounded-md file:border-0 file:bg-[color:var(--cta)] file:px-2 file:py-1 file:text-[11px] file:text-white"
              />
            </div>
          )}
        </FormField>
        {proofImage ? <p className="text-[10px] text-[color:var(--fg-secondary)]">{proofImage.name}</p> : null}
        {error ? <p role="alert" className="text-xs text-[color:var(--error)]">{error}</p> : null}
        {saving ? <ProcessingPill label="Saving proof and syncing payment record" /> : null}
      </div>
    </Modal>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonBlock className="h-16 rounded-[var(--radius-lg)]" />
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-20 rounded-[var(--radius-lg)]" />)}
      </div>
      <ProcessingPill label="Preparing payment workspace" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-28 rounded-[var(--radius-lg)]" />)}
      </div>
    </div>
  );
}
