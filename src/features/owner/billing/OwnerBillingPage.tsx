"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Clock, Sparkles, Star, Zap } from "lucide-react";
import { useHostelContext } from "@/store/hostel-context";
import { SkeletonBlock } from "@/components/ui/skeleton";

type LocalBillingData = {
  hostelName: string;
  plan: string;
  trialActive: boolean;
  trialEndsAt: string;
  monthlyTenantCount: number;
  weeklyTenantCount: number;
  dailyTenantCount: number;
  totalTenants: number;
};

const PLANS = [
  {
    key: "basic",
    title: "Basic",
    price: 999,
    tenantLimit: 50,
    tenantLimitLabel: "Up to 50 monthly tenants",
    blurb: "For small PGs just getting started",
    accent: "border-white/10 bg-[linear-gradient(180deg,#111827_0%,#0c1018_100%)]",
    features: [
      "Up to 50 monthly tenants",
      "Unlimited daily & weekly (free)",
      "Rent tracking & reminders",
      "Room management",
      "Payment history",
    ],
  },
  {
    key: "growth",
    title: "Growth",
    price: 1999,
    tenantLimit: 150,
    tenantLimitLabel: "Up to 150 monthly tenants",
    blurb: "The right plan for most active hostels",
    popular: true,
    accent:
      "border-[color:color-mix(in_srgb,var(--success)_40%,var(--brand)_60%)] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_50%),linear-gradient(180deg,#0e1a2e_0%,#0b101c_100%)] shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_32px_80px_rgba(37,99,235,0.2)]",
    features: [
      "Up to 150 monthly tenants",
      "Unlimited daily & weekly (free)",
      "All Basic features",
      "Advanced reports",
      "Priority support",
    ],
  },
  {
    key: "pro",
    title: "Pro",
    price: 2999,
    tenantLimit: Infinity,
    tenantLimitLabel: "Unlimited monthly tenants",
    blurb: "For large operations — no limits",
    accent: "border-[#f59e0b]/30 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.1),transparent_50%),linear-gradient(180deg,#151208_0%,#0c1018_100%)]",
    features: [
      "Unlimited monthly tenants",
      "Unlimited daily & weekly (free)",
      "All Growth features",
      "Multi-hostel support",
      "Dedicated support",
    ],
  },
] as const;

const FOUNDING_OFFER_SLOTS = 20;
const FOUNDING_SLOTS_REMAINING = 7;

