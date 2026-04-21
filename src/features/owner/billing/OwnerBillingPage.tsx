"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Check, Clock3, Crown, Info, Sparkles, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OwnerPageHero, OwnerQuickStat } from "@/components/ui/owner-page";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { fetchOwnerBilling, requestOwnerPlanUpgrade, type OwnerBillingData } from "@/services/owner/owner-billing.service";
import { useHostelContext } from "@/store/hostel-context";
import { cn } from "@/utils/cn";

type PlanId = "starter" | "growth" | "pro" | "scale";

type PlanCard = {
  id: PlanId | "founding";
  title: string;
  monthlyPrice: number;
  yearlyPrice: number;
  tenantLimit: number;
  badge?: string;
  tone: string;
  valueLine: string;
  features: string[];
};

const PLAN_ORDER: PlanId[] = ["starter", "growth", "pro", "scale"];
const FOUNDING_OFFER_SLOTS = 15;
const FOUNDING_SLOTS_REMAINING = 8;

const PLANS: PlanCard[] = [
  {
    id: "starter",
    title: "Starter",
    monthlyPrice: 999,
    yearlyPrice: 9990,
    tenantLimit: 50,
    tone: "border-white/10 bg-[linear-gradient(180deg,#111827_0%,#0c1018_100%)]",
    valueLine: "Good for a single property with stable monthly occupancy.",
    features: [
      "50 monthly tenants included",
      "1 hostel",
      "Rent tracking and reminders",
      "Room management",
      "Payment history",
    ],
  },
  {
    id: "pro",
    title: "Pro",
    monthlyPrice: 2000,
    yearlyPrice: 20000,
    tenantLimit: 150,
    badge: "Most Popular",
    tone:
      "border-[color:color-mix(in_srgb,var(--success)_40%,var(--brand)_60%)] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_50%),linear-gradient(180deg,#0e1a2e_0%,#0b101c_100%)] shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_32px_80px_rgba(37,99,235,0.2)]",
    valueLine: "Better headroom for busy hostels that want smoother scaling.",
    features: [
      "150 monthly tenants included",
      "Priority support",
      "Everything in Starter",
      "Advanced reports",
      "Higher occupancy headroom",
    ],
  },
  {
    id: "founding",
    title: "Founding",
    monthlyPrice: 499,
    yearlyPrice: 4990,
    tenantLimit: 200,
    badge: "Founding",
    tone:
      "border-[#f59e0b]/40 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_50%),linear-gradient(180deg,#151208_0%,#0c1018_100%)] ring-1 ring-[#f59e0b]/20",
    valueLine: "Founder pricing with more room before you ever need a bigger plan.",
    features: [
      "200 monthly tenants included",
      "2 hostels",
      "All Pro features",
      "First month free",
      "Founder priority support",
    ],
  },
];

function mapRequestedPlanId(planId: PlanCard["id"]): PlanId {
  if (planId === "founding") {
    return "scale";
  }
  return planId;
}

function getDirection(currentPlanId: PlanId, nextPlanId: PlanId) {
  return PLAN_ORDER.indexOf(nextPlanId) > PLAN_ORDER.indexOf(currentPlanId) ? "upgrade" : "downgrade";
}

function getCurrentPlanLabel(planId: PlanId) {
  if (planId === "scale") {
    return "Founding / Scale";
  }
  const plan = PLANS.find((item) => item.id === planId);
  return plan?.title ?? planId;
}

