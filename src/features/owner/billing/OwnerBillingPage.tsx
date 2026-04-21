"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Check, Clock3, Crown, Info, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OwnerPageHero, OwnerQuickStat } from "@/components/ui/owner-page";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { fetchOwnerBilling, requestOwnerPlanUpgrade, type OwnerBillingData } from "@/services/owner/owner-billing.service";
import { useHostelContext } from "@/store/hostel-context";
import { cn } from "@/utils/cn";

type PlanId = "starter" | "growth" | "pro" | "scale";

type PlanCard = {
  id: PlanId | "weekly" | "daily";
  title: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  tenantLimit?: number;
  badge?: string;
  tone: string;
  features: string[];
  valueLine: string;
  free?: boolean;
};

type PaidPlanCard = PlanCard & {
  id: PlanId;
  free?: false;
};

const PLAN_CARDS: PlanCard[] = [
  {
    id: "starter",
    title: "Starter",
    monthlyPrice: 999,
    yearlyPrice: 9990,
    tenantLimit: 50,
    tone: "border-white/10 bg-[linear-gradient(180deg,#111827_0%,#0c1018_100%)]",
    valueLine: "Best for a single hostel with steady monthly residents.",
    features: [
      "50 monthly tenants billed",
      "1 hostel included",
      "Rent tracking and reminders",
      "Room and payment management",
      "Owner dashboard and billing support",
    ],
  },
  {
    id: "growth",
    title: "Growth",
    monthlyPrice: 1500,
    yearlyPrice: 15000,
    tenantLimit: 100,
    tone: "border-[color:color-mix(in_srgb,var(--brand)_40%,transparent)] bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_34%),linear-gradient(180deg,#0e1830_0%,#0c1018_100%)]",
    valueLine: "More room for a growing hostel without jumping straight to Pro.",
    features: [
      "100 monthly tenants billed",
      "Multi-floor growth support",
      "Everything in Starter",
      "More tenant headroom before overage",
      "Better fit for scaling occupancy",
    ],
  },
  {
    id: "pro",
    title: "Pro",
    monthlyPrice: 2000,
    yearlyPrice: 20000,
    tenantLimit: 150,
    badge: "Popular",
    tone: "border-[color:color-mix(in_srgb,var(--success)_36%,var(--brand)_64%)] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_50%),linear-gradient(180deg,#0e1a2e_0%,#0b101c_100%)] shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_32px_80px_rgba(37,99,235,0.2)]",
    valueLine: "Recommended for busy hostels that need smoother billing headroom.",
    features: [
      "150 monthly tenants billed",
      "Advanced usage room",
      "Everything in Growth",
      "Priority billing support",
      "Better fit before scale-level volume",
    ],
  },
  {
    id: "scale",
    title: "Scale",
    monthlyPrice: 3999,
    yearlyPrice: 39990,
    tenantLimit: 500,
    badge: "Enterprise",
    tone: "border-[#f59e0b]/35 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_54%),linear-gradient(180deg,#171208_0%,#0c1018_100%)]",
    valueLine: "For operators managing high volume and multiple active properties.",
    features: [
      "500 monthly tenants billed",
      "High-capacity billing coverage",
      "Everything in Pro",
      "Large hostel growth runway",
      "Best for portfolio-level expansion",
    ],
  },
  {
    id: "weekly",
    title: "Weekly",
    monthlyPrice: 0,
    free: true,
    badge: "Free",
    tone: "border-[#22c55e]/25 bg-[linear-gradient(180deg,rgba(34,197,94,0.12)_0%,rgba(15,23,42,0.95)_100%)]",
    valueLine: "Weekly tenants add value without increasing your plan bill.",
    features: [
      "Always billed at Rs 0 in plans",
      "Weekly stays do not consume monthly tenant quota",
      "Useful for short-term stays",
      "Visible in owner billing usage",
    ],
  },
  {
    id: "daily",
    title: "Daily",
    monthlyPrice: 0,
    free: true,
    badge: "Free",
    tone: "border-[#38bdf8]/25 bg-[linear-gradient(180deg,rgba(56,189,248,0.12)_0%,rgba(15,23,42,0.95)_100%)]",
    valueLine: "Daily stays are free in billing and show extra value on the pricing page.",
    features: [
      "Always billed at Rs 0 in plans",
      "Daily stays do not consume monthly tenant quota",
      "Good for transient bookings",
      "Tracked separately in usage summary",
    ],
  },
];

const PLAN_ORDER: PlanId[] = ["starter", "growth", "pro", "scale"];
const PAID_PLAN_CARDS: PaidPlanCard[] = PLAN_CARDS.filter(
  (plan): plan is PaidPlanCard => !plan.free && PLAN_ORDER.includes(plan.id as PlanId),
);

function getPlanLabel(planId: PlanId) {
  return PAID_PLAN_CARDS.find((plan) => plan.id === planId)?.title ?? planId;
}

