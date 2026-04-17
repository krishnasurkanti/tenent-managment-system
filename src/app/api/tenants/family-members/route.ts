import { NextResponse } from "next/server";
import { getTenantRecordById, updateTenantFamilyMembersRecord } from "@/data/tenantStore";
import { getOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";
import type { TenantFamilyMember } from "@/types/tenant";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getOwnerSession();

  if (session.mode === "guest") {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    tenantId?: string;
    familyMembers?: TenantFamilyMember[];
  };

  const tenantId = String(body.tenantId ?? "").trim();
  const familyMembers = sanitizeFamilyMembers(body.familyMembers);

  if (!tenantId) {
    return NextResponse.json({ message: "Tenant id is required." }, { status: 400 });
  }

  if (familyMembers.length === 0) {
    return NextResponse.json({ message: "Add at least one valid family member." }, { status: 400 });
  }

  if (session.isLive) {
    const existingResponse = await backendFetch(`/api/tenants/${encodeURIComponent(tenantId)}`);
    const existingPayload = (await existingResponse.json()) as { tenant?: Record<string, unknown>; message?: string };

    if (!existingResponse.ok || !existingPayload.tenant) {
      return NextResponse.json({ message: existingPayload.message || "Tenant not found." }, { status: existingResponse.status || 404 });
    }

    const updateResponse = await backendFetch(`/api/tenants/${encodeURIComponent(tenantId)}`, {
      method: "PUT",
      body: JSON.stringify({
        familyMembers,
      }),
    });
    const updatePayload = (await updateResponse.json()) as { tenant?: unknown; message?: string };

    if (!updateResponse.ok) {
      return NextResponse.json({ message: updatePayload.message || "Unable to update family members." }, { status: updateResponse.status });
    }

    return NextResponse.json({ tenant: updatePayload.tenant });
  }

  const tenant = getTenantRecordById(tenantId);
  if (!tenant) {
    return NextResponse.json({ message: "Tenant not found." }, { status: 404 });
  }

  const updated = updateTenantFamilyMembersRecord(tenantId, familyMembers);
  return NextResponse.json({ tenant: updated });
}

function sanitizeFamilyMembers(input: TenantFamilyMember[] | undefined): TenantFamilyMember[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const sanitized: TenantFamilyMember[] = [];

  for (const member of input) {
    const name = String(member.name ?? "").trim();
    const relation = String(member.relation ?? "").trim();
    const age = member.age === undefined || member.age === null ? undefined : Number(member.age);

    if (!name || !relation || (age !== undefined && (!Number.isFinite(age) || age < 0))) {
      continue;
    }

    sanitized.push({
      name,
      relation,
      age,
    });
  }

  return sanitized;
}
