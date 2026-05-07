
"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { PricingCarousel } from "@/components/ui/pricing-carousel";
import {
  fetchOwnerBilling,
  requestOwnerPlanUpgrade,
  type OwnerBillingData,
} from "@/services/owner/owner-billing.service";
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

    if (!currentHostel?.id) {
      setData(null);
      setError("");
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    setError("");

    (async () => {
      const billingResponse = await fetchOwnerBilling(currentHostel.id);
      if (!active) return;

      if (!billingResponse.response.ok) {
        setError(billingResponse.data.message ?? "Unable to load billing.");
        setLoading(false);
        return;
      }

      setData(billingResponse.data);
      setLoading(false);
    })();

    return () => { active = false; };
  }, [currentHostel]);

  if (hostelLoading || loading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return (
      <div
        role="alert"
        className="rounded-[10px] border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300"
      >
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

    const { response, data: responseData } = await requestOwnerPlanUpgrade(
      currentHostel.id,
      data.planId,
      planId,
    );
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

  const hasExtraCharges =
    data.billing.extraCharges > 0 || (data.billing.hostelExtraCharges ?? 0) > 0;

  return (
    <div className="space-y-3 text-white">
      {/* Compact status strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-0.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[12px] font-semibold text-white">
          {currentPlanLabel}
        </span>
        <span className="text-[12px] text-white/50">
          Rs {data.payableAmount.toLocaleString("en-IN")}/mo
        </span>
        <span className="text-white/20">·</span>
        <span className="text-[12px] text-white/50">{trialDaysLeft}d to billing</span>
      </div>

      {/* Plan cards — front and center */}
      <PricingCarousel
        currentPlanId={data.planId}
        onSelect={handlePlanRequest}
        submittingPlanId={requestingPlanId}
        tenantCount={data.billing.tenantCount}
        tenantLimit={data.billing.planLimit}
        totalBilled={data.payableAmount}
      />

      {/* Pending upgrade notice */}
      {data.upgradePending ? (
        <div className="rounded-[14px] border border-[#f59e0b]/20 bg-[#f59e0b]/[0.05] px-4 py-3">
          <p className="text-sm font-semibold text-[#fbbf24]">
            Plan request sent — waiting for approval.
          </p>
          <p className="mt-0.5 text-[12px] text-white/45">
            Your current access stays active until super admin approves.
          </p>
        </div>
      ) : null}

      {/* Limit warning — only when >= 80% */}
      <UpgradeHook data={data} currentPlanLabel={currentPlanLabel} />

      {/* Extra charges — only when non-zero */}
      {hasExtraCharges ? (
        <div className="rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Extra usage charges
          </p>
          {data.billing.extraCharges > 0 ? (
            <p className="text-[12px] text-white/65">
              {data.billing.extraTenants} extra tenants →{" "}
              <span className="font-semibold text-white">
                Rs {data.billing.extraCharges.toLocaleString("en-IN")}
              </span>
            </p>
          ) : null}
          {(data.billing.hostelExtraCharges ?? 0) > 0 ? (
            <p className="text-[12px] text-white/65">
              {data.billing.extraHostels ?? 0} extra hostels →{" "}
              <span className="font-semibold text-white">
                Rs {(data.billing.hostelExtraCharges ?? 0).toLocaleString("en-IN")}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[14px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function UpgradeHook({
  data,
  currentPlanLabel,
}: {
  data: OwnerBillingData;
  currentPlanLabel: string;
}) {
  const tenantPct =
    data.billing.planLimit && data.billing.tenantCount
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
    <div className="rounded-[14px] border border-[#f59e0b]/25 bg-[rgba(245,158,11,0.06)] p-3">
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
          <p className="mt-1 text-[12px] text-white/50">
            {showTenantWarning
              ? `Used ${data.billing.tenantCount} of ${data.billing.planLimit} on ${currentPlanLabel}. `
              : ""}
            {showHostelWarning ? `${hostelCount} of ${hostelLimit} hostel slots filled. ` : ""}
            {isOnMaxPlan
              ? "Extra usage billed at Rs 5/tenant and Rs 199/hostel per month."
              : "Upgrade your plan for a higher limit."}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-10 w-64 rounded-full" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-96 w-[260px] shrink-0 rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}
