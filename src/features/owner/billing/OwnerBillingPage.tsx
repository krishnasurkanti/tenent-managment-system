"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useHostelContext } from "@/store/hostel-context";
import {
  fetchOwnerBilling,
  payOwnerBilling,
  requestOwnerPlanUpgrade,
  setOwnerAutoPay,
  type OwnerBillingData,
} from "@/services/owner/owner-billing.service";

// Plan card keys now match the backend plan IDs exactly.
const planOrder: OwnerBillingData["planId"][] = ["starter", "growth", "pro", "scale"];

const planCards = [
  {
    key: "starter" as const,
    title: "Starter",
    price: 499,
    blurb: "For hostels just getting started",
    tenantLimit: "Up to 30 tenants",
    accent: "border-[color:var(--border)] bg-[linear-gradient(180deg,#101524_0%,#0a0e18_100%)] text-white/92 opacity-75",
  },
  {
    key: "growth" as const,
    title: "Growth",
    price: 1499,
    anchor: 1999,
    blurb: "The right plan for most active hostels",
    tenantLimit: "Up to 100 tenants",
    accent:
      "border-[color:color-mix(in_srgb,var(--success)_50%,var(--brand))] bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_40%),linear-gradient(180deg,#13182b_0%,#0b1020_100%)] text-white shadow-[0_0_0_1px_rgba(34,197,94,0.18),0_24px_70px_rgba(99,102,241,0.22)]",
    popular: true,
  },
  {
    key: "pro" as const,
    title: "Pro",
    price: 1999,
    blurb: "For established hostels needing more capacity",
    tenantLimit: "Up to 100 tenants",
    accent: "border-[color:var(--border)] bg-[linear-gradient(180deg,#15111f_0%,#0c1018_100%)] text-white/92 opacity-85",
  },
  {
    key: "scale" as const,
    title: "Scale",
    price: 2499,
    blurb: "Unlimited tenants for large operations",
    tenantLimit: "Unlimited tenants",
    accent: "border-[color:var(--border)] bg-[linear-gradient(180deg,#15111f_0%,#0c1018_100%)] text-white/92 opacity-85",
  },
] as const;

type PlanCard = (typeof planCards)[number];

