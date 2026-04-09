"use client";

import { useEffect, useState } from "react";

type BillingRow = {
  hostelId: string;
  hostelName: string;
  plan: { id: string; name: string; basePrice: number; limit: number };
  control: {
    planId: string;
    pricingOverride: number | null;
    discountPercent: number;
    freeMonthsRemaining: number;
  };
  billing: {
    tenantCount: number;
    billableTenantCount: number;
    extraTenants: number;
    extraCharges: number;
    baseAmount: number;
    discountAmount: number;
    finalAmount: number;
    upgradeSuggested: boolean;
    blockedAtNextPlan: boolean;
    nextPlanName: string | null;
  };
};

type Invoice = {
  invoiceId: string;
  hostelId: string;
  monthKey: string;
  finalAmount: number;
  paymentStatus: "paid" | "pending" | "failed";
};

type UpgradeRequest = {
  requestId: string;
  hostelId: string;
  hostelName: string;
  currentPlanId: string;
  requestedPlanId: string;
  note: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  decidedAt?: string;
};

const plans = ["starter", "growth", "pro", "scale"] as const;

export default function AdminBillingPage() {
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [history, setHistory] = useState<Invoice[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);

  const load = async () => {
    const response = await fetch("/api/admin/billing", { cache: "no-store" });
    const upgradeRes = await fetch("/api/admin/billing/upgrade-requests", { cache: "no-store" });
    const data = (await response.json()) as { summary: BillingRow[]; history: Invoice[] };
    const upgradeData = (await upgradeRes.json()) as { requests: UpgradeRequest[] };
    setRows(data.summary ?? []);
    setHistory(data.history ?? []);
    setUpgradeRequests(upgradeData.requests ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const updateControl = async (hostelId: string, patch: Record<string, unknown>) => {
    await fetch("/api/admin/billing/control", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostelId, ...patch }),
    });
    await load();
  };

  const generateInvoice = async (hostelId: string) => {
    await fetch("/api/admin/billing/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostelId }),
    });
    await load();
  };

  const setStatus = async (invoiceId: string, status: "paid" | "pending" | "failed") => {
    await fetch("/api/admin/billing/invoice-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, status }),
    });
    await load();
  };

  const decideUpgrade = async (requestId: string, action: "approve" | "reject") => {
    await fetch("/api/admin/billing/upgrade-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action }),
    });
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Pricing & Billing Control</h1>
        <p className="mt-1 text-sm text-slate-600">Apply plan upgrades, overrides, discounts, free months, and invoice actions.</p>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.hostelId} className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">{row.hostelName}</p>
                <p className="text-sm text-slate-500">
                  Billable Tenants: {row.billing.billableTenantCount} • Extra: {row.billing.extraTenants} • Final: ₹
                  {row.billing.finalAmount.toLocaleString("en-IN")}
                </p>
              </div>
              {row.billing.blockedAtNextPlan ? (
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                  Upgrade required ({row.billing.nextPlanName})
                </span>
              ) : row.billing.upgradeSuggested ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Upgrade suggested</span>
              ) : null}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <label className="text-xs text-slate-600">
                Plan
                <select
                  value={row.control.planId}
                  onChange={(event) => updateControl(row.hostelId, { planId: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
                >
                  {plans.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-slate-600">
                Price Override
                <input
                  type="number"
                  defaultValue={row.control.pricingOverride ?? ""}
                  onBlur={(event) => updateControl(row.hostelId, { pricingOverride: event.target.value ? Number(event.target.value) : null })}
                  placeholder="Auto"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
                />
              </label>

              <label className="text-xs text-slate-600">
                Discount %
                <input
                  type="number"
                  defaultValue={row.control.discountPercent}
                  onBlur={(event) => updateControl(row.hostelId, { discountPercent: Number(event.target.value || 0) })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
                />
              </label>

              <label className="text-xs text-slate-600">
                Free Months
                <input
                  type="number"
                  defaultValue={row.control.freeMonthsRemaining}
                  onBlur={(event) => updateControl(row.hostelId, { freeMonthsRemaining: Number(event.target.value || 0) })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => generateInvoice(row.hostelId)}
                  className="w-full rounded-lg bg-[linear-gradient(90deg,#0ea5e9_0%,#22c55e_100%)] px-3 py-2 text-sm font-semibold text-white"
                >
                  Generate Invoice
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Upgrade Requests</h2>
        <div className="mt-3 space-y-2">
          {upgradeRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No upgrade requests yet.</p>
          ) : (
            upgradeRequests.map((request) => (
              <div key={request.requestId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="text-sm text-slate-700">
                  {request.hostelName}: {request.currentPlanId.toUpperCase()} → {request.requestedPlanId.toUpperCase()} ({request.status})
                </div>
                {request.status === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => decideUpgrade(request.requestId, "approve")}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decideUpgrade(request.requestId, "reject")}
                      className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Billing History</h2>
        <div className="mt-3 space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No invoices generated yet.</p>
          ) : (
            history.map((invoice) => (
              <div key={invoice.invoiceId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="text-sm text-slate-700">
                  {invoice.invoiceId} • {invoice.monthKey} • ₹{invoice.finalAmount.toLocaleString("en-IN")}
                </div>
                <div className="flex gap-2">
                  {(["paid", "pending", "failed"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatus(invoice.invoiceId, status)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                        invoice.paymentStatus === status ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
