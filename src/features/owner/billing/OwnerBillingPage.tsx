"use client";

import { useEffect, useState } from "react";
import { Clock3, Crown, Sparkles, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { OwnerPageHero, OwnerQuickStat } from "@/components/ui/owner-page";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { PricingCarousel } from "@/components/ui/pricing-carousel";
import { fetchOwnerBilling, requestOwnerPlanUpgrade, type OwnerBillingData } from "@/services/owner/owner-billing.service";
import { useHostelContext } from "@/store/hostel-context";
import { getPlanLabel, type PlanId } from "@/config/pricing";

export default function OwnerBillingPage() {
  const { currentHostel, loading: hostelLoading } = useHostelContext();
  const [data, setData] = useState<OwnerBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestingPlanId, setRequestingPlanId] = useState<PlanId | null>(null);
  const [billingClock] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    queueMicrotask(async () => {
      if (!currentHostel?.id) {
        if (!active) return;
        setData(null);
        setError("");
        setLoading(false);
        return;
      }

      if (active) {
        setLoading(true);
        setError("");
      }

      const billingResponse = await fetchOwnerBilling(currentHostel.id);
      if (!active) return;

      if (!billingResponse.response.ok) {
        setError(billingResponse.data.message ?? "Unable to load billing.");
        setLoading(false);
        return;
      }

      setData(billingResponse.data);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [currentHostel]);

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
  const trialDaysLeft = Math.max(
    0,
    Math.ceil((new Date(data.dueDate).getTime() - billingClock) / (1000 * 60 * 60 * 24)),
  );

  const handlePlanRequest = async (planId: PlanId) => {
    if (!currentHostel?.id) return;

    setRequestingPlanId(planId);
    setError("");

    const { response, data: responseData } = await requestOwnerPlanUpgrade(currentHostel.id, data.planId, planId);
    if (!response.ok) {
      setError(responseData.message ?? "Unable to send request.");
      setRequestingPlanId(null);
      return;
    }

    setRequestingPlanId(null);
    setLoading(true);
    setError("");
    const billingResponse = await fetchOwnerBilling(currentHostel.id);
    if (!billingResponse.response.ok) {
      setError(billingResponse.data.message ?? "Unable to load billing.");
      setLoading(false);
      return;
    }
    setData(billingResponse.data);
    setLoading(false);
  };

  return (
    <div className="space-y-3 text-white">
      <OwnerPageHero
        eyebrow="Billing"
        title="Plans and pricing"
        description="Choose the right package for your hostel. Weekly and daily stays are always free, and extra hostels are billed separately after each plan's included count."
        className="p-4"
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

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <OwnerQuickStat label="Billed per month" value={`Rs ${data.payableAmount.toLocaleString("en-IN")}`} helper="Current recurring billing amount" className="px-3 py-2.5" />
        <OwnerQuickStat label="Monthly tenants" value={String(data.monthlyTenantCount)} helper="These count toward your plan limit" className="px-3 py-2.5" />
        <OwnerQuickStat label="Weekly free" value={String(data.weeklyTenantCount)} helper="Tracked, never billed" className="px-3 py-2.5" />
        <OwnerQuickStat label="Daily free" value={String(data.dailyTenantCount)} helper="Tracked, never billed" className="px-3 py-2.5" />
      </div>

      <Card className="rounded-[18px] p-3">
        <div className="grid gap-2.5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">Current billing summary</p>
            <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
              <div>
                <p className="text-2xl font-semibold tracking-[-0.04em] text-white">Rs {data.payableAmount.toLocaleString("en-IN")}</p>
                <p className="text-[11px] text-[color:var(--fg-secondary)]">This is billed per month for {data.hostelName}.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold text-white/70">
                Due by {data.dueDate}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <UsageMetric label="Monthly counted" value={String(data.billing.billableTenantCount)} />
              <UsageMetric label="Extra tenants" value={String(data.billing.extraTenants)} />
              <UsageMetric label="Tenant overages" value={`Rs ${data.billing.extraCharges.toLocaleString("en-IN")}`} />
              <UsageMetric label="Hostels" value={`${data.billing.hostelCount ?? 0} / ${data.billing.hostelLimit ?? 1}`} />
              <UsageMetric label="Extra hostels" value={String(data.billing.extraHostels ?? 0)} />
              <UsageMetric label="Hostel overages" value={`Rs ${(data.billing.hostelExtraCharges ?? 0).toLocaleString("en-IN")}`} />
            </div>
          </div>

          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--fg-secondary)]">How plan changes work</p>
            <div className="mt-2 grid gap-2 text-[11px] text-[color:var(--fg-secondary)]">
              <CompactInfoPill text="Super admin approves upgrades and downgrades." />
              <CompactInfoPill text="Your current plan stays active until approval." />
              <CompactInfoPill text="Weekly and daily tenants always stay free." />
            </div>
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

      <UpgradeHook data={data} currentPlanLabel={currentPlanLabel} />

      <PricingCarousel
        currentPlanId={data.planId}
        onSelect={handlePlanRequest}
        submittingPlanId={requestingPlanId}
      />
    </div>
  );
}

function UpgradeHook({ data, currentPlanLabel }: { data: OwnerBillingData; currentPlanLabel: string }) {
  const tenantPct = data.billing.planLimit && data.billing.tenantCount
    ? Math.round((data.billing.tenantCount / data.billing.planLimit) * 100)
    : 0;
  const hostelCount = data.billing.hostelCount ?? 0;
  const hostelLimit = data.billing.hostelLimit ?? 1;
  const hostelPct = hostelLimit > 0 ? Math.round((hostelCount / hostelLimit) * 100) : 0;

  const showTenantWarning = tenantPct >= 80;
  const showHostelWarning = hostelPct >= 80;
  const isOnMaxPlan = data.planId === "pro";

  if (!showTenantWarning && !showHostelWarning) return null;

  return (
    <div className="rounded-[18px] border border-[#f59e0b]/25 bg-[rgba(245,158,11,0.06)] p-3">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#fbbf24]" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#fbbf24]">
            {showTenantWarning && showHostelWarning
              ? "Approaching tenant and hostel limits"
              : showTenantWarning
                ? "Approaching tenant limit"
                : "Approaching hostel limit"}
          </p>
          <p className="mt-1 text-[12px] text-[color:var(--fg-secondary)]">
            {showTenantWarning
              ? `You've used ${data.billing.tenantCount} of your ${data.billing.planLimit}-tenant limit on ${currentPlanLabel}. `
              : ""}
            {showHostelWarning
              ? `You have ${hostelCount} of ${hostelLimit} hostel slots filled. `
              : ""}
            {isOnMaxPlan
              ? "Extra usage is billed at Rs 5/tenant and Rs 199/hostel per month."
              : "Upgrade for a higher limit or pay per extra usage."}
          </p>
          {!isOnMaxPlan ? (
            <p className="mt-1.5 text-[11px] font-medium text-[#fbbf24]">
              See the plans below to upgrade
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UsageMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-secondary)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function CompactInfoPill({ text }: { text: string }) {
  return <div className="rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-2">{text}</div>;
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
