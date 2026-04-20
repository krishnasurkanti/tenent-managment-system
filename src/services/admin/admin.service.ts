import { csrfFetch } from "@/lib/csrf-client";
import type {
  AdminAnalyticsData,
  AdminBillingRow,
  AdminHostelRow,
  AdminLog,
  AdminOverview,
  AdminSettingsFeatures,
  PaymentStatus,
  UpgradeRequest,
} from "@/types/admin";

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function fetchAdminOverview() {
  const response = await fetch("/api/admin/overview", { cache: "no-store" });
  const data = await parseJson<AdminOverview>(response);
  return { response, data };
}

export async function fetchAdminAnalytics() {
  const response = await fetch("/api/admin/analytics", { cache: "no-store" });
  const data = await parseJson<AdminAnalyticsData>(response);
  return { response, data };
}

export async function fetchAdminHostels() {
  const response = await fetch("/api/admin/hostels", { cache: "no-store" });
  const data = await parseJson<{ hostels: AdminHostelRow[] }>(response);
  return { response, data };
}

export async function runAdminHostelAction(hostelId: string, action: string) {
  const response = await csrfFetch(`/api/admin/hostels/${hostelId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const data = await parseJson<{ message?: string }>(response);
  return { response, data };
}

export async function saveAdminOwnerCredentials(hostelId: string, username: string, password: string) {
  const response = await csrfFetch("/api/admin/owner-access", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostelId, username, password }),
  });
  const data = await parseJson<{ message?: string }>(response);
  return { response, data };
}

export async function resetAdminOwnerAccess(hostelId: string) {
  const response = await csrfFetch("/api/admin/owner-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostelId }),
  });
  const data = await parseJson<{ message?: string }>(response);
  return { response, data };
}

export async function fetchAdminBilling() {
  const response = await fetch("/api/admin/billing", { cache: "no-store" });
  const data = await parseJson<{
    summary: AdminBillingRow[];
    history: Array<{ invoiceId: string; hostelId: string; monthKey: string; finalAmount: number; paymentStatus: PaymentStatus }>;
  }>(response);
  return { response, data };
}

export async function fetchAdminUpgradeRequests() {
  const response = await fetch("/api/admin/billing/upgrade-requests", { cache: "no-store" });
  const data = await parseJson<{ requests: UpgradeRequest[] }>(response);
  return { response, data };
}

export async function updateAdminBillingControl(hostelId: string, patch: Record<string, unknown>) {
  const response = await csrfFetch("/api/admin/billing/control", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostelId, ...patch }),
  });
  const data = await parseJson<{ message?: string }>(response);
  return { response, data };
}

export async function generateAdminInvoice(hostelId: string) {
  const response = await csrfFetch("/api/admin/billing/invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostelId }),
  });
  const data = await parseJson<{ message?: string }>(response);
  return { response, data };
}

export async function updateAdminInvoiceStatus(invoiceId: string, status: PaymentStatus) {
  const response = await csrfFetch("/api/admin/billing/invoice-status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoiceId, status }),
  });
  const data = await parseJson<{ message?: string }>(response);
  return { response, data };
}

export async function decideAdminUpgradeRequest(requestId: string, action: "approve" | "reject") {
  const response = await csrfFetch("/api/admin/billing/upgrade-requests", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, action }),
  });
  const data = await parseJson<{ message?: string }>(response);
  return { response, data };
}

export async function fetchAdminSettings() {
  const [featureRes, logsRes] = await Promise.all([
    fetch("/api/admin/settings/features", { cache: "no-store" }),
    fetch("/api/admin/logs", { cache: "no-store" }),
  ]);
  const featureData = await parseJson<{ features: AdminSettingsFeatures }>(featureRes);
  const logData = await parseJson<{ logs: AdminLog[] }>(logsRes);
  return {
    responses: [featureRes, logsRes] as const,
    data: { features: featureData.features ?? {}, logs: logData.logs ?? [] },
  };
}

export async function updateAdminFeatureFlag(name: string, enabled: boolean) {
  const response = await csrfFetch("/api/admin/settings/features", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, enabled }),
  });
  const data = await parseJson<{ message?: string }>(response);
  return { response, data };
}
