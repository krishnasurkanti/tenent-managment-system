"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  approveAdminPaymentProof,
  decideAdminUpgradeRequest,
  fetchAdminBilling,
  fetchAdminPendingProofs,
  fetchAdminUpgradeRequests,
  generateAdminInvoice,
  rejectAdminPaymentProof,
  startOwnerBilling,
  updateAdminBillingControl,
  updateAdminInvoiceStatus,
  type PendingProofItem,
} from "@/services/admin/admin.service";
import type { AdminBillingRow, PaymentStatus, UpgradeRequest } from "@/types/admin";

type Invoice = {
  invoiceId: string;
  hostelId: string;
  monthKey: string;
  finalAmount: number;
  paymentStatus: PaymentStatus;
};

const plans = ["free", "starter", "growth", "pro"] as const;
const fieldCls = "mt-1 w-full rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm text-[color:var(--fg-primary)] outline-none placeholder:text-[color:var(--fg-tertiary)] [&>option]:bg-[color:var(--bg-elevated)]";
const approveCls = "min-h-9 border-[color:var(--success)] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] text-white";
const rejectCls = "min-h-9 border-[color:var(--error)] bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] text-white";

export default function AdminBillingPage() {
  const [rows, setRows] = useState<AdminBillingRow[]>([]);
  const [history, setHistory] = useState<Invoice[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [pendingProofs, setPendingProofs] = useState<PendingProofItem[]>([]);

  const load = async () => {
    const [{ data: billingData }, { data: upgradeData }, { data: proofData }] = await Promise.all([
      fetchAdminBilling(),
      fetchAdminUpgradeRequests(),
      fetchAdminPendingProofs(),
    ]);
    setRows(billingData.summary ?? []);
    setHistory(billingData.history ?? []);
    setUpgradeRequests(upgradeData.requests ?? []);
    setPendingProofs(proofData.proofs ?? []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const updateControl = async (hostelId: string, patch: Record<string, unknown>) => { await updateAdminBillingControl(hostelId, patch); await load(); };
  const generateInvoice = async (hostelId: string) => { await generateAdminInvoice(hostelId); await load(); };
  const setStatus = async (invoiceId: string, status: PaymentStatus) => { await updateAdminInvoiceStatus(invoiceId, status); await load(); };
  const decideUpgrade = async (requestId: string, action: "approve" | "reject") => { await decideAdminUpgradeRequest(requestId, action); await load(); };
  const approveProof = async (invoiceId: string) => { await approveAdminPaymentProof(invoiceId); await load(); };
  const rejectProof = async (invoiceId: string) => { await rejectAdminPaymentProof(invoiceId); await load(); };
  const activateBilling = async (hostelId: string) => { await startOwnerBilling(hostelId); await load(); };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Admin</p>
        <h1 className="font-display mt-0.5 text-[clamp(1.35rem,4.5vw,1.75rem)] font-bold text-[color:var(--fg-primary)]">Pricing &amp; billing control</h1>
        <p className="text-[length:var(--text-sm-size)] text-[color:var(--fg-secondary)]">Apply plan upgrades, overrides, discounts, free months, and invoice actions.</p>
      </header>

      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <Card key={row.hostelId} className="p-3 sm:p-4">
            {!row.billingCycleStart && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--warning)_25%,transparent)] bg-[color:var(--warning-soft)] px-3 py-2.5">
                <div>
                  <p className="text-[12px] font-semibold text-[color:var(--warning)]">Billing not started</p>
                  <p className="text-[11px] text-[color:var(--fg-secondary)]">Owner is on free access until you start billing.</p>
                </div>
                <button type="button" onClick={() => void activateBilling(row.hostelId)} className="shrink-0 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color:var(--warning-soft)] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--warning)] transition hover:brightness-110">
                  Start Billing
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[color:var(--fg-primary)]">{row.hostelName}</p>
                <p className="text-sm text-[color:var(--fg-secondary)]">
                  {row.billingCycleStart
                    ? `Cycle from ${new Date(row.billingCycleStart).toLocaleDateString("en-IN")} • Billable: ${row.billing.billableTenantCount} • Rs ${row.billing.finalAmount.toLocaleString("en-IN")}`
                    : `${row.billing.tenantCount} tenants • Free access active`}
                </p>
              </div>
              {row.billing.blockedAtNextPlan ? (
                <span className="rounded-full border border-[color:var(--error)] bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] px-2.5 py-1 text-xs font-semibold text-white">Upgrade required ({row.billing.nextPlanName})</span>
              ) : row.billing.upgradeSuggested ? (
                <span className="rounded-full border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] px-2.5 py-1 text-xs font-semibold text-[#422006]">Upgrade suggested</span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <AdminField label="Plan">
                <select value={row.control.planId} onChange={(e) => updateControl(row.hostelId, { planId: e.target.value })} className={fieldCls}>
                  {plans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                </select>
              </AdminField>
              <AdminField label="Price override">
                <input type="number" defaultValue={row.control.pricingOverride ?? ""} onBlur={(e) => updateControl(row.hostelId, { pricingOverride: e.target.value ? Number(e.target.value) : null })} placeholder="Auto" className={fieldCls} />
              </AdminField>
              <AdminField label="Discount %">
                <input type="number" defaultValue={row.control.discountPercent} onBlur={(e) => updateControl(row.hostelId, { discountPercent: Number(e.target.value || 0) })} className={fieldCls} />
              </AdminField>
              <AdminField label="Free months">
                <input type="number" defaultValue={row.control.freeMonthsRemaining} onBlur={(e) => updateControl(row.hostelId, { freeMonthsRemaining: Number(e.target.value || 0) })} className={fieldCls} />
              </AdminField>
              <div className="flex items-end">
                <Button onClick={() => generateInvoice(row.hostelId)} fullWidth className="min-h-12">Generate Invoice</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pending payment proofs */}
      {pendingProofs.length > 0 ? (
        <Card className="border-[color:color-mix(in_srgb,var(--warning)_25%,transparent)] p-3 sm:p-4">
          <h2 className="text-lg font-semibold text-[color:var(--warning)]">Pending payment proofs ({pendingProofs.length})</h2>
          <p className="mt-0.5 text-[12px] text-[color:var(--fg-tertiary)]">Review submitted proofs and approve or reject.</p>
          <div className="mt-3 flex flex-col gap-3">
            {pendingProofs.map((item) => (
              <div key={item.invoiceId} className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--warning)_20%,transparent)] bg-[color:var(--warning-soft)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--fg-primary)]">{item.hostelName}</p>
                    <p className="text-[12px] text-[color:var(--fg-secondary)]">{item.monthKey} • Rs {item.finalAmount.toLocaleString("en-IN")}</p>
                    {item.proof?.txnId ? <p className="mt-1 text-[12px] text-[color:var(--fg-secondary)]">Txn ID: <span className="font-mono text-[color:var(--fg-primary)]">{item.proof.txnId}</span></p> : null}
                    {item.proof?.submittedAt ? <p className="mt-0.5 text-[11px] text-[color:var(--fg-tertiary)]">Submitted {new Date(item.proof.submittedAt).toLocaleString("en-IN")}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" className={approveCls} onClick={() => approveProof(item.invoiceId)}>Approve</Button>
                    <Button variant="secondary" className={rejectCls} onClick={() => rejectProof(item.invoiceId)}>Reject</Button>
                  </div>
                </div>
                {item.proof?.screenshotDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.proof.screenshotDataUrl} alt="Payment screenshot" className="mt-3 max-h-48 w-auto rounded-[var(--radius-sm)] border border-[color:var(--border)] object-contain" />
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="p-3 sm:p-4">
        <h2 className="text-lg font-semibold text-[color:var(--fg-primary)]">Upgrade requests</h2>
        <div className="mt-3 flex flex-col gap-2">
          {upgradeRequests.length === 0 ? (
            <p className="text-sm text-[color:var(--fg-secondary)]">No upgrade requests yet.</p>
          ) : (
            upgradeRequests.map((request) => (
              <div key={request.requestId} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
                <div className="text-sm text-[color:var(--fg-primary)]">
                  {request.hostelName}: {request.currentPlanId.toUpperCase()} {"->"} {request.requestedPlanId.toUpperCase()} ({request.status})
                </div>
                {request.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button variant="secondary" className={approveCls} onClick={() => decideUpgrade(request.requestId, "approve")}>Approve</Button>
                    <Button variant="secondary" className={rejectCls} onClick={() => decideUpgrade(request.requestId, "reject")}>Reject</Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-3 sm:p-4">
        <h2 className="text-lg font-semibold text-[color:var(--fg-primary)]">Billing history</h2>
        <div className="mt-3 flex flex-col gap-2">
          {history.length === 0 ? (
            <p className="text-sm text-[color:var(--fg-secondary)]">No invoices generated yet.</p>
          ) : (
            history.map((invoice) => (
              <div key={invoice.invoiceId} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
                <div className="text-sm text-[color:var(--fg-primary)]">{invoice.invoiceId} • {invoice.monthKey} • Rs{invoice.finalAmount.toLocaleString("en-IN")}</div>
                <div className="flex gap-2">
                  {(["paid", "pending", "failed"] as const).map((status) => (
                    <Button key={status} variant="secondary" onClick={() => setStatus(invoice.invoiceId, status)}
                      className={`min-h-9 px-3 text-xs ${invoice.paymentStatus === status ? "border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] text-[#422006]" : "bg-[color:var(--surface-strong)] text-[color:var(--fg-primary)]"}`}>
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs text-[color:var(--fg-secondary)]">
      {label}
      {children}
    </label>
  );
}
