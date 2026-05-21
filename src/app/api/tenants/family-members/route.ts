import { NextResponse } from "next/server";
import { getTenantRecordById, updateTenantFamilyMembersRecord } from "@/data/tenantStore";
import { requireOwnerSession } from "@/lib/session-mode";
import { apiRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { backendFetch } from "@/services/core/backend-api";
import { parseJsonBody } from "@/lib/safe-json";
import type { TenantFamilyMember } from "@/types/tenant";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (process.env.PLAYWRIGHT_TEST !== "true" && apiRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }

  const { body, error: jsonError } = await parseJsonBody<{ tenantId?: string; familyMembers?: TenantFamilyMember[] }>(request);
  if (jsonError) return jsonError;

  const tenantId = String(body.tenantId ?? "").trim();
  const familyMembers = sanitizeFamilyMembers(body.familyMembers);

  if (!tenantId) {
    return NextResponse.json({ message: "Tenant id is required." }, { status: 400 });
  }

  if (familyMembers.length === 0) {
    return NextResponse.json({ message: "Add at least one valid family member." }, { status: 400 });
  }

  if (familyMembers.length > 20) {
    return NextResponse.json({ message: "Maximum 20 family members allowed." }, { status: 400 });
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

  const tenant = getTenantRecordById(tenantId, session.isDemo);
  if (!tenant) {
    return NextResponse.json({ message: "Tenant not found." }, { status: 404 });
  }

  const updated = updateTenantFamilyMembersRecord(tenantId, familyMembers, session.isDemo);
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
