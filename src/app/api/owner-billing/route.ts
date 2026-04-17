import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOwnerSession } from "@/lib/session-mode";
import { getTenantRecords } from "@/data/tenantStore";
import { getOwnerHostels } from "@/data/ownerHostelStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getOwnerSession();

  if (session.mode === "guest") {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const hostelId = request.nextUrl.searchParams.get("hostelId");
  if (!hostelId) {
    return NextResponse.json({ message: "hostelId is required." }, { status: 400 });
  }

  const hostels = getOwnerHostels();
  const hostel = hostels.find((h) => h.id === hostelId);
  if (!hostel) {
    return NextResponse.json({ message: "Hostel not found." }, { status: 404 });
  }

  const allTenants = getTenantRecords();
  const hostelTenants = allTenants.filter((t) => t.assignment?.hostelId === hostelId);

  const monthlyCount = hostelTenants.filter((t) => !t.billingCycle || t.billingCycle === "monthly").length;
  const weeklyCount = hostelTenants.filter((t) => t.billingCycle === "weekly").length;
  const dailyCount = hostelTenants.filter((t) => t.billingCycle === "daily").length;

  // Today + 30 days as trial end
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);

  return NextResponse.json({
    hostelId,
    hostelName: hostel.hostelName,
    plan: "trial",
    trialActive: true,
    trialEndsAt: trialEnd.toISOString().slice(0, 10),
    monthlyTenantCount: monthlyCount,
    weeklyTenantCount: weeklyCount,
    dailyTenantCount: dailyCount,
    totalTenants: hostelTenants.length,
  });
}
