"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  monthlyPrice: number | null;
  limit: number | null;
  popular?: boolean;
  description: string;
  features: string[];
};

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 999,
    limit: 50,
    description: "Best for single building setups getting digitized.",
    features: ["Up to 50 tenants", "Multiple hostels supported", "Rent tracking & reminders"],
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 1500,
    limit: 100,
    popular: true,
    description: "For growing operators with stable monthly operations.",
    features: ["Up to 100 tenants", "Smart due alerts", "Priority chat support"],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 2000,
    limit: 150,
    description: "For larger teams managing higher tenant volume.",
    features: ["Up to 150 tenants", "Advanced payment workflows", "Team access controls"],
  },
  {
    id: "scale",
    name: "Scale",
    monthlyPrice: 3999,
    limit: 500,
    description: "Built for multi-property organizations at scale.",
    features: ["Up to 500 tenants", "Portfolio analytics", "Dedicated onboarding help"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: null,
    limit: null,
    description: "Custom setup, controls, and support for very large portfolios.",
    features: ["Custom tenant volume", "SLA & dedicated CSM", "API and custom integrations"],
  },
];

const pricingPlans = plans.filter((plan) => plan.monthlyPrice !== null);

export default function PlansPage() {
  const [selectedPlanId, setSelectedPlanId] = useState("growth");
  const [tenantCount, setTenantCount] = useState(100);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[1];

  const calculation = useMemo(() => {
    if (selectedPlan.monthlyPrice === null || selectedPlan.limit === null) {
      return {
        monthlyCost: null as number | null,
        extraTenants: 0,
        nextPlan: null as Plan | null,
        savingsOnUpgrade: 0,
        upgradeRequired: false,
        message: "Talk to sales for enterprise pricing tailored to your portfolio.",
      };
    }

    const extraTenants = Math.max(0, tenantCount - selectedPlan.limit);
    const selectedIndex = pricingPlans.findIndex((plan) => plan.id === selectedPlan.id);
    const nextPlan = selectedIndex >= 0 ? pricingPlans[selectedIndex + 1] ?? null : null;

    let monthlyCost: number | null = selectedPlan.monthlyPrice;
    let savingsOnUpgrade = 0;
    let upgradeRequired = false;
    let message = "Your current tenant count fits this plan.";

    if (tenantCount <= selectedPlan.limit) {
      monthlyCost = selectedPlan.monthlyPrice;
      message = "Tenant count is within this plan limit.";
    } else if (nextPlan && nextPlan.limit !== null) {
      if (tenantCount < nextPlan.limit) {
        monthlyCost = selectedPlan.monthlyPrice + extraTenants * 10;
        message = `Extra tenants charged at ₹10 each until ${nextPlan.name} (${nextPlan.limit} tenants).`;
      } else {
        upgradeRequired = true;
        monthlyCost = null;
        message = `Upgrade required: tenant count reached ${nextPlan.limit} (${nextPlan.name}).`;
      }
    } else {
      monthlyCost = selectedPlan.monthlyPrice + extraTenants * 10;
      message = "Above base plan limit. Consider Enterprise for best pricing.";
    }

    if (nextPlan && nextPlan.limit !== null && nextPlan.monthlyPrice !== null) {
      if (!upgradeRequired && monthlyCost !== null && monthlyCost > nextPlan.monthlyPrice) {
        savingsOnUpgrade = monthlyCost - nextPlan.monthlyPrice;
        message = `Upgrade to ${nextPlan.name} and save ₹${savingsOnUpgrade.toLocaleString("en-IN")}/month.`;
      }
    }

    if (selectedPlan.id === "scale" && tenantCount > 500) {
      upgradeRequired = true;
      monthlyCost = null;
      message = "You are above 500 tenants. Move to Enterprise for custom pricing and support.";
    }

    return { monthlyCost, extraTenants, nextPlan, savingsOnUpgrade, upgradeRequired, message };
  }, [selectedPlan, tenantCount]);

  return (
    <main className="min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <section className="rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(236,253,245,0.85)_0%,rgba(239,246,255,0.92)_48%,rgba(255,255,255,0.95)_100%)] p-6 shadow-[0_24px_60px_rgba(37,99,235,0.12)] sm:p-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Transparent pricing for every growth stage
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Simple pricing for modern hostel management
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Tenants are counted across all properties. You can manage multiple hostels in every paid plan with instant visibility.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[linear-gradient(90deg,#0ea5e9_0%,#22c55e_100%)] px-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(14,165,233,0.26)] hover:opacity-95"
              >
                Start Free Trial
              </Link>
              <Link
                href="/owner/settings"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-sky-100 bg-white/90 px-5 text-sm font-semibold text-slate-700"
              >
                Talk to Sales
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {plans.map((plan, index) => {
            const selected = selectedPlanId === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`group relative rounded-[24px] border p-4 text-left shadow-[0_14px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 ${
                  plan.popular
                    ? "border-emerald-200 bg-[linear-gradient(180deg,#ecfdf5_0%,#f0f9ff_100%)]"
                    : "border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(248,250,252,0.96)_100%)]"
                } ${selected ? "ring-2 ring-sky-300" : ""}`}
                style={{ animation: `float-up 260ms ease ${index * 60}ms both` }}
              >
                {plan.popular ? (
                  <span className="absolute -top-2 right-4 rounded-full bg-[linear-gradient(90deg,#22c55e_0%,#0ea5e9_100%)] px-2.5 py-1 text-[10px] font-semibold text-white">
                    Most Popular
                  </span>
                ) : null}
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{plan.name}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {plan.monthlyPrice === null ? "Custom" : `₹${plan.monthlyPrice.toLocaleString("en-IN")}`}
                </p>
                <p className="text-xs text-slate-500">{plan.monthlyPrice === null ? "Contact sales" : "/month"}</p>
                <p className="mt-3 text-xs text-slate-600">{plan.description}</p>
                <p className="mt-2 text-xs font-medium text-sky-700">
                  {plan.limit === null ? "Unlimited/custom tenant volume" : `Up to ${plan.limit} tenants`}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs text-slate-600">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </section>

        <section className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(240,249,255,0.94)_100%)] p-5 shadow-[0_18px_46px_rgba(14,165,233,0.1)] sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pricing Calculator</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">Estimate your monthly bill instantly</h2>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
              <p className="text-xs text-slate-500">Tenants (all properties)</p>
              <p className="text-2xl font-semibold text-slate-900">{tenantCount}</p>
            </div>
          </div>

          <div className="mt-5">
            <input
              aria-label="Tenant count"
              type="range"
              min={1}
              max={600}
              value={tenantCount}
              onChange={(event) => setTenantCount(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[linear-gradient(90deg,#bae6fd_0%,#86efac_100%)]"
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>1</span>
              <span>500</span>
              <span>600+</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <CalcBox label="Selected Plan" value={selectedPlan.name} helper="You can switch plans above" />
            <CalcBox
              label="Monthly Price"
              value={calculation.monthlyCost === null ? "Upgrade required" : `₹${calculation.monthlyCost.toLocaleString("en-IN")}`}
              helper={
                calculation.extraTenants > 0 && !calculation.upgradeRequired
                  ? `Includes ${calculation.extraTenants} extra tenants x ₹10`
                  : "No extra tenant charges"
              }
            />
            <CalcBox
              label="Upgrade Impact"
              value={
                calculation.upgradeRequired
                  ? "Upgrade now"
                  : calculation.savingsOnUpgrade > 0
                    ? `Save ₹${calculation.savingsOnUpgrade.toLocaleString("en-IN")}`
                    : "No immediate savings"
              }
              helper={calculation.nextPlan ? `Next plan: ${calculation.nextPlan.name}` : "Top-tier plan selected"}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-100 bg-[linear-gradient(180deg,#ecfdf5_0%,#f0f9ff_100%)] px-4 py-3 text-sm text-emerald-800">
            {calculation.message}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.96)_100%)] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)] sm:p-7">
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Frequently asked questions</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <FaqCard
              question="Are tenants counted per hostel or combined?"
              answer="Tenant count is combined across all your properties in one account."
            />
            <FaqCard
              question="Can I manage multiple hostels in one plan?"
              answer="Yes. Every plan supports multiple hostels and centralized management."
            />
            <FaqCard
              question="What happens if I exceed plan limits?"
              answer="Extra tenants are billed at Rs 10 per tenant until your next plan threshold, then we suggest an upgrade."
            />
            <FaqCard
              question="Do you support custom enterprise contracts?"
              answer="Yes. Enterprise includes custom pricing, onboarding, and dedicated support."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function CalcBox({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function FaqCard({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{question}</p>
      <p className="mt-1 text-sm text-slate-600">{answer}</p>
    </div>
  );
}
