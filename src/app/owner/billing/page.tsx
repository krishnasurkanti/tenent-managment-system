"use client";

import { useEffect, useMemo, useState } from "react";
import { useHostelContext } from "@/components/hostel-context-provider";
import { Card } from "@/components/ui/card";

type OwnerBillingData = {
  hostelId: string;
  hostelName: string;
  monthKey: string;
  dueDate: string;
  planId: "starter" | "growth" | "pro" | "scale";
  autoPayEnabled: boolean;
  paymentStatus: "paid" | "pending" | "failed";
  accessActive: boolean;
  payableAmount: number;
  billing: {
    tenantCount: number;
    billableTenantCount: number;
    extraTenants: number;
    extraCharges: number;
    finalAmount: number;
    upgradeSuggested: boolean;
    blockedAtNextPlan: boolean;
    nextPlanName: string | null;
  };
  upgradePending: boolean;
};

const planOrder: OwnerBillingData["planId"][] = ["starter", "growth", "pro", "scale"];

export default function OwnerBillingPage() {
  const { currentHostel, loading } = useHostelContext();
  const [data, setData] = useState<OwnerBillingData | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!currentHostel?.id) return;
    const response = await fetch(`/api/owner-billing?hostelId=${currentHostel.id}`, { cache: "no-store" });
    const next = (await response.json()) as OwnerBillingData;
    setData(next);
  };

  useEffect(() => {
    void load();
  }, [currentHostel?.id]);

  const nextPlan = useMemo(() => {
    if (!data) return null;
    const idx = planOrder.indexOf(data.planId);
    return idx >= 0 ? planOrder[idx + 1] ?? null : null;
  }, [data]);

  if (loading || !currentHostel) {
    return <Card className="border-slate-200 bg-white p-4 text-center text-sm text-slate-600">Loading billing...</Card>;
  }

  if (!data) {
    return <Card className="border-slate-200 bg-white p-4 text-center text-sm text-slate-600">Loading billing...</Card>;
  }

  const payNow = async () => {
    const response = await fetch("/api/owner-billing/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostelId: currentHostel.id, paymentMethod: "online" }),
    });
    const payload = await response.json();
    setMessage(response.ok ? "Payment successful. Account is active again." : payload.message || "Unable to process payment.");
    await load();
  };

  const toggleAutoPay = async (enabled: boolean) => {
    const response = await fetch("/api/owner-billing/autopay", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostelId: currentHostel.id, enabled }),
    });
    const payload = await response.json();
    setMessage(response.ok ? `Auto-pay ${enabled ? "enabled" : "disabled"}.` : payload.message || "Unable to update auto-pay.");
    await load();
  };

  const requestUpgrade = async () => {
    if (!nextPlan) return;
    const response = await fetch("/api/owner-billing/request-upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostelId: currentHostel.id,
        requestedPlanId: nextPlan,
        note: `Upgrade requested from ${data.planId} to ${nextPlan}`,
      }),
    });
    const payload = await response.json();
    setMessage(response.ok ? "Upgrade request sent to admin for approval." : payload.message || "Unable to request upgrade.");
    await load();
  };

  return (
    <main className="space-y-4">
      <Card className="rounded-[26px] border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(240,249,255,0.95)_100%)] p-5 shadow-[0_18px_42px_rgba(14,165,233,0.12)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pricing & Billing</p>
        <h1 className="mt-1 text-[1.4rem] font-semibold text-slate-900">Billing for {data.hostelName}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Plan: <span className="font-semibold uppercase">{data.planId}</span> • Due Date:{" "}
          <span className="font-semibold">{new Date(data.dueDate).toLocaleDateString("en-IN")}</span> • Payable Amount:{" "}
          <span className="font-semibold">₹{data.payableAmount.toLocaleString("en-IN")}</span>
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Billing Status" value={data.paymentStatus.toUpperCase()} helper={data.accessActive ? "Access Active" : "Access Restricted"} />
        <Metric label="Billable Tenants" value={String(data.billing.billableTenantCount)} helper={`Current: ${data.billing.tenantCount}`} />
        <Metric label="Extra Charges" value={`₹${data.billing.extraCharges.toLocaleString("en-IN")}`} helper={`${data.billing.extraTenants} extra tenants`} />
        <Metric label="Final Amount" value={`₹${data.billing.finalAmount.toLocaleString("en-IN")}`} helper={`Cycle ${data.monthKey}`} />
      </div>

      <Card className="rounded-[22px] border-white/70 bg-white/90 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Payment Options</p>
            <p className="text-xs text-slate-500">Hostel owner can pay online now or enable auto-pay for monthly billing.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={payNow}
              className="rounded-xl bg-[linear-gradient(90deg,#0ea5e9_0%,#22c55e_100%)] px-4 py-2 text-sm font-semibold text-white"
            >
              Pay Online
            </button>
            <button
              type="button"
              onClick={() => toggleAutoPay(!data.autoPayEnabled)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {data.autoPayEnabled ? "Disable Auto-Pay" : "Enable Auto-Pay"}
            </button>
          </div>
        </div>
      </Card>

      <Card className="rounded-[22px] border-white/70 bg-white/90 p-4">
        <p className="text-sm font-semibold text-slate-900">Upgrade Control</p>
        <p className="mt-1 text-xs text-slate-500">
          {data.billing.blockedAtNextPlan
            ? `Tenant count reached next plan boundary (${data.billing.nextPlanName}). Upgrade is required.`
            : data.billing.upgradeSuggested
              ? "Current plan is less optimal based on tenant volume."
              : "Current plan is sufficient for now."}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={requestUpgrade}
            disabled={!nextPlan || data.upgradePending}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              !nextPlan || data.upgradePending
                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                : "bg-[linear-gradient(90deg,#8c76ff_0%,#ff8fb1_100%)] text-white"
            }`}
          >
            {data.upgradePending ? "Upgrade Request Pending" : `Request Upgrade${nextPlan ? ` to ${nextPlan.toUpperCase()}` : ""}`}
          </button>
        </div>
      </Card>

      {message ? <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{message}</p> : null}
    </main>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card className="rounded-2xl border-white/70 bg-white/95 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-[1.2rem] font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </Card>
  );
}