function getPlanDirection(currentPlanId: PlanId, requestedPlanId: PlanId) {
  return PLAN_ORDER.indexOf(requestedPlanId) > PLAN_ORDER.indexOf(currentPlanId) ? "upgrade" : "downgrade";
}

export default function OwnerBillingPage() {
  const { currentHostel, loading: hostelLoading } = useHostelContext();
  const [data, setData] = useState<OwnerBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestingPlanId, setRequestingPlanId] = useState<PlanId | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(null);

  const load = useCallback(async () => {
    if (!currentHostel?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    const { response, data } = await fetchOwnerBilling(currentHostel.id);
    if (!response.ok) {
      setError(data.message ?? "Unable to load billing.");
      setLoading(false);
      return;
    }
    setData(data);
    setLoading(false);
  }, [currentHostel?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPlan = useMemo(
    () => PAID_PLAN_CARDS.find((plan) => plan.id === selectedPlanId) ?? null,
    [selectedPlanId],
  );

  if (hostelLoading || loading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return (
      <div className="rounded-[10px] border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
        {error || "Unable to load pricing."}
      </div>
    );
  }

  const currentPlanLabel = getPlanLabel(data.planId);
  const selectedDirection =
    selectedPlan && selectedPlan.id !== data.planId ? getPlanDirection(data.planId, selectedPlan.id) : null;

  const handleChoosePlan = async () => {
    if (!selectedPlan || !currentHostel?.id) {
      return;
    }

    setRequestingPlanId(selectedPlan.id);
    setError("");
    const { response, data: responseData } = await requestOwnerPlanUpgrade(currentHostel.id, data.planId, selectedPlan.id);
    if (!response.ok) {
      setError(responseData.message ?? "Unable to send plan request.");
      setRequestingPlanId(null);
      return;
    }

    setSelectedPlanId(null);
    setRequestingPlanId(null);
    await load();
  };

  return (
    <div className="space-y-4 text-white">
      <OwnerPageHero
        eyebrow="Billing"
        title="Plans and pricing"
        description="Choose the right monthly plan, see the free daily and weekly value, and send upgrade or downgrade requests for super-admin approval."
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.14)] px-3 py-1 text-[11px] font-semibold text-[var(--accent-electric)]">
            <Wallet className="h-3.5 w-3.5" />
            Billed per month
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold text-white/70">
              <Crown className="h-3.5 w-3.5 text-[#fbbf24]" />
              Current plan: {currentPlanLabel}
            </span>
            {data.upgradePending ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#f59e0b]/35 bg-[#f59e0b]/10 px-3 py-1 text-[11px] font-semibold text-[#fbbf24]">
                <Clock3 className="h-3.5 w-3.5" />
                Request pending approval
              </span>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <OwnerQuickStat label="Billed per month" value={`Rs ${data.payableAmount.toLocaleString("en-IN")}`} helper={`Current plan: ${currentPlanLabel}`} />
        <OwnerQuickStat label="Monthly tenants" value={String(data.billing.billableTenantCount)} helper="Counted toward plan billing" />
        <OwnerQuickStat label="Weekly free" value={String(data.weeklyTenantCount)} helper="Shown for value, not billed" />
        <OwnerQuickStat label="Daily free" value={String(data.dailyTenantCount)} helper="Shown for value, not billed" />
      </div>

      <Card className="rounded-[18px] p-4">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Current billing summary</p>
            <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
              <div>
                <p className="text-3xl font-semibold tracking-[-0.04em] text-white">Rs {data.payableAmount.toLocaleString("en-IN")}</p>
                <p className="text-[11px] text-[color:var(--fg-secondary)]">This is billed per month for {data.hostelName}.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold text-white/70">
                Due by {data.dueDate}
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <InlineMetric label="Base tenants" value={String(data.billing.billableTenantCount)} />
              <InlineMetric label="Extra tenants" value={String(data.billing.extraTenants)} />
              <InlineMetric label="Extra charges" value={`Rs ${data.billing.extraCharges.toLocaleString("en-IN")}`} />
            </div>
          </div>

          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Plan change rules</p>
            <div className="mt-3 space-y-2 text-sm text-[color:var(--fg-secondary)]">
              <p>Upgrades and downgrades both go as approval requests to super admin.</p>
              <p>Until they approve, your current access stays active on the current plan.</p>
              <p>Weekly and daily tenants always stay free and never increase the monthly plan bill.</p>
            </div>
          </div>
        </div>
      </Card>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PLAN_CARDS.map((plan) => {
          const isCurrent = plan.id === data.planId;
          const isSelected = selectedPlanId === plan.id;
          const isBusy = requestingPlanId === plan.id;
          const direction = !plan.free && plan.id !== data.planId ? getPlanDirection(data.planId, plan.id as PlanId) : null;

          return (
            <Card key={plan.id} className={cn("relative flex h-full flex-col rounded-[20px] p-4", plan.tone, isSelected ? "ring-2 ring-[rgba(99,102,241,0.35)]" : "")}>
              {plan.badge ? (
                <span className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/75">
                  {plan.badge}
                </span>
              ) : null}

              <div className="pr-16">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{plan.title}</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                  {plan.free ? "Free" : `Rs ${plan.monthlyPrice.toLocaleString("en-IN")}`}
                </p>
                <p className="mt-1 text-[11px] text-[color:var(--fg-secondary)]">
                  {plan.free ? "Always included" : `Billed per month${plan.yearlyPrice ? ` • Rs ${plan.yearlyPrice.toLocaleString("en-IN")}/year` : ""}`}
                </p>
              </div>

              <div className="mt-4 rounded-[14px] border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[11px] font-semibold text-white">{plan.valueLine}</p>
                <p className="mt-1 text-[11px] text-[color:var(--fg-secondary)]">
                  {plan.tenantLimit ? `${plan.tenantLimit} monthly tenants included in this plan.` : "Pure value add. No plan billing impact."}
                </p>
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[12px] text-white/70">
                    <span className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-[#4ade80]/35 bg-[#22c55e]/12">
                      <Check className="h-2.5 w-2.5 text-[#4ade80]" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-4">
                {plan.free ? (
                  <div className="rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/10 px-3 py-2.5 text-sm font-semibold text-[#86efac]">
                    Included free
                  </div>
                ) : isCurrent ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-white/70">
                    Current plan
                  </div>
                ) : (
                  <Button
                    variant={isSelected ? "primary" : "secondary"}
                    className="w-full"
                    disabled={data.upgradePending || isBusy}
                    onClick={() => setSelectedPlanId(plan.id as PlanId)}
                  >
                    {isBusy ? "Sending..." : direction === "upgrade" ? `Choose ${plan.title}` : `Downgrade to ${plan.title}`}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </section>

      {selectedPlan && selectedDirection ? (
        <Card className="rounded-[20px] border border-[rgba(99,102,241,0.24)] bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_40%),linear-gradient(180deg,#111827_0%,#0d1322_100%)] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg-secondary)]">
                {selectedDirection === "upgrade" ? "Upgrade request" : "Downgrade request"}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-white">
                {selectedDirection === "upgrade"
                  ? `Move from ${currentPlanLabel} to ${selectedPlan.title}`
                  : `Request downgrade from ${currentPlanLabel} to ${selectedPlan.title}`}
              </h3>
              <p className="mt-2 text-sm text-[color:var(--fg-secondary)]">
                {selectedDirection === "upgrade"
                  ? `You will ask super admin to enable ${selectedPlan.title}. Once approved, your hostel will be billed Rs ${selectedPlan.monthlyPrice.toLocaleString("en-IN")} per month on that plan.`
                  : `You are requesting a downgrade to ${selectedPlan.title}. Super admin will review it before changing access and monthly billing.`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setSelectedPlanId(null)}>
                Cancel
              </Button>
              <Button disabled={requestingPlanId !== null || data.upgradePending} onClick={handleChoosePlan}>
                {selectedDirection === "upgrade" ? "Ok, send upgrade request" : "Yes, send downgrade request"}
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="h-4 w-4 text-[#38bdf8]" />
                <p className="text-sm font-semibold">Benefits you get</p>
              </div>
              <ul className="mt-3 space-y-2">
                {selectedPlan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[12px] text-[color:var(--fg-secondary)]">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#4ade80]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="flex items-center gap-2 text-white">
                <ArrowRightLeft className="h-4 w-4 text-[#fbbf24]" />
                <p className="text-sm font-semibold">What happens next</p>
              </div>
              <ul className="mt-3 space-y-2 text-[12px] text-[color:var(--fg-secondary)]">
                <li className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#38bdf8]" />
                  Super admin receives your request in their approval queue.
                </li>
                <li className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#38bdf8]" />
                  Your current plan remains active until the request is approved.
                </li>
                <li className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#38bdf8]" />
                  After approval, billing will follow the chosen plan amount per month.
                </li>
              </ul>
            </div>
          </div>
        </Card>
      ) : null}

      {data.upgradePending ? (
        <Card className="rounded-[18px] border border-[#f59e0b]/20 bg-[#f59e0b]/[0.05] p-4">
          <p className="text-sm font-semibold text-[#fbbf24]">Request sent. Waiting for super-admin approval.</p>
          <p className="mt-1 text-[12px] text-[color:var(--fg-secondary)]">
            Your access stays on the current plan until the request is approved. Super admin will see this request in their queue.
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-white/10 bg-white/[0.03] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-32 rounded-[18px]" />
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-24 rounded-[18px]" />
        ))}
      </div>
      <SkeletonBlock className="h-40 rounded-[18px]" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-80 rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}
