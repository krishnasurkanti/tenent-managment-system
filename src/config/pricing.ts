export type PlanId = "free" | "starter" | "growth" | "pro";

export type PricingPlan = {
  id: PlanId;
  title: string;
  monthlyPrice: number;
  yearlyPrice: number;
  tenantLimit: number;
  includedHostels: number;
  extraTenantRate: number;
  extraHostelPrice: number;
  trialOnly: boolean;
  badge?: string;
  tone: string;
  valueLine: string;
  features: string[];
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "growth", "pro"];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    title: "Free Trial",
    monthlyPrice: 0,
    yearlyPrice: 0,
    tenantLimit: 25,
    includedHostels: 1,
    extraTenantRate: 0,
    extraHostelPrice: 0,
    trialOnly: true,
    tone: "border-white/10 bg-[linear-gradient(180deg,#111827_0%,#0c1018_100%)]",
    valueLine: "30 days free for new owners. No card needed. Weekly and daily guests always free.",
    features: [
      "25 monthly tenants included during trial",
      "1 hostel",
      "Weekly & daily guests - free forever",
      "Extra tenants not allowed on trial",
      "Extra hostels not allowed on trial",
    ],
  },
  {
    id: "starter",
    title: "Silver",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    tenantLimit: 50,
    includedHostels: 1,
    extraTenantRate: 10,
    extraHostelPrice: 199,
    trialOnly: false,
    tone: "border-white/20 bg-[linear-gradient(180deg,#141a27_0%,#0e1420_100%)]",
    valueLine: "Single hostel, 50 monthly tenants. Rs 10 per tenant after that.",
    features: [
      "50 monthly tenants included",
      "1 hostel",
      "Weekly & daily guests - free forever",
      "Rs 10 per tenant after 50",
      "Rs 199 per extra hostel/month",
    ],
  },
  {
    id: "growth",
    title: "Gold",
    monthlyPrice: 499,
    yearlyPrice: 4990,
    tenantLimit: 150,
    includedHostels: 3,
    extraTenantRate: 8,
    extraHostelPrice: 199,
    trialOnly: false,
    badge: "Best Value",
    tone:
      "border-[color:color-mix(in_srgb,var(--success)_40%,var(--brand)_60%)] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_50%),linear-gradient(180deg,#0e1a2e_0%,#0b101c_100%)] shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_32px_80px_rgba(37,99,235,0.2)]",
    valueLine: "3 hostels, 150 monthly tenants. Rs 8 per tenant after that.",
    features: [
      "150 monthly tenants included",
      "3 hostels",
      "Weekly & daily guests - free forever",
      "Rs 8 per tenant after 150",
      "Rs 199 per extra hostel/month",
    ],
  },
  {
    id: "pro",
    title: "Diamond",
    monthlyPrice: 799,
    yearlyPrice: 7990,
    tenantLimit: 300,
    includedHostels: 5,
    extraTenantRate: 5,
    extraHostelPrice: 199,
    trialOnly: false,
    badge: "Most Popular",
    tone:
      "border-[#38bdf8]/30 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.16),transparent_50%),linear-gradient(180deg,#0a1628_0%,#07101e_100%)] shadow-[0_0_0_1px_rgba(56,189,248,0.18),0_32px_80px_rgba(37,99,235,0.24)]",
    valueLine: "5 hostels, 300 monthly tenants. Best for multi-hostel owners.",
    features: [
      "300 monthly tenants included",
      "5 hostels",
      "Weekly & daily guests - free forever",
      "Rs 5 per tenant after 300",
      "Rs 199 per extra hostel/month",
    ],
  },
];

export const PAID_PLAN_IDS: PlanId[] = ["starter", "growth", "pro"];

export function getPricingPlan(planId: string | null | undefined) {
  return PRICING_PLANS.find((plan) => plan.id === planId) ?? PRICING_PLANS[0];
}

export function getNextPricingPlan(planId: PlanId) {
  const index = PLAN_ORDER.indexOf(planId);
  return index >= 0 ? PRICING_PLANS[index + 1] ?? null : null;
}

export function getPlanLabel(planId: PlanId) {
  return getPricingPlan(planId).title;
}