export default function OwnerBillingPage() {
  const { currentHostel, loading } = useHostelContext();
  const [data, setData] = useState<OwnerBillingData | null>(null);
  const [message, setMessage] = useState("");
  const [pageError, setPageError] = useState("");
  const [actionLoading, setActionLoading] = useState<"pay" | "autopay" | "upgrade" | null>(null);

  const load = useCallback(async () => {
    if (!currentHostel?.id) return;
    const { response, data: next } = await fetchOwnerBilling(currentHostel.id);
    if (!response.ok) throw new Error(next.message || "Unable to load billing.");
    setPageError("");
    setData(next);
  }, [currentHostel?.id]);

  useEffect(() => {
    void load().catch((error: unknown) => {
      setPageError(error instanceof Error ? error.message : "Unable to load billing.");
    });
  }, [load]);

  const nextPlan = useMemo(() => {
    if (!data) return null;
    const idx = planOrder.indexOf(data.planId);
    return idx >= 0 ? planOrder[idx + 1] ?? null : null;
  }, [data]);

  if (loading || !currentHostel) {
    return <Card className="p-6 text-center text-sm text-[color:var(--fg-secondary)]">Loading billing...</Card>;
  }

  if (!data) {
    return <Card className="p-6 text-center text-sm text-[color:var(--fg-secondary)]">{pageError || "Loading billing..."}</Card>;
  }

  const payNow = async () => {
    setActionLoading("pay");
    try {
      const { response, data: payload } = await payOwnerBilling(currentHostel.id);
      setMessage(response.ok ? "Payment successful. Account is active." : payload.message || "Unable to process payment.");
      await load().catch(() => {});
    } finally {
      setActionLoading(null);
    }
  };

  const toggleAutoPay = async (enabled: boolean) => {
    setActionLoading("autopay");
    try {
      const { response, data: payload } = await setOwnerAutoPay(currentHostel.id, enabled);
      setMessage(response.ok ? `Auto-pay ${enabled ? "enabled" : "disabled"}.` : payload.message || "Unable to update auto-pay.");
      await load().catch(() => {});
    } finally {
      setActionLoading(null);
    }
  };

  const requestPlanChange = async (requestedPlanId: OwnerBillingData["planId"]) => {
    if (requestedPlanId === data.planId) return;
    setActionLoading("upgrade");
    try {
      const { response, data: payload } = await requestOwnerPlanUpgrade(currentHostel.id, data.planId, requestedPlanId);
      setMessage(
        response.ok
          ? `Plan change request submitted for ${requestedPlanId.toUpperCase()}.`
          : payload.message || "Unable to request plan change.",
      );
      await load().catch(() => {});
    } finally {
      setActionLoading(null);
    }
  };

  const annualSavings = (1999 - 1499) * 12;

  // suppress unused variable warning for nextPlan (kept for future use)
  void nextPlan;

  return (
    <div className="space-y-5 text-white">
      <section className="relative overflow-hidden rounded-[40px] border border-[color:var(--border)] bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_26%),linear-gradient(180deg,#090b15_0%,#0d1120_48%,#11172a_100%)] p-5 shadow-[0_32px_90px_rgba(2,6,23,0.42)] sm:p-7">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-electric)]">
            <Sparkles className="h-3.5 w-3.5" />
            Plans &amp; Billing
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Pricing &amp; billing</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{data.hostelName}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:color-mix(in_srgb,var(--fg-primary)_72%,transparent)] sm:text-base">
            Choose the plan that fits your hostel size. You can request a change at any time.
          </p>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {planCards.map((card) => {
              const active = data.planId === card.key;
              const anchor = "anchor" in card ? card.anchor : null;
              const popular = "popular" in card && Boolean(card.popular);
              const hasPendingRequest = data.upgradePending && !active;
              return (
                <article
                  key={card.key}
                  className={`relative flex min-h-[320px] flex-col rounded-[36px] border p-5 ${card.accent} ${popular ? "scale-[1.01]" : ""}`}
                >
                  {popular ? (
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,var(--cta)_0%,var(--cta-strong)_100%)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_14px_36px_color-mix(in_srgb,var(--cta)_26%,transparent)]">
                      Most Popular
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em]">{card.title}</p>
                    {active ? (
                      <span className="rounded-full border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_12px_24px_rgba(34,197,94,0.24)]">
                        Current
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    {anchor ? (
                      <div className="mb-2 flex items-end gap-3">
                        <span className="text-base font-medium text-[color:var(--fg-secondary)] line-through">₹{anchor}</span>
                        <span className="text-4xl font-semibold tracking-[-0.04em] text-white">₹{card.price}</span>
                        <span className="pb-1 text-sm text-[color:var(--fg-secondary)]">/ month</span>
                      </div>
                    ) : (
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-semibold tracking-[-0.04em] text-white">₹{card.price}</span>
                        <span className="pb-1 text-sm text-[color:var(--fg-secondary)]">/ month</span>
                      </div>
                    )}

                    <p className="mt-3 text-sm text-[color:var(--fg-secondary)]">{card.tenantLimit}</p>
                    <p className="mt-3 text-sm font-medium text-white/90">{card.blurb}</p>
                  </div>

                  {popular ? (
                    <div className="mt-4 inline-flex rounded-full border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_12px_24px_rgba(34,197,94,0.24)]">
                      Save ₹{annualSavings.toLocaleString("en-IN")}/year
                    </div>
                  ) : null}

                  <ul className="mt-6 space-y-3">
                    <FeatureItem>All features included</FeatureItem>
                    <FeatureItem>{card.tenantLimit}</FeatureItem>
                  </ul>

                  <div className="mt-auto pt-6">
                    {active ? (
                      <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 text-center text-sm font-medium text-[color:var(--fg-secondary)]">
                        Active plan
                      </div>
                    ) : (
                      <Button
                        className="min-h-14 w-full text-sm"
                        onClick={() => requestPlanChange(card.key)}
                        disabled={hasPendingRequest}
                        loading={actionLoading === "upgrade"}
                      >
                        {hasPendingRequest ? "Request pending" : `Switch to ${card.title}`}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="space-y-4">
            <Card className="bg-[linear-gradient(180deg,#101523_0%,#0c1018_100%)] p-5 text-white shadow-[0_26px_70px_rgba(2,6,23,0.28)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Current billing</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoPill label="Current plan" value={data.planId.toUpperCase()} />
                <InfoPill label="Status" value={data.paymentStatus.toUpperCase()} tone={data.paymentStatus === "paid" ? "success" : "warning"} />
                <InfoPill label="Payable now" value={`₹${data.payableAmount.toLocaleString("en-IN")}`} />
                <InfoPill label="Due date" value={new Date(data.dueDate).toLocaleDateString("en-IN")} />
              </div>
              <div className="mt-4 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
                <p className="text-sm font-medium text-white">Plan details</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--fg-secondary)]">
                  {data.billing.blockedAtNextPlan
                    ? `Your tenant count has reached the limit for the current plan. Upgrade to continue adding tenants.`
                    : data.billing.upgradeSuggested
                      ? "You are approaching the tenant limit for your current plan. Consider upgrading soon."
                      : "Your current plan covers your active tenant count."}
                </p>
              </div>
            </Card>

            <Card className="bg-[linear-gradient(180deg,#101523_0%,#0c1018_100%)] p-5 text-white shadow-[0_26px_70px_rgba(2,6,23,0.28)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Actions</p>
              <div className="mt-4 grid gap-3">
                <Button onClick={payNow} loading={actionLoading === "pay"} className="min-h-12 w-full">
                  Pay Now
                </Button>
                <Button variant="secondary" onClick={() => toggleAutoPay(!data.autoPayEnabled)} loading={actionLoading === "autopay"} className="min-h-12 w-full border-[color:var(--border)] bg-[color:var(--surface-soft)] text-white hover:bg-[color:var(--surface-strong)]">
                  {data.autoPayEnabled ? "Disable Auto-Pay" : "Enable Auto-Pay"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--fg-primary)]">
          {message}
        </div>
      ) : null}

      {pageError ? (
        <div className="rounded-[28px] border border-[color:var(--error)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">
          {pageError}
        </div>
      ) : null}
    </div>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-sm text-white/88">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] text-white shadow-[0_10px_20px_rgba(34,197,94,0.22)]">
        <Check className="h-3.5 w-3.5" />
      </span>
      {children}
    </li>
  );
}

function InfoPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] text-white shadow-[0_14px_28px_rgba(34,197,94,0.22)]"
      : tone === "warning"
        ? "border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] text-[#422006] shadow-[0_14px_28px_rgba(250,204,21,0.22)]"
        : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-white";

  return (
    <div className={`rounded-[26px] border px-4 py-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.02em]">{value}</p>
    </div>
  );
}
