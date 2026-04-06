import { NextResponse } from "next/server";
import { resetOwnerHostel } from "@/data/ownerHostelStore";
import { resetTenantRecords } from "@/data/tenantStore";

export async function POST() {
  const hostel = resetOwnerHostel();
  const tenants = resetTenantRecords();

  return NextResponse.json({
    success: true,
    hostel,
    tenantCount: tenants.length,
  });
}
