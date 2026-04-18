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
    key: "starter",
    title: "Starter",
    price: 349,
    annualPrice: 3490,
    hostelLimit: 1,
    tenantLimit: 60,
    accent: "border-white/10 bg-[linear-gradient(180deg,#111827_0%,#0c1018_100%)]",
    features: [
      "60 monthly tenants",
      "1 hostel",
      "Rent tracking & reminders",
      "Room management",
      "Payment history",
    ],
  },
  {
    key: "pro",
    title: "Pro",
    price: 749,
    annualPrice: 7490,
    hostelLimit: 2,
    tenantLimit: 150,
    popular: true,
    accent:
      "border-[color:color-mix(in_srgb,var(--success)_40%,var(--brand)_60%)] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_50%),linear-gradient(180deg,#0e1a2e_0%,#0b101c_100%)] shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_32px_80px_rgba(37,99,235,0.2)]",
    features: [
      "150 monthly tenants",
      "2 hostels",
      "All Starter features",
      "Advanced reports",
      "Priority support",
    ],
  },
] as const;

const FOUNDING_OFFER_SLOTS = 15;
const FOUNDING_SLOTS_REMAINING = 8;

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

  if (hostelLoading || dataLoading) return <LoadingState />;

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
    <div className="space-y-4 text-white">
      {/* Hero — compact */}
      <section className="relative overflow-hidden rounded-[12px] border border-white/10 bg-[radial-gradient(ellipse_at_top_left,rgba(56,189,248,0.10),transparent_40%),linear-gradient(180deg,#0d1525_0%,#080e1a_100%)] px-4 py-4">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#38bdf8]/25 to-transparent" />

        {/* Top row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#fbbf24]">
            <Sparkles className="h-3 w-3" />
            Plans &amp; Pricing
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-[#38bdf8]/30 bg-[#38bdf8]/8 px-3 py-1.5 text-[11px]">
              <Clock className="h-3 w-3 text-[#38bdf8]" />
              <span className="font-semibold text-[#38bdf8]">{trialDaysLeft}d</span>
              <span className="text-white/40">trial left</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/8 px-3 py-1.5 text-[11px]">
              <Star className="h-3 w-3 text-[#fbbf24]" />
              <span className="font-semibold text-[#fbbf24]">₹499/mo</span>
              <span className="text-white/40">· {FOUNDING_SLOTS_REMAINING}/{FOUNDING_OFFER_SLOTS} slots</span>
            </div>
          </div>
        </div>

        {/* Tenant counts */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-[8px] border border-[#38bdf8]/20 bg-[#38bdf8]/[0.06] px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">Monthly</p>
            <p className="mt-0.5 text-xl font-semibold text-[#38bdf8]">{data.monthlyTenantCount}</p>
            <p className="text-[9px] text-white/30">toward limit</p>
          </div>
          <div className="rounded-[8px] border border-[#4ade80]/20 bg-[#22c55e]/[0.05] px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">Weekly</p>
            <p className="mt-0.5 text-xl font-semibold text-[#4ade80]">{data.weeklyTenantCount} <span className="text-[10px] font-semibold text-[#4ade80]/60">free</span></p>
            <p className="text-[9px] text-white/30">not counted</p>
          </div>
          <div className="rounded-[8px] border border-[#4ade80]/20 bg-[#22c55e]/[0.05] px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">Daily</p>
            <p className="mt-0.5 text-xl font-semibold text-[#4ade80]">{data.dailyTenantCount} <span className="text-[10px] font-semibold text-[#4ade80]/60">free</span></p>
            <p className="text-[9px] text-white/30">not counted</p>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="grid gap-3 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isTrial = data.plan === "trial";
          const isCurrentPlan = data.plan === plan.key;

          return (
            <article
              key={plan.key}
              className={`relative flex flex-col rounded-[12px] border p-4 ${plan.accent} ${"popular" in plan && plan.popular ? "ring-1 ring-[#38bdf8]/30" : ""}`}
            >
              {"popular" in plan && plan.popular ? (
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#38bdf8]/50 bg-[linear-gradient(90deg,#1d4ed8_0%,#2563eb_100%)] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)]">
                  Most Popular
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{plan.title}</p>
                  {isCurrentPlan && !isTrial ? (
                    <span className="mt-1 inline-block rounded-full border border-[#4ade80] bg-[#22c55e]/20 px-2 py-0.5 text-[9px] font-semibold uppercase text-[#4ade80]">
                      Current
                    </span>
                  ) : null}
                </div>
                <TenantUsageBar used={data.monthlyTenantCount} limit={plan.tenantLimit} isCurrent={isCurrentPlan && !isTrial} />
              </div>

              <div className="mt-3 flex items-end gap-1.5">
                <span className="text-3xl font-semibold leading-none tracking-[-0.04em] text-white">
                  ₹{plan.price.toLocaleString("en-IN")}
                </span>
                <span className="mb-0.5 text-xs text-white/40">/mo</span>
              </div>
              <p className="mt-0.5 text-[10px] text-white/30">₹{plan.annualPrice.toLocaleString("en-IN")}/yr · save 2 months</p>

              <ul className="mt-3 space-y-1.5">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-[12px] text-white/65">
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-[#4ade80]/40 bg-[#22c55e]/12">
                      <Check className="h-2.5 w-2.5 text-[#4ade80]" />
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-3">
                {isTrial ? (
                  <button
                    type="button"
                    className={`inline-flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold transition ${
                      "popular" in plan && plan.popular
                        ? "bg-[linear-gradient(90deg,#1d4ed8_0%,#2563eb_100%)] text-white shadow-[0_10px_24px_rgba(37,99,235,0.3)] hover:brightness-110"
                        : "border border-white/12 bg-white/[0.05] text-white/70 hover:bg-white/[0.10] hover:text-white"
                    }`}
                  >
                    <Zap className="mr-1.5 h-3.5 w-3.5" />
                    Choose {plan.title}
                  </button>
                ) : isCurrentPlan ? (
                  <div className="flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-medium text-white/40">
                    Current Plan
                  </div>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-sm font-semibold text-white/70 transition hover:bg-white/[0.10] hover:text-white"
                  >
                    Switch to {plan.title}
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {/* Founding offer card */}
        <article className="relative flex flex-col rounded-[12px] border border-[#f59e0b]/40 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_50%),linear-gradient(180deg,#151208_0%,#0c1018_100%)] p-4 ring-1 ring-[#f59e0b]/20">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f59e0b]/50 bg-[linear-gradient(90deg,#b45309_0%,#d97706_100%)] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_8px_20px_rgba(245,158,11,0.3)]">
            Founding
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#fbbf24]">Founding</p>
              <span className="mt-1 inline-block rounded-full border border-[#f59e0b]/50 bg-[#f59e0b]/15 px-2 py-0.5 text-[9px] font-semibold uppercase text-[#fbbf24]">
                {FOUNDING_SLOTS_REMAINING} slots left
              </span>
            </div>
            <TenantUsageBar used={data.monthlyTenantCount} limit={200} isCurrent={data.plan === "founding"} />
          </div>

          <div className="mt-3 flex items-end gap-1.5">
            <span className="text-3xl font-semibold leading-none tracking-[-0.04em] text-white">₹499</span>
            <span className="mb-0.5 text-xs text-white/40">/mo</span>
          </div>
          <p className="mt-0.5 text-[10px] text-[#fbbf24]/55">First month free · locked forever</p>

          <ul className="mt-3 space-y-1.5">
            {[
              "200 monthly tenants",
              "2 hostels",
              "All Pro features",
              "First month free",
              "₹5/tenant overage past 200",
              "Founding badge & priority support",
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-2 text-[12px] text-white/65">
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/12">
                  <Check className="h-2.5 w-2.5 text-[#fbbf24]" />
                </span>
                {feat}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-3">
            <button
              type="button"
              className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[linear-gradient(90deg,#b45309_0%,#d97706_50%,#f59e0b_100%)] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(245,158,11,0.3)] transition hover:brightness-110"
            >
              <Star className="mr-1.5 h-3.5 w-3.5" />
              Claim Founding Offer
            </button>
          </div>
        </article>
      </section>

      {/* Footer notes — 2 col */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-[10px] border border-[#f59e0b]/20 bg-[#f59e0b]/[0.04] px-4 py-3">
          <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#fbbf24]" />
          <div>
            <p className="text-[12px] font-semibold text-white">Overage: ₹5/tenant</p>
            <p className="mt-0.5 text-[11px] text-white/45">Exceed limit? Flat ₹5 per extra tenant. No forced upgrade, no interruption.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-[10px] border border-[#4ade80]/20 bg-[#22c55e]/[0.04] px-4 py-3">
          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#4ade80]" />
          <div>
            <p className="text-[12px] font-semibold text-white">Daily &amp; weekly always free</p>
            <p className="mt-0.5 text-[11px] text-white/45">Per-night and 7-day stays — reminders, alerts, tracking — zero cost, never counted.</p>
          </div>
        </div>
      </section>
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
      <p className="mt-0.5 text-[8px] text-white/20">10+ day stays count</p>
      {isFull && isCurrent ? (
        <p className="mt-0.5 text-[9px] font-semibold text-amber-400">↑ Upgrade for more</p>
      ) : null}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-32 rounded-[12px]" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-72 rounded-[12px]" />
        ))}
      </div>
    </div>
  );
}
