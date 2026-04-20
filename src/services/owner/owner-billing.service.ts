import { csrfFetch } from "@/lib/csrf-client";

export type OwnerBillingData = {
  hostelId: string;
  hostelName: string;
  monthKey: string;
  dueDate: string;
  planId: "starter" | "growth" | "pro" | "scale";
  autoPayEnabled: boolean;
  paymentStatus: "paid" | "pending" | "failed";
  accessActive: boolean;
  payableAmount: number;
  billing: {
    tenantCount: number;
    billableTenantCount: number;
    extraTenants: number;
    extraCharges: number;
    finalAmount: number;
    upgradeSuggested: boolean;
    blockedAtNextPlan: boolean;
    nextPlanName: string | null;
  };
  upgradePending: boolean;
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
  const response = await csrfFetch("/api/owner-billing/request-upgrade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hostelId,
      requestedPlanId,
      note: `Upgrade requested from ${currentPlanId} to ${requestedPlanId}`,
    }),
  });
  const data = (await response.json()) as { message?: string };
  return { response, data };
}