export default function OwnerBillingPage() {
  const { currentHostel, loading: hostelLoading } = useHostelContext();
  const [data, setData] = useState<OwnerBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestingPlanId, setRequestingPlanId] = useState<PlanCard["id"] | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanCard["id"] | null>(null);

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
    () => PLANS.find((plan) => plan.id === selectedPlanId) ?? null,
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

  const currentPlanLabel = getCurrentPlanLabel(data.planId);
  const trialDaysLeft = Math.max(
    0,
    Math.ceil((new Date(data.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
  const selectedRequestedPlanId = selectedPlan ? mapRequestedPlanId(selectedPlan.id) : null;
  const selectedDirection =
    selectedRequestedPlanId && selectedRequestedPlanId !== data.planId
      ? getDirection(data.planId, selectedRequestedPlanId)
      : null;

  const handlePlanRequest = async () => {
    if (!selectedPlan || !currentHostel?.id) return;

    const requestedPlanId = mapRequestedPlanId(selectedPlan.id);
    setRequestingPlanId(selectedPlan.id);
    setError("");

    const { response, data: responseData } = await requestOwnerPlanUpgrade(currentHostel.id, data.planId, requestedPlanId);
    if (!response.ok) {
      setError(responseData.message ?? "Unable to send request.");
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
        description="Choose the right monthly package for your hostel. Weekly and daily stays are always free and included as extra value inside every plan."
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.14)] px-3 py-1 text-[11px] font-semibold text-[var(--accent-electric)]">
            <Wallet className="h-3.5 w-3.5" />
            Billed per month
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold text-white/70">
              <Clock3 className="h-3.5 w-3.5 text-[#38bdf8]" />
              {trialDaysLeft}d to billing
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold text-white/70">
              <Crown className="h-3.5 w-3.5 text-[#fbbf24]" />
              Current plan: {currentPlanLabel}
            </span>
          </div>
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <OwnerQuickStat label="Billed per month" value={`Rs ${data.payableAmount.toLocaleString("en-IN")}`} helper="Current recurring billing amount" />
        <OwnerQuickStat label="Monthly tenants" value={String(data.monthlyTenantCount)} helper="These count toward your plan limit" />
        <OwnerQuickStat label="Weekly free" value={String(data.weeklyTenantCount)} helper="Tracked, but never billed" />
        <OwnerQuickStat label="Daily free" value={String(data.dailyTenantCount)} helper="Tracked, but never billed" />
      </div>

      <Card className="rounded-[18px] p-4">
        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
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
              <UsageMetric label="Monthly counted" value={String(data.billing.billableTenantCount)} />
              <UsageMetric label="Extra tenants" value={String(data.billing.extraTenants)} />
              <UsageMetric label="Extra charges" value={`Rs ${data.billing.extraCharges.toLocaleString("en-IN")}`} />
            </div>
          </div>

          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">How plan changes work</p>
            <ul className="mt-3 space-y-2 text-sm text-[color:var(--fg-secondary)]">
              <li>Upgrades and downgrades both go to super admin for approval.</li>
              <li>Your current plan stays active until they approve the request.</li>
              <li>Weekly and daily tenants always remain free in every plan.</li>
            </ul>
          </div>
        </div>
      </Card>

      {data.upgradePending ? (
        <Card className="rounded-[18px] border border-[#f59e0b]/20 bg-[#f59e0b]/[0.05] p-4">
          <p className="text-sm font-semibold text-[#fbbf24]">Plan request sent. Waiting for super-admin approval.</p>
          <p className="mt-1 text-[12px] text-[color:var(--fg-secondary)]">
            Your current access stays active until super admin approves or rejects this request.
          </p>
        </Card>
      ) : null}

      {error ? (
        <Card className="rounded-[18px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const requestedPlanId = mapRequestedPlanId(plan.id);
          const isCurrentPlan = requestedPlanId === data.planId;
          const isSelected = selectedPlanId === plan.id;
          const isBusy = requestingPlanId === plan.id;
          const direction = getDirection(data.planId, requestedPlanId);

          return (
            <article
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-[20px] border p-4 transition",
                plan.tone,
                isSelected ? "ring-2 ring-[rgba(99,102,241,0.34)]" : "",
              )}
            >
              {plan.badge ? (
                <div
                  className={cn(
                    "absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)]",
                    plan.id === "founding"
                      ? "border border-[#f59e0b]/50 bg-[linear-gradient(90deg,#b45309_0%,#d97706_100%)]"
                      : "border border-[#38bdf8]/50 bg-[linear-gradient(90deg,#1d4ed8_0%,#2563eb_100%)]",
                  )}
                >
                  {plan.id === "founding" ? "Founding" : plan.badge}
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", plan.id === "founding" ? "text-[#fbbf24]" : "text-white/70")}>
                    {plan.title}
                  </p>
                  {isCurrentPlan ? (
                    <span className="mt-1 inline-block rounded-full border border-[#4ade80] bg-[#22c55e]/20 px-2 py-0.5 text-[9px] font-semibold uppercase text-[#4ade80]">
                      Current
                    </span>
                  ) : null}
                </div>
                <TenantUsageBar used={data.monthlyTenantCount} limit={plan.tenantLimit} isCurrent={isCurrentPlan} />
              </div>

              <div className="mt-3 flex items-end gap-1.5">
                <span className="text-3xl font-semibold leading-none tracking-[-0.04em] text-white">
                  Rs {plan.monthlyPrice.toLocaleString("en-IN")}
                </span>
                <span className="mb-0.5 text-xs text-white/40">/mo</span>
              </div>

              <p className={cn("mt-0.5 text-[10px]", plan.id === "founding" ? "text-[#fbbf24]/55" : "text-white/30")}>
                {plan.id === "founding"
                  ? `First month free • ${FOUNDING_SLOTS_REMAINING}/${FOUNDING_OFFER_SLOTS} slots left`
                  : `Rs ${plan.yearlyPrice.toLocaleString("en-IN")}/yr • save 2 months`}
              </p>

              <div className="mt-4 rounded-[14px] border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[11px] font-semibold text-white">{plan.valueLine}</p>
                <p className="mt-1 text-[11px] text-[color:var(--fg-secondary)]">
                  {plan.tenantLimit} monthly tenants are included before any extra monthly billing applies.
                </p>
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[12px] text-white/70">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border",
                        plan.id === "founding" ? "border-[#f59e0b]/40 bg-[#f59e0b]/12" : "border-[#4ade80]/35 bg-[#22c55e]/12",
                      )}
                    >
                      <Check className={cn("h-2.5 w-2.5", plan.id === "founding" ? "text-[#fbbf24]" : "text-[#4ade80]")} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-[14px] border border-[#22c55e]/20 bg-[#22c55e]/[0.05] px-3 py-3">
                <p className="text-[11px] font-semibold text-[#86efac]">Free value included in this package</p>
                <div className="mt-2 space-y-2">
                  <FreeValueRow label="Weekly free" detail={`Weekly stays stay free in this plan. Current weekly tenants: ${data.weeklyTenantCount}.`} />
                  <FreeValueRow label="Daily free" detail={`Daily stays stay free in this plan. Current daily tenants: ${data.dailyTenantCount}.`} />
                </div>
              </div>

              <div className="mt-auto pt-4">
                {isCurrentPlan ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center text-sm font-semibold text-white/70">
                    Current plan
                  </div>
                ) : (
                  <Button
                    variant={isSelected ? "primary" : "secondary"}
                    className="w-full"
                    disabled={data.upgradePending || isBusy}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <Zap className="mr-1.5 h-3.5 w-3.5" />
                    {isBusy ? "Sending..." : direction === "upgrade" ? `Choose ${plan.title}` : `Downgrade to ${plan.title}`}
                  </Button>
                )}
              </div>
            </article>
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
                  ? `Once super admin approves, this hostel will be billed Rs ${selectedPlan.monthlyPrice.toLocaleString("en-IN")} per month on ${selectedPlan.title}.`
                  : `This sends a downgrade request to super admin. Your current plan remains active until they approve it.`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setSelectedPlanId(null)}>
                Cancel
              </Button>
              <Button disabled={requestingPlanId !== null || data.upgradePending} onClick={handlePlanRequest}>
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
                  Super admin receives your request in the approval queue.
                </li>
                <li className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#38bdf8]" />
                  Your current access stays active until they approve or reject it.
                </li>
                <li className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#38bdf8]" />
                  Weekly and daily tenants remain free regardless of the package selected.
                </li>
              </ul>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function UsageMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-white/10 bg-white/[0.03] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function FreeValueRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#86efac]">{label}</p>
      <p className="mt-1 text-[11px] text-white/65">{detail}</p>
    </div>
  );
}

function TenantUsageBar({
  used,
  limit,
  isCurrent,
}: {
  used: number;
  limit: number;
  isCurrent: boolean;
}) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const left = limit - used;
  const isFull = used >= limit;
  const isWarning = pct >= 80;
  const barColor = isFull ? "bg-red-500" : isWarning ? "bg-amber-400" : "bg-[#4ade80]";

  return (
    <div className="w-[96px] flex-shrink-0">
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="text-[9px] font-medium text-white/45">{used}/{limit}</span>
        {isFull ? (
          <span className="text-[9px] font-bold text-red-400">Full</span>
        ) : (
          <span className="text-[9px] text-white/35">{left} left</span>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 text-[8px] text-white/20">Only monthly tenants count</p>
      {isFull && isCurrent ? (
        <p className="mt-0.5 text-[9px] font-semibold text-amber-400">Upgrade for more</p>
      ) : null}
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
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-96 rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}
