"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { PricingCarousel } from "@/components/ui/pricing-carousel";
import { FormField } from "@/components/ui/form/field";
import { TextInput } from "@/components/ui/form/text-input";
import {
  fetchOwnerBilling,
  requestOwnerPlanUpgrade,
  submitOwnerPaymentProof,
  type OwnerBillingData,
} from "@/services/owner/owner-billing.service";
import { useHostelContext } from "@/store/hostel-context";
import { getPlanLabel, type PlanId } from "@/config/pricing";

const inr = (n: number) => `Rs ${n.toLocaleString("en-IN")}`;

export default function OwnerBillingPage() {
  const { currentHostel, loading: hostelLoading } = useHostelContext();
  const [data, setData] = useState<OwnerBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestingPlanId, setRequestingPlanId] = useState<PlanId | null>(null);
  const [billingClock] = useState(() => Date.now());

  const reload = async (hostelId: string) => {
    setLoading(true);
    setError("");
    const billingResponse = await fetchOwnerBilling(hostelId);
    if (!billingResponse.response.ok) {
      setError(billingResponse.data.message ?? "Unable to load billing.");
      setLoading(false);
      return;
    }
    setData(billingResponse.data);
    setLoading(false);
  };

  /* eslint-disable react-hooks/set-state-in-effect */
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
  /* eslint-enable react-hooks/set-state-in-effect */

  if (hostelLoading || loading) return <LoadingState />;

  if (error || !data) {
    return (
      <div role="alert" className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-5 py-4 text-sm text-[color:var(--error)]">
        {error || "Unable to load pricing."}
      </div>
    );
  }

  const currentPlanLabel = getPlanLabel(data.planId);
  const trialDaysLeft =
    data.dueDate && !Number.isNaN(new Date(data.dueDate).getTime())
      ? Math.max(0, Math.ceil((new Date(data.dueDate).getTime() - billingClock) / (1000 * 60 * 60 * 24)))
      : null;

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
    await reload(currentHostel.id);
  };

  const hasExtraCharges = data.billing.extraCharges > 0 || (data.billing.hostelExtraCharges ?? 0) > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Status strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-0.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-soft)] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--fg-primary)]">
          {currentPlanLabel}
        </span>
        <span className="text-[12px] text-[color:var(--fg-secondary)]">{inr(data.payableAmount)}/mo</span>
        {trialDaysLeft !== null && (
          <>
            <span className="text-[color:var(--fg-tertiary)]">·</span>
            <span className="text-[12px] text-[color:var(--fg-secondary)]">{trialDaysLeft}d to billing</span>
          </>
        )}
      </div>

      {data.payableAmount > 0 && (
        <InvoicePaymentSection data={data} onProofSubmitted={() => currentHostel?.id && void reload(currentHostel.id)} />
      )}

      <PricingCarousel
        currentPlanId={data.planId}
        onSelect={handlePlanRequest}
        submittingPlanId={requestingPlanId}
        tenantCount={data.billing.tenantCount}
        tenantLimit={data.billing.planLimit}
        totalBilled={data.payableAmount}
      />

      {data.upgradePending ? (
        <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--warning)_25%,transparent)] bg-[color:var(--warning-soft)] px-4 py-3">
          <p className="text-sm font-semibold text-[color:var(--warning)]">Plan request sent — waiting for approval.</p>
          <p className="mt-0.5 text-[12px] text-[color:var(--fg-secondary)]">Your current access stays active until super admin approves.</p>
        </div>
      ) : null}

      <UpgradeHook data={data} currentPlanLabel={currentPlanLabel} />

      {hasExtraCharges ? (
        <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-tertiary)]">Extra usage charges</p>
          {data.billing.extraCharges > 0 ? (
            <p className="text-[12px] text-[color:var(--fg-secondary)]">
              {data.billing.extraTenants} extra tenants → <span className="font-semibold text-[color:var(--fg-primary)]">{inr(data.billing.extraCharges)}</span>
            </p>
          ) : null}
          {(data.billing.hostelExtraCharges ?? 0) > 0 ? (
            <p className="text-[12px] text-[color:var(--fg-secondary)]">
              {data.billing.extraHostels ?? 0} extra hostels → <span className="font-semibold text-[color:var(--fg-primary)]">{inr(data.billing.hostelExtraCharges ?? 0)}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-4 py-3 text-sm text-[color:var(--error)]">{error}</div>
      ) : null}

      <TenantPortalPricing />
    </div>
  );
}

