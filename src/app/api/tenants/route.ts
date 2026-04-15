import { NextResponse } from "next/server";
import { getOwnerHostelInventory } from "@/data/ownerHostelStore";
import { createTenantRecord, getTenantRecords } from "@/data/tenantStore";
import { calculateNextDueDate } from "@/utils/payment";
import { getOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hostelId = searchParams.get("hostelId");
  const tenantId = searchParams.get("tenantId");
  const session = await getOwnerSession();

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

  const tenants = tenantId
    ? allTenants.filter((tenant) => tenant.tenantId === tenantId)
    : hostelId
      ? allTenants.filter((tenant) => tenant.assignment?.hostelId === hostelId)
      : allTenants;

  return NextResponse.json({ tenants, hostels: getOwnerHostelInventory() });
}

export async function POST(request: Request) {
  const session = await getOwnerSession();
  const formData = await request.formData();

  const tenantType = String(formData.get("tenantType") ?? "new").trim().toLowerCase();
  const isOldTenantOnboarding = tenantType === "old";
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const monthlyRent = Number(formData.get("monthlyRent") ?? 0);
  const rentPaid = Number(formData.get("rentPaid") ?? 0);
  const paidOnDate = String(formData.get("paidOnDate") ?? "").trim();
  const idNumber = String(formData.get("idNumber") ?? "").trim();
  const emergencyContact = String(formData.get("emergencyContact") ?? "").trim();
  const idImage = formData.get("idImage");

  const hasValidIdImage = idImage instanceof File && !!idImage.name;

  if (
    !fullName ||
    (!isOldTenantOnboarding && !phone) ||
    (!isOldTenantOnboarding && !email) ||
    Number.isNaN(monthlyRent) ||
    monthlyRent < 0 ||
    Number.isNaN(rentPaid) ||
    rentPaid < 0 ||
    !paidOnDate ||
    (!isOldTenantOnboarding && !idNumber) ||
    (!isOldTenantOnboarding && !emergencyContact) ||
    (!isOldTenantOnboarding && !hasValidIdImage)
  ) {
    return NextResponse.json({ message: "Please fill all tenant details before submitting." }, { status: 400 });
  }

  if (session.isLive) {
    const hostelId = String(formData.get("hostelId") ?? "").trim();
    const floorNumber = Number(formData.get("floorNumber") ?? 0);
    const roomNumber = String(formData.get("roomNumber") ?? "").trim();
    const sharingType = String(formData.get("sharingType") ?? "").trim();
    const moveInDate = String(formData.get("moveInDate") ?? "").trim();

    if (!hostelId || !floorNumber || !roomNumber || !sharingType || !moveInDate) {
      return NextResponse.json({ message: "Please choose hostel, room, floor, sharing type, and move-in date." }, { status: 400 });
    }

    const backendResponse = await backendFetch("/api/tenants", {
      method: "POST",
      body: JSON.stringify({
        hostel_id: hostelId,
        fullName,
        phone,
        email,
        monthlyRent,
        rentPaid,
        paidOnDate,
        billingAnchorDate: moveInDate,
        nextDueDate: calculateNextDueDate(paidOnDate, moveInDate),
        idNumber: idNumber || "PENDING-ID",
        emergencyContact: emergencyContact || "To be added later",
        idImageName: hasValidIdImage ? idImage.name : "pending-id-upload",
        assignment: {
          hostelId,
          floorNumber,
          roomNumber,
          sharingType,
          moveInDate,
        },
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
    phone,
    email,
    monthlyRent,
    rentPaid,
    paidOnDate,
    billingAnchorDate: paidOnDate,
    nextDueDate: calculateNextDueDate(paidOnDate, paidOnDate),
    idNumber: idNumber || "PENDING-ID",
    emergencyContact: emergencyContact || "To be added later",
    idImageName: hasValidIdImage ? idImage.name : "pending-id-upload",
  });

  return NextResponse.json({ tenant }, { status: 201 });
}
