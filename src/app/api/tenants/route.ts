import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getOwnerHostelInventory } from "@/data/ownerHostelStore";
import { assignTenantRoom, createTenantRecord, getTenantRecords, removeTenantRecord } from "@/data/tenantStore";
import { calculateNextDueDate } from "@/utils/payment";
import { requireOwnerSession } from "@/lib/session-mode";
import { apiRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { PENDING_ID_NUMBER, type TenantRecord } from "@/types/tenant";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hostelId = searchParams.get("hostelId");
  const tenantId = searchParams.get("tenantId");
  const historyLimit = Math.min(Number(searchParams.get("historyLimit") ?? 24), 120);
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (session.isLive) {
    if (hostelId) {
      const backendResponse = await backendFetch(`/api/tenants?hostel_id=${encodeURIComponent(hostelId)}`);
      const payload = (await backendResponse.json()) as { tenants?: unknown[]; message?: string };

      if (!backendResponse.ok) {
        return NextResponse.json({ message: payload.message || "Unable to load tenants." }, { status: backendResponse.status });
      }

      const tenants = Array.isArray(payload.tenants) ? payload.tenants : [];
      const filtered = tenantId ? tenants.filter((tenant) => (tenant as { tenantId?: string }).tenantId === tenantId) : tenants;
      return NextResponse.json({ tenants: filtered, hostels: [] });
    }

    // Single backend call — returns all owner tenants without N+1 per-hostel loop
    const [allTenantsResponse, hostelsResponse] = await Promise.all([
      backendFetch("/api/tenants"),
      backendFetch("/api/hostels"),
    ]);

    const allTenantsPayload = (await allTenantsResponse.json()) as { tenants?: unknown[]; message?: string };
    const hostelsPayload = (await hostelsResponse.json()) as { hostels?: Array<{ id?: string }>; message?: string };

    if (!allTenantsResponse.ok) {
      return NextResponse.json({ message: allTenantsPayload.message || "Unable to load tenants." }, { status: allTenantsResponse.status });
    }

    const hostels = Array.isArray(hostelsPayload.hostels) ? hostelsPayload.hostels : [];
    const tenants = Array.isArray(allTenantsPayload.tenants) ? allTenantsPayload.tenants : [];
    const filtered = tenantId ? tenants.filter((tenant) => (tenant as { tenantId?: string }).tenantId === tenantId) : tenants;
    return NextResponse.json({ tenants: filtered, hostels });
  }

  const allTenants = getTenantRecords();

  const matched = allTenants.filter((tenant) => {
    if (tenantId && tenant.tenantId !== tenantId) return false;
    if (hostelId && tenant.hostelId !== hostelId && tenant.assignment?.hostelId !== hostelId) return false;
    return true;
  });

  // Trim payment history to avoid sending large blobs on list views
  const tenants = matched.map((t) => ({
    ...t,
    paymentHistory: t.paymentHistory.slice(0, historyLimit),
  }));

  return NextResponse.json({ tenants, hostels: getOwnerHostelInventory(allTenants) });
}

// In-memory idempotency cache for demo mode (TTL: 60s, max 500 keys)
// payloadHash is stored to detect same-key+different-payload conflict → 409
const _idempotencyCache = new Map<string, { status: number; body: unknown; payloadHash: string; expiresAt: number }>();
const _IDEMPOTENCY_MAX = 500;

function _hashPayload(payload: unknown): string {
  const str = JSON.stringify(payload, Object.keys(payload as object).sort());
  return createHash("sha256").update(str).digest("hex");
}

function _getIdempotentResponse(key: string, payloadHash: string) {
  const now = Date.now();
  for (const [k, v] of _idempotencyCache) if (v.expiresAt < now) _idempotencyCache.delete(k);
  const cached = _idempotencyCache.get(key);
  if (!cached) return null;
  if (cached.payloadHash !== payloadHash) return "conflict" as const;
  return cached;
}