function TenantPortalPricing() {
  const tiers = [
    {
      name: "Basic", price: "Free", priceNote: "always",
      color: "border-[color:var(--border)] bg-[color:var(--surface-soft)]", badge: null,
      features: ["View payment history", "Download rent receipts", "View room assignment", "Contact hostel owner"],
    },
    {
      name: "Plus", price: "₹49", priceNote: "/ tenant / month",
      color: "border-[color:color-mix(in_srgb,var(--brand)_25%,transparent)] bg-[color:var(--brand-soft)]", badge: "Coming soon",
      features: ["Digital rent agreement storage", "Maintenance request submission", "Move-out notice filing", "Document uploads", "Payment reminders via SMS"],
    },
  ] as const;

  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:color-mix(in_srgb,var(--brand)_30%,transparent)] bg-[color:var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--accent)]">
          <Sparkles className="h-3 w-3" /> Tenant Portal
        </span>
        <span className="text-[11px] text-[color:var(--fg-tertiary)]">Give your tenants app access</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {tiers.map((tier) => (
          <div key={tier.name} className={`rounded-[var(--radius-md)] border p-3.5 ${tier.color}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-tertiary)]">Tenant</p>
                <p className="text-base font-bold text-[color:var(--fg-primary)]">{tier.name}</p>
              </div>
              {tier.badge ? (
                <span className="rounded-full border border-[color:color-mix(in_srgb,var(--brand)_30%,transparent)] bg-[color:var(--brand-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--accent)]">{tier.badge}</span>
              ) : null}
            </div>
            <div className="mt-1.5">
              <span className="text-lg font-bold text-[color:var(--fg-primary)]">{tier.price}</span>
              <span className="ml-1 text-[11px] text-[color:var(--fg-tertiary)]">{tier.priceNote}</span>
            </div>
            <ul className="mt-2.5 flex flex-col gap-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-[11px] text-[color:var(--fg-secondary)]">
                  <span className="mt-0.5 h-3 w-3 shrink-0 text-[color:var(--success)]">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[10px] text-[color:var(--fg-tertiary)]">Tenant portal pricing is separate from hostel owner plans · Billed per active tenant</p>
    </div>
  );
}

function InvoicePaymentSection({ data, onProofSubmitted }: { data: OwnerBillingData; onProofSubmitted: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [txnId, setTxnId] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const status = data.paymentStatus;
  const isPendingReview = status === "pending_review";
  const isRejected = status === "rejected";
  const isPaid = status === "paid";
  const canPay = status === "pending" || status === "rejected";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setScreenshotDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!txnId.trim() && !screenshotDataUrl) {
      setSubmitError("Provide transaction ID or payment screenshot.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    const { response } = await submitOwnerPaymentProof(data.hostelId, {
      txnId: txnId.trim() || undefined,
      screenshotDataUrl: screenshotDataUrl ?? undefined,
    });
    setSubmitting(false);
    if (!response.ok) {
      setSubmitError("Failed to submit. Please try again.");
      return;
    }
    setShowForm(false);
    setTxnId("");
    setScreenshotDataUrl(null);
    onProofSubmitted();
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--fg-tertiary)]">Invoice {data.monthKey}</p>

      {isPaid && (
        <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--success)_25%,transparent)] bg-[color:var(--success-soft)] px-4 py-3">
          <p className="text-sm font-semibold text-[color:var(--success)]">Paid ✓</p>
          <p className="mt-0.5 text-[12px] text-[color:var(--fg-secondary)]">This month&apos;s invoice is settled.</p>
        </div>
      )}

      {isPendingReview && (
        <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--warning)_25%,transparent)] bg-[color:var(--warning-soft)] px-4 py-3">
          <p className="text-sm font-semibold text-[color:var(--warning)]">Under review — awaiting admin approval.</p>
          {data.proof?.txnId ? <p className="mt-0.5 text-[12px] text-[color:var(--fg-secondary)]">Txn ID: {data.proof.txnId}</p> : null}
          {data.proof?.submittedAt ? <p className="mt-0.5 text-[12px] text-[color:var(--fg-tertiary)]">Submitted {new Date(data.proof.submittedAt).toLocaleDateString("en-IN")}</p> : null}
        </div>
      )}

      {isRejected && (
        <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color:var(--error-soft)] px-4 py-3">
          <p className="text-sm font-semibold text-[color:var(--error)]">Payment rejected — please resubmit proof.</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-[color:var(--fg-secondary)]">Amount due</span>
        <span className="text-lg font-semibold text-[color:var(--fg-primary)]">{inr(data.payableAmount)}</span>
      </div>

      {canPay && data.upiString ? (
        <div className="flex flex-col items-center gap-2 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/owner-billing/qr?upi=${encodeURIComponent(data.upiString)}`} alt="UPI QR code" className="h-48 w-48 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-white p-2" width={192} height={192} />
          <p className="text-[12px] text-[color:var(--fg-tertiary)]">Scan with any UPI app to pay</p>
        </div>
      ) : null}

      {canPay && !showForm ? (
        <Button onClick={() => setShowForm(true)} fullWidth className="min-h-11">I&apos;ve Paid — Submit Proof</Button>
      ) : null}

      {showForm ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
          <FormField label="Transaction ID">
            {({ id }) => <TextInput id={id} value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="e.g. 423456789012" />}
          </FormField>
          <FormField label="Payment screenshot (optional)">
            {({ id }) => (
              <input id={id} ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-xs text-[color:var(--fg-secondary)] file:mr-3 file:rounded-[var(--radius-xs)] file:border-0 file:bg-[color:var(--muted)] file:px-3 file:py-1.5 file:text-xs file:text-[color:var(--fg-primary)] file:cursor-pointer" />
            )}
          </FormField>
          {screenshotDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={screenshotDataUrl} alt="Payment screenshot preview" className="max-h-36 w-auto rounded-[var(--radius-sm)] border border-[color:var(--border)] object-contain" />
          ) : null}
          {submitError ? <p className="text-xs text-[color:var(--error)]">{submitError}</p> : null}
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={submitting} className="min-h-10 flex-1">{submitting ? "Submitting…" : "Submit"}</Button>
            <Button variant="secondary" onClick={() => { setShowForm(false); setSubmitError(""); }} className="min-h-10 px-4">Cancel</Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function UpgradeHook({ data, currentPlanLabel }: { data: OwnerBillingData; currentPlanLabel: string }) {
  const tenantPct = data.billing.planLimit && data.billing.tenantCount ? Math.round((data.billing.tenantCount / data.billing.planLimit) * 100) : 0;
  const hostelCount = data.billing.hostelCount ?? 0;
  const hostelLimit = data.billing.hostelLimit ?? 1;
  const hostelPct = hostelLimit > 0 ? Math.round((hostelCount / hostelLimit) * 100) : 0;

  const showTenantWarning = tenantPct >= 80;
  const showHostelWarning = hostelPct >= 80;
  const isOnMaxPlan = data.planId === "pro";

  if (!showTenantWarning && !showHostelWarning) return null;

  return (
    <div className="rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--warning)_25%,transparent)] bg-[color:var(--warning-soft)] p-3">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning)]" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[color:var(--warning)]">
            {showTenantWarning && showHostelWarning ? "Approaching tenant and hostel limits" : showTenantWarning ? "Approaching tenant limit" : "Approaching hostel limit"}
          </p>
          <p className="mt-1 text-[12px] text-[color:var(--fg-secondary)]">
            {showTenantWarning ? `Used ${data.billing.tenantCount} of ${data.billing.planLimit} on ${currentPlanLabel}. ` : ""}
            {showHostelWarning ? `${hostelCount} of ${hostelLimit} hostel slots filled. ` : ""}
            {isOnMaxPlan ? "Extra usage billed at Rs 5/tenant and Rs 199/hostel per month." : "Upgrade your plan for a higher limit."}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonBlock className="h-10 w-64 rounded-full" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-96 w-[260px] shrink-0 rounded-[var(--radius-xl)]" />
        ))}
      </div>
    </div>
  );
}
