import { csrfFetch } from "@/lib/csrf-client";

export type OwnerBillingData = {
  hostelId: string;
  hostelName: string;
  monthKey: string;
  dueDate: string;
  planId: "free" | "starter" | "growth" | "pro";
  autoPayEnabled: boolean;
  paymentStatus: "paid" | "pending" | "failed";
  accessActive: boolean;
  payableAmount: number;
  weeklyTenantCount: number;
  dailyTenantCount: number;
  monthlyTenantCount: number;
  nextMonthCount: number;
  billing: {
    tenantCount: number;
    billableTenantCount: number;
    planLimit: number;
    extraTenants: number;
    extraCharges: number;
    hostelCount: number;
    hostelLimit: number;
    extraHostels: number;
    hostelExtraCharges: number;
    finalAmount: number;
    upgradeSuggested: boolean;
    blockedAtNextPlan: boolean;
    nextPlanName: string | null;
  };
  upgradePending: boolean;
  upgradeRequest?: {
    requestId: string;
    requestedPlanId: string;
    status: string;
    requestedAt: string;
  } | null;
};

export async function fetchOwnerBilling(hostelId: string) {
  const response = await fetch(`/api/owner-billing?hostelId=${hostelId}`, { cache: "no-store" });
  const data = (await response.json()) as OwnerBillingData & { message?: string };
  return { response, data };
}

export async function payOwnerBilling(hostelId: string) {
  const response = await csrfFetch("/api/owner-billing/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostelId, paymentMethod: "online" }),
  });
  const data = (await response.json()) as { message?: string };
  return { response, data };
}

export async function setOwnerAutoPay(hostelId: string, enabled: boolean) {
  const response = await csrfFetch("/api/owner-billing/autopay", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostelId, enabled }),
  });
  const data = (await response.json()) as { message?: string };
  return { response, data };
}

export async function requestOwnerPlanUpgrade(hostelId: string, currentPlanId: string, requestedPlanId: string) {
  const planOrder = ["free", "starter", "growth", "pro"];
  const direction =
    currentPlanId === requestedPlanId
      ? "same_plan"
      : planOrder.indexOf(requestedPlanId) > planOrder.indexOf(currentPlanId)
        ? "upgrade"
        : "downgrade";
  const response = await csrfFetch("/api/owner-billing/request-upgrade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hostelId,
      requestedPlanId,
      note: `Plan ${direction} requested from ${currentPlanId} to ${requestedPlanId}`,
    }),
  });
  const data = (await response.json()) as { message?: string };
  return { response, data };
}
