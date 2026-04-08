import { NextResponse } from "next/server";
import { getOwnerHostelInventory } from "@/data/ownerHostelStore";
import { createTenantRecord, getTenantRecords } from "@/data/tenantStore";
import { calculateNextDueDate } from "@/lib/payment-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hostelId = searchParams.get("hostelId");
  const tenantId = searchParams.get("tenantId");
  const allTenants = getTenantRecords();

  const tenants = tenantId
    ? allTenants.filter((tenant) => tenant.tenantId === tenantId)
    : hostelId
      ? allTenants.filter((tenant) => tenant.assignment?.hostelId === hostelId)
      : allTenants;

  return NextResponse.json({ tenants, hostels: getOwnerHostelInventory() });
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const monthlyRent = Number(formData.get("monthlyRent") ?? 0);
  const rentPaid = Number(formData.get("rentPaid") ?? 0);
  const paidOnDate = String(formData.get("paidOnDate") ?? "").trim();
  const idNumber = String(formData.get("idNumber") ?? "").trim();
  const emergencyContact = String(formData.get("emergencyContact") ?? "").trim();
  const idImage = formData.get("idImage");

  if (
    !fullName ||
    !phone ||
    !email ||
    Number.isNaN(monthlyRent) ||
    monthlyRent < 0 ||
    Number.isNaN(rentPaid) ||
    rentPaid < 0 ||
    !paidOnDate ||
    !idNumber ||
    !emergencyContact ||
    !(idImage instanceof File) ||
    !idImage.name
  ) {
    return NextResponse.json({ message: "Please fill all tenant details before submitting." }, { status: 400 });
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
    idNumber,
    emergencyContact,
    idImageName: idImage.name,
  });

  return NextResponse.json({ tenant }, { status: 201 });
}
