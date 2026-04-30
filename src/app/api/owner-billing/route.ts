import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { backendFetch } from "@/services/core/backend-api";
import { requireOwnerSession } from "@/lib/session-mode";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const response = await backendFetch("/api/owner-billing");
  if (!response.ok) {
    const payload = (await response.json()) as unknown;
    return NextResponse.json(payload, { status: response.status });
  }

  const raw = (await response.json()) as {
    ownerName: string;
    ownerId: number;
    plan: { current: string; status: string };
    billing: {
      cycleStart: string;
      cycleEnd: string;
      liveTenantCount: number;
      effectiveTenants: number;
      extraTenants: number;
      baseAmount: number;
      extraCharges: number;
      hostelCount: number;
      hostelLimit: number;
      extraHostels: number;
      hostelExtraCharges: number;
      totalAmount: number;
      upgradeSuggested: boolean;
      nextPlan: { id: string; label: string } | null;
    };
    tenantCounts: { weekly: number; daily: number; monthly: number; total: number };
    invoice: { id: number; status: string; amount: number; cycleStart: string; cycleEnd: string };
    autoPayEnabled: boolean;
    upgradePending: boolean;
    upgradeRequest: { id: number; requested_plan: string; status: string; created_at: string } | null;
  };

  const planId = raw.plan.current as "starter" | "growth" | "pro" | "scale";
  const monthKey = raw.billing.cycleStart
    ? new Date(raw.billing.cycleStart).toISOString().slice(0, 7)
    : new Date().toISOString().slice(0, 7);

  return NextResponse.json({
    hostelId: String(raw.ownerId),
    hostelName: raw.ownerName,
    monthKey,
    dueDate: raw.billing.cycleEnd ?? "",
    planId,
    autoPayEnabled: raw.autoPayEnabled,
    paymentStatus: raw.invoice.status === "paid" ? "paid" : "pending",
    accessActive: true,
    payableAmount: raw.billing.totalAmount,
    weeklyTenantCount: raw.tenantCounts.weekly,
    dailyTenantCount: raw.tenantCounts.daily,
    monthlyTenantCount: raw.tenantCounts.monthly,
    nextMonthCount: 0,
    billing: {
      tenantCount: raw.billing.liveTenantCount,
      billableTenantCount: raw.billing.effectiveTenants,
      extraTenants: raw.billing.extraTenants,
      extraCharges: raw.billing.extraCharges,
      hostelCount: raw.billing.hostelCount,
      hostelLimit: raw.billing.hostelLimit,
      extraHostels: raw.billing.extraHostels,
      hostelExtraCharges: raw.billing.hostelExtraCharges,
      finalAmount: raw.billing.totalAmount,
      upgradeSuggested: raw.billing.upgradeSuggested,
      blockedAtNextPlan: raw.billing.upgradeSuggested,
      nextPlanName: raw.billing.nextPlan?.id ?? null,
    },
    upgradePending: raw.upgradePending,
    upgradeRequest: raw.upgradeRequest
      ? {
          requestId: String(raw.upgradeRequest.id),
          requestedPlanId: raw.upgradeRequest.requested_plan,
          status: raw.upgradeRequest.status,
          requestedAt: raw.upgradeRequest.created_at,
        }
      : null,
  });
}
