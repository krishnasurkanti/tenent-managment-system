"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ShieldAlert, Sparkles } from "lucide-react";
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

const planOrder: OwnerBillingData["planId"][] = ["starter", "growth", "pro", "scale"];

const planCards = [
  {
    key: "basic",
    title: "Basic",
    price: 499,
    blurb: "Just the basics",
    tenantLimit: "Up to 30 tenants",
    accent: "border-[color:var(--border)] bg-[linear-gradient(180deg,#101524_0%,#0a0e18_100%)] text-white/92 opacity-75",
  },
  {
    key: "pro",
    title: "Pro",
    price: 1499,
    anchor: 1999,
    blurb: "The obvious smart choice for active hostels",
    tenantLimit: "Up to 100 tenants",
    accent:
      "border-[color:color-mix(in_srgb,var(--success)_50%,var(--brand))] bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_40%),linear-gradient(180deg,#13182b_0%,#0b1020_100%)] text-white shadow-[0_0_0_1px_rgba(34,197,94,0.18),0_24px_70px_rgba(99,102,241,0.22)]",
    popular: true,
  },
  {
    key: "premium",
    title: "Premium",
    price: 2499,
    blurb: "For growing hostels",
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

  const load = async () => {
    if (!currentHostel?.id) return;
    const { response, data: next } = await fetchOwnerBilling(currentHostel.id);
    if (!response.ok) throw new Error(next.message || "Unable to load billing.");
    setPageError("");
    setData(next);
  };

  useEffect(() => {
    void load().catch((error: unknown) => {
      setPageError(error instanceof Error ? error.message : "Unable to load billing.");
    });
  }, [currentHostel?.id]);

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
      setMessage(response.ok ? "Payment successful. Account is active again." : payload.message || "Unable to process payment.");
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
          ? `Plan change request sent for ${requestedPlanId.toUpperCase()}.`
          : payload.message || "Unable to request plan change.",
      );
      await load().catch(() => {});
    } finally {
      setActionLoading(null);
    }
  };

  const currentPlanCard = planCards.find((card) => matchesPlan(card.key, data.planId));
  const annualSavings = (1999 - 1499) * 12;

  return (
    <main className="space-y-5 text-white">
      <section className="relative overflow-hidden rounded-[40px] border border-[color:var(--border)] bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_26%),linear-gradient(180deg,#090b15_0%,#0d1120_48%,#11172a_100%)] p-5 shadow-[0_32px_90px_rgba(2,6,23,0.42)] sm:p-7">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-electric)]">
            <Sparkles className="h-3.5 w-3.5" />
            Pricing engineered for conversion
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">Pricing & billing</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{data.hostelName}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:color-mix(in_srgb,var(--fg-primary)_72%,transparent)] sm:text-base">
            Dark, high-contrast pricing built to make the upgrade path obvious, reduce hesitation, and protect against missed rent losses.
          </p>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="grid gap-4 md:grid-cols-3">
            {planCards.map((card) => {
              const active = currentPlanCard?.key === card.key;
              const anchor = "anchor" in card ? card.anchor : null;
              const popular = "popular" in card && Boolean(card.popular);
              const requestedPlanId = getRequestedPlanId(card.key, data.planId);
              const hasPendingRequest = data.upgradePending && requestedPlanId !== data.planId;
              return (
                <article
                  key={card.key}
                  className={`relative flex min-h-[360px] flex-col rounded-[36px] border p-5 ${card.accent} ${popular ? "scale-[1.01]" : ""}`}
                >
                  {popular ? (
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,var(--cta)_0%,var(--cta-strong)_100%)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_14px_36px_color-mix(in_srgb,var(--cta)_26%,transparent)]">
                      Fire Most Popular
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em]">{card.title}</p>
                    {active ? (
                      <span className="rounded-full border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_12px_24px_rgba(34,197,94,0.24)]">
                        Current plan
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
                    <p className="mt-1 text-sm text-[color:var(--fg-secondary)]">All features included</p>
                    <p className="mt-3 text-sm font-medium text-white/90">{card.blurb}</p>
                  </div>

                  {popular ? (
                    <div className="mt-5 space-y-3">
                      <div className="rounded-[28px] border border-[#ef4444] bg-[linear-gradient(180deg,rgba(220,38,38,0.26)_0%,rgba(127,29,29,0.38)_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(220,38,38,0.18)]">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-[color:var(--error)]" />
                          <span>Don&apos;t lose this</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-[#fee2e2]">
                          Missing even 1 rent payment costs more than this.
                        </p>
                      </div>
                      <div className="inline-flex rounded-full border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_12px_24px_rgba(34,197,94,0.24)]">
                        Save ₹{annualSavings.toLocaleString("en-IN")}/year
                      </div>
                    </div>
                  ) : null}

                  <ul className="mt-6 space-y-3">
                    <FeatureItem>All features included</FeatureItem>
                    <FeatureItem>{card.tenantLimit}</FeatureItem>
                  </ul>

                  <div className="mt-auto pt-6">
                    {active ? (
                      <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 text-center text-sm font-medium text-[color:var(--fg-secondary)]">
                        Current active plan
                      </div>
                    ) : (
                      <Button
                        className="min-h-14 w-full text-sm"
                        onClick={() => requestPlanChange(requestedPlanId)}
                        disabled={hasPendingRequest}
                        loading={actionLoading === "upgrade"}
                      >
                        {hasPendingRequest
                          ? "Request Pending"
                          : card.key === "basic"
                            ? "Choose Basic"
                            : card.key === "premium"
                              ? "Choose Premium"
                              : "Choose Pro"}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="space-y-4">
            <Card className="bg-[linear-gradient(180deg,#101523_0%,#0c1018_100%)] p-5 text-white shadow-[0_26px_70px_rgba(2,6,23,0.28)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Live billing status</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoPill label="Current plan" value={data.planId.toUpperCase()} />
                <InfoPill label="Status" value={data.paymentStatus.toUpperCase()} tone={data.paymentStatus === "paid" ? "success" : "warning"} />
                <InfoPill label="Payable now" value={`₹${data.payableAmount.toLocaleString("en-IN")}`} />
                <InfoPill label="Due date" value={new Date(data.dueDate).toLocaleDateString("en-IN")} />
              </div>
              <div className="mt-4 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4">
                <p className="text-sm font-medium text-white">Loss aversion in plain terms</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--fg-secondary)]">
                  Missing rent means losing income. The Pro plan costs less than a single missed collection cycle in most hostels.
                </p>
              </div>
            </Card>

            <Card className="bg-[linear-gradient(180deg,#101523_0%,#0c1018_100%)] p-5 text-white shadow-[0_26px_70px_rgba(2,6,23,0.28)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Actions</p>
              <div className="mt-4 grid gap-3">
                <Button onClick={payNow} loading={actionLoading === "pay"} className="min-h-12 w-full">
                  Pay Online
                </Button>
                <Button variant="secondary" onClick={() => toggleAutoPay(!data.autoPayEnabled)} loading={actionLoading === "autopay"} className="min-h-12 w-full border-[color:var(--border)] bg-[color:var(--surface-soft)] text-white hover:bg-[color:var(--surface-strong)]">
                  {data.autoPayEnabled ? "Disable Auto-Pay" : "Enable Auto-Pay"}
                </Button>
              </div>
              <div className="mt-4 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4 text-sm text-[color:var(--fg-secondary)]">
                {data.billing.blockedAtNextPlan
                  ? `Tenant count has reached the next plan boundary (${data.billing.nextPlanName}). Upgrade is required.`
                  : data.billing.upgradeSuggested
                    ? "Usage indicates you are close to the smarter upgrade tier."
                    : "Current plan is still sufficient for your current occupancy."}
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
    </main>
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

function matchesPlan(cardKey: string, planId: OwnerBillingData["planId"]) {
  if (cardKey === "basic") return planId === "starter";
  if (cardKey === "pro") return planId === "growth" || planId === "pro";
  return planId === "scale";
}

function getRequestedPlanId(cardKey: PlanCard["key"], currentPlanId: OwnerBillingData["planId"]): OwnerBillingData["planId"] {
  if (cardKey === "basic") return "starter";
  if (cardKey === "premium") return "scale";
  return currentPlanId === "starter" ? "growth" : "pro";
}
