"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  decideAdminUpgradeRequest,
  fetchAdminBilling,
  fetchAdminUpgradeRequests,
  generateAdminInvoice,
  updateAdminBillingControl,
  updateAdminInvoiceStatus,
} from "@/services/admin/admin.service";
import type { AdminBillingRow, PaymentStatus, UpgradeRequest } from "@/types/admin";

type Invoice = {
  invoiceId: string;
  hostelId: string;
  monthKey: string;
  finalAmount: number;
  paymentStatus: PaymentStatus;
};

const plans = ["starter", "growth", "pro", "scale"] as const;

export default function AdminBillingPage() {
  const [rows, setRows] = useState<AdminBillingRow[]>([]);
  const [history, setHistory] = useState<Invoice[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);

  const load = async () => {
    const [{ data: billingData }, { data: upgradeData }] = await Promise.all([fetchAdminBilling(), fetchAdminUpgradeRequests()]);
    setRows(billingData.summary ?? []);
    setHistory(billingData.history ?? []);
    setUpgradeRequests(upgradeData.requests ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const updateControl = async (hostelId: string, patch: Record<string, unknown>) => {
    await updateAdminBillingControl(hostelId, patch);
    await load();
  };

  const generateInvoice = async (hostelId: string) => {
    await generateAdminInvoice(hostelId);
    await load();
  };

  const setStatus = async (invoiceId: string, status: PaymentStatus) => {
    await updateAdminInvoiceStatus(invoiceId, status);
    await load();
  };

  const decideUpgrade = async (requestId: string, action: "approve" | "reject") => {
    await decideAdminUpgradeRequest(requestId, action);
    await load();
  };

  return (
    <div className="space-y-4 text-white">
      <Card className="bg-[radial-gradient(circle_at_top_right,rgba(249,193,42,0.14),transparent_28%),linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-5">
        <h1 className="text-2xl font-semibold text-white">Pricing & Billing Control</h1>
        <p className="mt-2 text-sm text-[color:var(--fg-secondary)]">Apply plan upgrades, overrides, discounts, free months, and invoice actions.</p>
      </Card>

      <div className="space-y-3">
        {rows.map((row) => (
          <Card key={row.hostelId} className="bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-5 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">{row.hostelName}</p>
                <p className="text-sm text-[color:var(--fg-secondary)]">
                  Billable Tenants: {row.billing.billableTenantCount} • Extra: {row.billing.extraTenants} • Final: Rs {row.billing.finalAmount.toLocaleString("en-IN")}
                </p>
              </div>
              {row.billing.blockedAtNextPlan ? (
                <span className="rounded-full border border-[#ef4444] bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] px-2.5 py-1 text-xs font-semibold text-white shadow-[0_10px_22px_rgba(220,38,38,0.24)]">
                  Upgrade required ({row.billing.nextPlanName})
                </span>
              ) : row.billing.upgradeSuggested ? (
                <span className="rounded-full border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] px-2.5 py-1 text-xs font-semibold text-[#422006] shadow-[0_10px_22px_rgba(250,204,21,0.24)]">
                  Upgrade suggested
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <AdminField label="Plan">
                <select
                  value={row.control.planId}
                  onChange={(event) => updateControl(row.hostelId, { planId: event.target.value })}
                  className="mt-1 w-full rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm text-white"
                >
                  {plans.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
              </AdminField>

              <AdminField label="Price Override">
                <input
                  type="number"
                  defaultValue={row.control.pricingOverride ?? ""}
                  onBlur={(event) => updateControl(row.hostelId, { pricingOverride: event.target.value ? Number(event.target.value) : null })}
                  placeholder="Auto"
                  className="mt-1 w-full rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm text-white placeholder:text-[color:var(--fg-secondary)]"
                />
              </AdminField>

              <AdminField label="Discount %">
                <input
                  type="number"
                  defaultValue={row.control.discountPercent}
                  onBlur={(event) => updateControl(row.hostelId, { discountPercent: Number(event.target.value || 0) })}
                  className="mt-1 w-full rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm text-white"
                />
              </AdminField>

              <AdminField label="Free Months">
                <input
                  type="number"
                  defaultValue={row.control.freeMonthsRemaining}
                  onBlur={(event) => updateControl(row.hostelId, { freeMonthsRemaining: Number(event.target.value || 0) })}
                  className="mt-1 w-full rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm text-white"
                />
              </AdminField>

              <div className="flex items-end">
                <Button onClick={() => generateInvoice(row.hostelId)} className="w-full min-h-12">
                  Generate Invoice
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-5 text-white">
        <h2 className="text-lg font-semibold text-white">Upgrade Requests</h2>
        <div className="mt-3 space-y-2">
          {upgradeRequests.length === 0 ? (
            <p className="text-sm text-[color:var(--fg-secondary)]">No upgrade requests yet.</p>
          ) : (
            upgradeRequests.map((request) => (
              <div key={request.requestId} className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
                <div className="text-sm text-white">
                  {request.hostelName}: {request.currentPlanId.toUpperCase()} {"->"} {request.requestedPlanId.toUpperCase()} ({request.status})
                </div>
                {request.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button variant="secondary" className="min-h-9 border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] text-white shadow-[0_12px_24px_rgba(34,197,94,0.22)]" onClick={() => decideUpgrade(request.requestId, "approve")}>
                      Approve
                    </Button>
                    <Button variant="secondary" className="min-h-9 border-[#ef4444] bg-[linear-gradient(180deg,rgba(220,38,38,0.26)_0%,rgba(127,29,29,0.38)_100%)] text-white shadow-[0_12px_24px_rgba(220,38,38,0.18)]" onClick={() => decideUpgrade(request.requestId, "reject")}>
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="bg-[linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-5 text-white">
        <h2 className="text-lg font-semibold text-white">Billing History</h2>
        <div className="mt-3 space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-[color:var(--fg-secondary)]">No invoices generated yet.</p>
          ) : (
            history.map((invoice) => (
              <div key={invoice.invoiceId} className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
                <div className="text-sm text-white">
                  {invoice.invoiceId} • {invoice.monthKey} • Rs{invoice.finalAmount.toLocaleString("en-IN")}
                </div>
                <div className="flex gap-2">
                  {(["paid", "pending", "failed"] as const).map((status) => (
                    <Button
                      key={status}
                      variant="secondary"
                      onClick={() => setStatus(invoice.invoiceId, status)}
                      className={`min-h-9 px-3 text-xs ${invoice.paymentStatus === status ? "border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] text-[#422006] shadow-[0_10px_22px_rgba(250,204,21,0.24)]" : "bg-[color:var(--surface-strong)] text-white"}`}
                    >
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