export default function OwnerBillingPage() {
  const { currentHostel, loading: hostelLoading } = useHostelContext();
  const [data, setData] = useState<LocalBillingData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!currentHostel?.id) return;
    setDataLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/owner-billing?hostelId=${encodeURIComponent(currentHostel.id)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const json = (await res.json()) as { message?: string };
        setError(json.message ?? "Unable to load billing.");
        return;
      }
      const json = (await res.json()) as LocalBillingData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load billing.");
    } finally {
      setDataLoading(false);
    }
  }, [currentHostel?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (hostelLoading || dataLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return (
      <div className="rounded-[10px] border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
        {error || "Unable to load pricing."}
      </div>
    );
  }

  const trialDaysLeft = Math.max(
    0,
    Math.ceil((new Date(data.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="space-y-6 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[14px] border border-white/10 bg-[radial-gradient(ellipse_at_top_left,rgba(56,189,248,0.12),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(249,193,42,0.1),transparent_40%),linear-gradient(180deg,#0d1525_0%,#080e1a_100%)] p-5 shadow-[0_32px_80px_rgba(2,6,23,0.4)] sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#38bdf8]/30 to-transparent" />

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#fbbf24]">
              <Sparkles className="h-3.5 w-3.5" />
              Plans &amp; Pricing
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              Simple, transparent<br />
              <span className="text-[#38bdf8]">pricing.</span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/50">
              Pay only for your monthly tenants. Daily and weekly guests are completely free — they're managed, reminded, and tracked at no extra cost.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:min-w-56">
            {/* Trial badge */}
            <div className="rounded-[8px] border border-[#38bdf8]/30 bg-[#38bdf8]/8 p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#38bdf8]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#38bdf8]">Free Trial</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-white">{trialDaysLeft} days left</p>
              <p className="mt-1 text-xs text-white/40">No payment required. Try everything free.</p>
            </div>

            {/* Founding offer */}
            <div className="rounded-[8px] border border-[#f59e0b]/40 bg-[#f59e0b]/8 p-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-[#fbbf24]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#fbbf24]">Founding Offer</span>
              </div>
              <p className="mt-2 text-base font-semibold text-white">50% lifetime discount</p>
              <p className="mt-1 text-xs text-white/50">
                Only {FOUNDING_SLOTS_REMAINING} of {FOUNDING_OFFER_SLOTS} slots remaining. Lock in forever.
              </p>
            </div>
          </div>
        </div>

        {/* Tenant breakdown */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <TenantCountCard
            label="Monthly Tenants"
            sublabel="Counted toward plan limit"
            value={data.monthlyTenantCount}
            tone="brand"
          />
          <TenantCountCard
            label="Weekly Tenants"
            sublabel="Managed free, not counted"
            value={data.weeklyTenantCount}
            tone="free"
          />
          <TenantCountCard
            label="Daily Tenants"
            sublabel="Managed free, not counted"
            value={data.dailyTenantCount}
            tone="free"
          />
        </div>
      </section>

      {/* Plan cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isTrial = data.plan === "trial";
          const isCurrentPlan = data.plan === plan.key;
          const foundingPrice = Math.round(plan.price * 0.5);

          return (
            <article
              key={plan.key}
              className={`relative flex flex-col rounded-[12px] border p-5 ${plan.accent} ${"popular" in plan && plan.popular ? "ring-1 ring-[#38bdf8]/30" : ""}`}
            >
              {"popular" in plan && plan.popular ? (
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#38bdf8]/50 bg-[linear-gradient(90deg,#1d4ed8_0%,#2563eb_100%)] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_rgba(37,99,235,0.3)]">
                  Most Popular
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/80">{plan.title}</p>
                {isCurrentPlan && !isTrial ? (
                  <span className="rounded-full border border-[#4ade80] bg-[#22c55e]/20 px-2.5 py-1 text-[10px] font-semibold uppercase text-[#4ade80]">
                    Current
                  </span>
                ) : null}
              </div>

              {/* Pricing */}
              <div className="mt-5">
                <div className="flex items-end gap-2">
                  <span className="text-[2.4rem] font-semibold leading-none tracking-[-0.04em] text-white">
                    ₹{foundingPrice.toLocaleString("en-IN")}
                  </span>
                  <span className="mb-1 text-sm text-white/40">/ mo</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-sm text-white/30 line-through">₹{plan.price.toLocaleString("en-IN")}</span>
                  <span className="rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-2 py-0.5 text-[10px] font-semibold text-[#fbbf24]">
                    50% OFF — Founding
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm text-white/50">{plan.tenantLimitLabel}</p>
              <p className="mt-2 text-sm font-medium text-white/80">{plan.blurb}</p>

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5 text-[13px] text-white/70">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[#4ade80]/50 bg-[#22c55e]/15">
                      <Check className="h-3 w-3 text-[#4ade80]" />
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-6">
                {isTrial ? (
                  <button
                    type="button"
                    className={`inline-flex min-h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold transition ${
                      "popular" in plan && plan.popular
                        ? "bg-[linear-gradient(90deg,#1d4ed8_0%,#2563eb_100%)] text-white shadow-[0_14px_32px_rgba(37,99,235,0.3)] hover:brightness-110"
                        : "border border-white/12 bg-white/[0.05] text-white/70 hover:bg-white/[0.10] hover:text-white"
                    }`}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Choose {plan.title}
                  </button>
                ) : isCurrentPlan ? (
                  <div className="flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-medium text-white/40">
                    Current Plan
                  </div>
                ) : (
                  <button
                    type="button"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-sm font-semibold text-white/70 transition hover:bg-white/[0.10] hover:text-white"
                  >
                    Switch to {plan.title}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {/* Free daily/weekly callout */}
      <section className="rounded-[10px] border border-white/10 bg-white/[0.03] px-5 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[#4ade80]/40 bg-[#22c55e]/10">
            <Check className="h-5 w-5 text-[#4ade80]" />
          </div>
          <div>
            <p className="font-semibold text-white">Daily &amp; weekly guests are always free</p>
            <p className="mt-1 text-sm text-white/50">
              Daily tenants (per night) and weekly tenants (7-day stays) are fully managed — reminders, dashboards, overdue alerts — at zero cost. They never count against your plan limit.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function TenantCountCard({
  label,
  sublabel,
  value,
  tone,
}: {
  label: string;
  sublabel: string;
  value: number;
  tone: "brand" | "free";
}) {
  return (
    <div
      className={`rounded-[8px] border p-4 ${
        tone === "brand"
          ? "border-[#38bdf8]/20 bg-[#38bdf8]/[0.06]"
          : "border-[#4ade80]/20 bg-[#22c55e]/[0.05]"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          tone === "brand" ? "text-[#38bdf8]" : "text-[#4ade80]"
        }`}
      >
        {value}
        {tone === "free" ? (
          <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4ade80]/70">free</span>
        ) : null}
      </p>
      <p className="mt-1 text-[11px] text-white/35">{sublabel}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <SkeletonBlock className="h-64 rounded-[14px]" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-80 rounded-[12px]" />
        ))}
      </div>
    </div>
  );
}
