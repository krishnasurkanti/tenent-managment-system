import type { TenantFamilyMember, TenantRecord } from "@/types/tenant";

export type TenantsResponse = {
  tenants?: TenantRecord[];
};

export async function fetchOwnerTenants(hostelId?: string) {
  const url = hostelId ? `/api/tenants?hostelId=${encodeURIComponent(hostelId)}` : "/api/tenants";
  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json()) as TenantsResponse;
  return { response, data };
}

export async function fetchTenantById(tenantId: string, baseUrl?: string) {
  const target = baseUrl ? `${baseUrl}/api/tenants?tenantId=${encodeURIComponent(tenantId)}` : `/api/tenants?tenantId=${encodeURIComponent(tenantId)}`;
  const response = await fetch(target, { cache: "no-store" });
  const data = (await response.json()) as TenantsResponse;
  return { response, data };
}

export async function createTenant(formData: FormData) {
  const response = await fetch("/api/tenants", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as { tenant?: TenantRecord; message?: string };
  return { response, data };
}

export async function assignTenantRoom(payload: {
  tenantId: string;
  hostelId: string;
  floorNumber: number;
  roomNumber: string;
  sharingType: string;
  moveInDate: string;
  propertyType?: "PG" | "RESIDENCE";
  bedId?: string;
  bedLabel?: string;
}) {
  const response = await fetch("/api/tenants/assign-room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { tenant?: TenantRecord; message?: string };
  return { response, data };
}

export async function recordTenantPayment(formData: FormData) {
  const response = await fetch("/api/tenants/pay-rent", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as { tenant?: TenantRecord; message?: string };
  return { response, data };
}

export async function uploadTenantPaymentProof(formData: FormData) {
  const response = await fetch("/api/tenants/payment-proof", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as { tenant?: TenantRecord; message?: string };
  return { response, data };
}

export async function removeTenant(tenantId: string) {
  const response = await fetch("/api/tenants/remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId }),
  });

  const data = (await response.json()) as { tenant?: TenantRecord; message?: string };
  return { response, data };
}

export async function updateTenantFamilyMembers(payload: {
  tenantId: string;
  familyMembers: TenantFamilyMember[];
}) {
  const response = await fetch("/api/tenants/family-members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { tenant?: TenantRecord; message?: string };
  return { response, data };
}
