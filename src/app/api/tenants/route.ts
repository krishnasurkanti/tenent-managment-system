import { NextResponse } from "next/server";
import { getOwnerHostelInventory } from "@/data/ownerHostelStore";
import { assignTenantRoom, createTenantRecord, getTenantRecords, removeTenantRecord } from "@/data/tenantStore";
import { calculateNextDueDate } from "@/utils/payment";
import { requireOwnerSession } from "@/lib/session-mode";
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

    const hostelsResponse = await backendFetch("/api/hostels");
    const hostelsPayload = (await hostelsResponse.json()) as { hostels?: Array<{ id?: string }>; message?: string };

    if (!hostelsResponse.ok) {
      return NextResponse.json({ message: hostelsPayload.message || "Unable to load hostels." }, { status: hostelsResponse.status });
    }

    const hostels = Array.isArray(hostelsPayload.hostels) ? hostelsPayload.hostels : [];
    const tenantResults = await Promise.all(
      hostels
        .map((hostel) => hostel.id)
        .filter((id): id is string => Boolean(id))
        .map(async (id) => {
          const tenantResponse = await backendFetch(`/api/tenants?hostel_id=${encodeURIComponent(id)}`);
          const tenantPayload = (await tenantResponse.json()) as { tenants?: unknown[] };
          return Array.isArray(tenantPayload.tenants) ? tenantPayload.tenants : [];
        }),
    );

    const tenants = tenantResults.flat();
    const filtered = tenantId ? tenants.filter((tenant) => (tenant as { tenantId?: string }).tenantId === tenantId) : tenants;
    return NextResponse.json({ tenants: filtered, hostels });
  }

  const allTenants = getTenantRecords();

  const matched = tenantId
    ? allTenants.filter((tenant) => tenant.tenantId === tenantId)
    : hostelId
      ? allTenants.filter((tenant) => tenant.assignment?.hostelId === hostelId)
      : allTenants;

  // Trim payment history to avoid sending large blobs on list views
  const tenants = matched.map((t) => ({
    ...t,
    paymentHistory: t.paymentHistory.slice(0, historyLimit),
  }));

  return NextResponse.json({ tenants, hostels: getOwnerHostelInventory(allTenants) });
}

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;

  const fullName = String(body.fullName ?? "").trim();
  const fatherName = String(body.fatherName ?? "").trim() || undefined;
  const dateOfBirth = String(body.dateOfBirth ?? "").trim() || undefined;
  const phone = String(body.phone ?? "").trim() || undefined;
  const email = String(body.email ?? "").trim() || undefined;
  const idType = String(body.idType ?? "").trim() || undefined;
  const idNumber = String(body.idNumber ?? "").trim().toUpperCase() || undefined;
  const emergencyContactName = String(body.emergencyContactName ?? "").trim() || undefined;
  const emergencyContactRelation = String(body.emergencyContactRelation ?? "").trim() || undefined;
  const emergencyContactPhone = String(body.emergencyContactPhone ?? "").trim() || undefined;
  const monthlyRent = Number(body.monthlyRent ?? 0);
  const rentPaid = Number(body.rentPaid ?? 0);
  const paidOnDate = String(body.paidOnDate ?? "").trim();
  const billingCycleRaw = String(body.billingCycle ?? "monthly").trim();
  const billingCycle = (billingCycleRaw === "daily" || billingCycleRaw === "weekly") ? billingCycleRaw : "monthly" as const;
  const hostelId = String(body.hostelId ?? "").trim();
  const floorNumber = Number(body.floorNumber ?? 0);
  const roomNumber = String(body.roomNumber ?? "").trim();
  const sharingType = String(body.sharingType ?? "").trim();
  const moveInDate = String(body.moveInDate ?? "").trim();
  const bedId = String(body.bedId ?? "").trim() || undefined;
  const bedLabel = String(body.bedLabel ?? "").trim() || undefined;
  const propertyTypeRaw = String(body.propertyType ?? "").trim();
  const propertyType = propertyTypeRaw === "RESIDENCE" ? "RESIDENCE" : propertyTypeRaw === "PG" ? "PG" : undefined;
  const hasAssignment = Boolean(hostelId && floorNumber && roomNumber && moveInDate);

  if (!fullName || Number.isNaN(monthlyRent) || monthlyRent < 0 || Number.isNaN(rentPaid) || rentPaid < 0 || !paidOnDate) {
    return NextResponse.json({ message: "Name and payment details are required." }, { status: 400 });
  }

  if (session.isLive) {
    if (!hostelId) {
      return NextResponse.json({ message: "Choose a hostel before creating the tenant." }, { status: 400 });
    }

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
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone,
        monthlyRent,
        rentPaid,
        paidOnDate,
        billingCycle,
        billingAnchorDate: hasAssignment ? moveInDate : paidOnDate,
        nextDueDate: calculateNextDueDate(paidOnDate, hasAssignment ? moveInDate : paidOnDate, billingCycle),
        assignment: hasAssignment
          ? { hostelId, floorNumber, roomNumber, sharingType, moveInDate, propertyType, bedId, bedLabel }
          : undefined,
        paymentHistory: [],
      }),
    });
    const payload = (await backendResponse.json()) as { tenant?: unknown; message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message || "Unable to create tenant." }, { status: backendResponse.status });
    }

    return NextResponse.json({ tenant: payload.tenant }, { status: 201 });
  }

  const tenant = createTenantRecord({
    fullName,
    fatherName,
    dateOfBirth,
    phone: phone ?? "",
    email: email ?? "",
    idType: idType as TenantRecord["idType"],
    idNumber: idNumber || PENDING_ID_NUMBER,
    emergencyContactName,
    emergencyContactRelation: emergencyContactRelation as TenantRecord["emergencyContactRelation"],
    emergencyContactPhone,
    monthlyRent,
    rentPaid,
    paidOnDate,
    billingAnchorDate: paidOnDate,
    nextDueDate: calculateNextDueDate(paidOnDate, paidOnDate, billingCycle),
    billingCycle,
  });

  if (hasAssignment) {
    try {
      const assignedTenant = assignTenantRoom(tenant.tenantId, {
        hostelId,
        floorNumber,
        roomNumber,
        sharingType,
        moveInDate,
        propertyType,
        bedId,
        bedLabel,
      });
      return NextResponse.json({ tenant: assignedTenant }, { status: 201 });
    } catch (error) {
      removeTenantRecord(tenant.tenantId);
      return NextResponse.json(
        { message: error instanceof Error ? error.message : "Unable to assign tenant to the selected room." },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({ tenant }, { status: 201 });
}
