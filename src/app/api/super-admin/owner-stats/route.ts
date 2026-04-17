import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getOwners } from "@/data/ownersStore";
import { getHostelsByOwnerId } from "@/data/ownerHostelStore";
import { getTenantRecords } from "@/data/tenantStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const owners = getOwners();
  const allTenants = getTenantRecords();

  const stats = owners.map((owner) => {
    const hostels = getHostelsByOwnerId(owner.id);
    const hostelIds = new Set(hostels.map((h) => h.id));
    const tenantCount = allTenants.filter(
      (t) => t.assignment?.hostelId && hostelIds.has(t.assignment.hostelId),
    ).length;

    return {
      ownerId: owner.id,
      hostelCount: hostels.length,
      hostelNames: hostels.map((h) => h.hostelName),
      tenantCount,
    };
  });

  return NextResponse.json({ stats });
}
