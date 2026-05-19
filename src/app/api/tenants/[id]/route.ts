import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/session-mode";
import { apiRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { updateTenantProfile } from "@/data/tenantStore";
import { backendFetch } from "@/services/core/backend-api";
import { parseJsonBody } from "@/lib/safe-json";
import type { TenantRecord } from "@/types/tenant";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (process.env.PLAYWRIGHT_TEST !== "true" && apiRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }

  const { body, error: jsonError } = await parseJsonBody(request);
  if (jsonError) return jsonError;

  const patch: Partial<TenantRecord> = {};

  const str = (key: string) => {
    const v = String(body[key] ?? "").trim();
    return v || undefined;
  };

  if (body.fullName !== undefined) {
    const name = String(body.fullName ?? "").trim();
    if (!name) return NextResponse.json({ message: "Name cannot be empty." }, { status: 400 });
    patch.fullName = name;
  }
  if (body.fatherName !== undefined) patch.fatherName = str("fatherName");
  if (body.dateOfBirth !== undefined) {
    const dob = str("dateOfBirth");
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return NextResponse.json({ message: "Date of birth must be YYYY-MM-DD." }, { status: 400 });
    patch.dateOfBirth = dob;
  }
  if (body.phone !== undefined) patch.phone = String(body.phone ?? "").trim();
  if (body.email !== undefined) {
    const emailVal = String(body.email ?? "").trim();
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) return NextResponse.json({ message: "Invalid email address." }, { status: 400 });
    patch.email = emailVal;
  }
  if (body.idType !== undefined) {
    const v = str("idType") as TenantRecord["idType"];
    patch.idType = v;
  }
  if (body.idNumber !== undefined) patch.idNumber = String(body.idNumber ?? "").trim().toUpperCase() || "PENDING-ID";
  if (body.emergencyContactName !== undefined) patch.emergencyContactName = str("emergencyContactName");
  if (body.emergencyContactRelation !== undefined) {
    patch.emergencyContactRelation = str("emergencyContactRelation") as TenantRecord["emergencyContactRelation"];
  }
  if (body.emergencyContactPhone !== undefined) patch.emergencyContactPhone = str("emergencyContactPhone");
  if (body.monthlyRent !== undefined) {
    const v = Number(body.monthlyRent);
    if (!Number.isFinite(v) || v < 0) return NextResponse.json({ message: "Invalid rent amount." }, { status: 400 });
    if (v > 10_000_000) return NextResponse.json({ message: "Rent amount cannot exceed 10,000,000." }, { status: 400 });
    patch.monthlyRent = v;
  }
  if (body.billingCycle !== undefined) {
    const v = String(body.billingCycle ?? "").trim();
    patch.billingCycle = (v === "daily" || v === "weekly") ? v : "monthly";
  }
  if (body.occupation !== undefined) patch.occupation = str("occupation") as TenantRecord["occupation"];
  if (body.workplaceName !== undefined) patch.workplaceName = str("workplaceName");
  if (body.tenantPhotoUrl !== undefined) patch.tenantPhotoUrl = str("tenantPhotoUrl");
  if (body.idPhotoUrl !== undefined) patch.idPhotoUrl = str("idPhotoUrl");
  if (body.agreementUrl !== undefined) patch.agreementUrl = str("agreementUrl");

  if (session.isLive) {
    // Include expectedUpdatedAt for concurrency control
    const backendPayload: Partial<TenantRecord> & { expectedUpdatedAt?: unknown } = { ...patch };
    if (body.expectedUpdatedAt) {
      backendPayload.expectedUpdatedAt = body.expectedUpdatedAt;
    }

    const backendResponse = await backendFetch(`/api/tenants/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(backendPayload),
    });

    const payload = (await backendResponse.json()) as { tenant?: unknown; message?: string };
    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message ?? "Failed to update tenant." }, { status: backendResponse.status });
    }
    return NextResponse.json({ ok: true, tenant: payload.tenant });
  }

  try {
    const tenant = updateTenantProfile(id, patch);
    return NextResponse.json({ ok: true, tenant });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update tenant." },
      { status: 404 },
    );
  }
}