function _setIdempotentResponse(key: string, payloadHash: string, status: number, body: unknown) {
  if (_idempotencyCache.size >= _IDEMPOTENCY_MAX) {
    const firstKey = _idempotencyCache.keys().next().value;
    if (firstKey !== undefined) _idempotencyCache.delete(firstKey);
  }
  _idempotencyCache.set(key, { status, body, payloadHash, expiresAt: Date.now() + 60_000 });
}

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (process.env.PLAYWRIGHT_TEST !== "true" && apiRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  // Idempotency: demo mode only. Key is owner-scoped to prevent cross-owner collisions.
  // Demo path has no awaits between cache-check and cache-set so no race condition is possible.
  const rawKey = request.headers.get("X-Idempotency-Key");
  const idempotencyKey = rawKey && rawKey.length <= 128 ? rawKey : null;
  const scopedKey = idempotencyKey ? `${session.ownerId ?? "anon"}:${idempotencyKey}` : null;
  const payloadHash = scopedKey ? _hashPayload(body) : "";
  if (scopedKey && !session.isLive) {
    const cached = _getIdempotentResponse(scopedKey, payloadHash);
    if (cached === "conflict") {
      return NextResponse.json({ message: "Idempotency key reused with different payload." }, { status: 409 });
    }
    if (cached) return NextResponse.json(cached.body, { status: cached.status });
  }

  const fullName = String(body.fullName ?? "").trim();
  const fatherName = String(body.fatherName ?? "").trim() || undefined;
  const dateOfBirth = String(body.dateOfBirth ?? "").trim() || undefined;
  const phone = String(body.phone ?? "").trim() || undefined;
  const email = String(body.email ?? "").trim() || undefined;
  const idType = String(body.idType ?? "").trim() || undefined;
  const idNumber = String(body.idNumber ?? "").trim().toUpperCase() || undefined;
  const tenantPhotoUrl = String(body.tenantPhotoUrl ?? "").trim() || undefined;
  const idPhotoUrl = String(body.idPhotoUrl ?? "").trim() || undefined;
  const agreementUrlsRaw = Array.isArray(body.agreementUrls) ? body.agreementUrls : [];
  const agreementUrls = agreementUrlsRaw.slice(0, 4).map((u: unknown) => String(u ?? "").trim()).filter(Boolean) as string[];
  const agreementUrlsVal = agreementUrls.length > 0 ? agreementUrls : undefined;
  const emergencyContactName = String(body.emergencyContactName ?? "").trim() || undefined;
  const emergencyContactRelation = String(body.emergencyContactRelation ?? "").trim() || undefined;
  const emergencyContactPhone = String(body.emergencyContactPhone ?? "").trim() || undefined;
  const monthlyRent = Number(body.monthlyRent ?? 0);
  const rentPaid = Number(body.rentPaid ?? 0);
  const paidOnDate = String(body.paidOnDate ?? "").trim();
  const billingCycleRaw = String(body.billingCycle ?? "monthly").trim();
  const billingCycle = (billingCycleRaw === "daily" || billingCycleRaw === "weekly") ? billingCycleRaw : "monthly" as const;
  const hostelId = String(body.hostelId ?? "").trim();
  const unitId = String(body.unitId ?? "").trim() || undefined;
  const roomNumber = String(body.roomNumber ?? "").trim();
  const sharingType = String(body.sharingType ?? "").trim();
  const moveInDate = String(body.moveInDate ?? "").trim();
  const bedId = String(body.bedId ?? "").trim() || undefined;
  const bedLabel = String(body.bedLabel ?? "").trim() || undefined;
  const propertyTypeRaw = String(body.propertyType ?? "").trim();
  const propertyType = propertyTypeRaw === "RESIDENCE" ? "RESIDENCE" : propertyTypeRaw === "PG" ? "PG" : undefined;
  const hasAssignment = Boolean(hostelId && roomNumber && moveInDate);

  if (!fullName || !Number.isFinite(monthlyRent) || monthlyRent < 0 || !Number.isFinite(rentPaid) || rentPaid < 0 || !paidOnDate) {
    return NextResponse.json({ message: "Name and payment details are required." }, { status: 400 });
  }
  if (monthlyRent > 10_000_000 || rentPaid > 10_000_000) {
    return NextResponse.json({ message: "Rent amount cannot exceed 10,000,000." }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: "Invalid email address." }, { status: 400 });
  }
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return NextResponse.json({ message: "Date of birth must be YYYY-MM-DD." }, { status: 400 });
  }
  if (paidOnDate && !/^\d{4}-\d{2}-\d{2}$/.test(paidOnDate)) {
    return NextResponse.json({ message: "Payment date must be YYYY-MM-DD." }, { status: 400 });
  }

  if (session.isLive) {
    if (!hostelId) {
      return NextResponse.json({ message: "Choose a hostel before creating the tenant." }, { status: 400 });
    }

    const liveAnchor = hasAssignment ? moveInDate : paidOnDate;
    const liveNextDueDate = calculateNextDueDate(paidOnDate, liveAnchor, billingCycle);
    const backendResponse = await backendFetch("/api/tenants", {
      method: "POST",
      body: JSON.stringify({
        hostel_id: hostelId,
        fullName,
        fatherName,
        dateOfBirth,
        phone,
        email,
        idType,
        idNumber: idNumber || PENDING_ID_NUMBER,
        tenantPhotoUrl,
        idPhotoUrl,
        agreementUrls: agreementUrlsVal,
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone,
        monthlyRent,
        rentPaid,
        paidOnDate,
        billingCycle,
        billingAnchorDate: liveAnchor,
        nextDueDate: liveNextDueDate,
        assignment: hasAssignment
          ? { hostelId, unitId, roomNumber, sharingType, moveInDate, propertyType, bedId, bedLabel }
          : undefined,
        // record the initial payment so history is never empty
        paymentHistory: [{
          paymentId: `pay-init-${crypto.randomUUID()}`,
          amount: rentPaid,
          paidOnDate,
          nextDueDate: liveNextDueDate,
          status: "active",
          paymentMethod: "cash",
          txnId: "",
          proofImageName: "",
          proofImageUrl: "",
          proofMimeType: "",
        }],
      }),
    });
    const payload = (await backendResponse.json()) as { tenant?: unknown; message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message || "Unable to create tenant." }, { status: backendResponse.status });
    }

    return NextResponse.json({ tenant: payload.tenant }, { status: 201 });
  }

  const demoAnchor = hasAssignment ? moveInDate : paidOnDate;
  const tenant = createTenantRecord({
    fullName,
    fatherName,
    dateOfBirth,
    phone: phone ?? "",
    email: email ?? "",
    idType: idType as TenantRecord["idType"],
    idNumber: idNumber || PENDING_ID_NUMBER,
    tenantPhotoUrl,
    idPhotoUrl,
    agreementUrls: agreementUrlsVal,
    emergencyContactName,
    emergencyContactRelation: emergencyContactRelation as TenantRecord["emergencyContactRelation"],
    emergencyContactPhone,
    monthlyRent,
    rentPaid,
    paidOnDate,
    billingAnchorDate: demoAnchor,
    nextDueDate: calculateNextDueDate(paidOnDate, demoAnchor, billingCycle),
    billingCycle,
  });

  if (hasAssignment) {
    try {
      const assignedTenant = assignTenantRoom(tenant.tenantId, {
        hostelId,
        unitId,
        roomNumber,
        sharingType,
        moveInDate,
        propertyType,
        bedId,
        bedLabel,
      });
      const assignedBody = { tenant: assignedTenant };
      if (scopedKey) _setIdempotentResponse(scopedKey, payloadHash, 201, assignedBody);
      return NextResponse.json(assignedBody, { status: 201 });
    } catch (error) {
      removeTenantRecord(tenant.tenantId);
      return NextResponse.json(
        { message: error instanceof Error ? error.message : "Unable to assign tenant to the selected room." },
        { status: 400 },
      );
    }
  }

  const createdBody = { tenant };
  if (scopedKey) _setIdempotentResponse(scopedKey, payloadHash, 201, createdBody);
  return NextResponse.json(createdBody, { status: 201 });
}
