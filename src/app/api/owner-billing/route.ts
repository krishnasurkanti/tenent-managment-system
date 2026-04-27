import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOwnerHostels } from "@/data/ownerHostelStore";
import { getOwnerBilling } from "@/data/adminStore";
import { getTenantRecords } from "@/data/tenantStore";
import { requireOwnerSession } from "@/lib/session-mode";

export const dynamic = "force-dynamic";

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

function getCycleWindow(anchorDateIso: string) {
  const anchor = new Date(anchorDateIso);
  const now = new Date();
  const anchorDay = anchor.getDate();

  let cycleStart = new Date(now.getFullYear(), now.getMonth(), anchorDay);
  if (cycleStart > now) {
    cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, anchorDay);
  }
  if (cycleStart < anchor) {
    cycleStart = new Date(anchor);
  }

  const nextBillingDate = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, anchorDay);
  return { cycleStart, nextBillingDate };
}

export async function GET(request: NextRequest) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const hostelId = request.nextUrl.searchParams.get("hostelId");
  if (!hostelId) {
    return NextResponse.json({ message: "hostelId is required." }, { status: 400 });
  }

  const hostel = getOwnerHostels().find((item) => item.id === hostelId);
  if (!hostel) {
    return NextResponse.json({ message: "Hostel not found." }, { status: 404 });
  }

  try {
    const billing = getOwnerBilling(hostelId);
    const hostelTenants = getTenantRecords().filter((tenant) => tenant.assignment?.hostelId === hostelId);
    const monthlyTenants = hostelTenants.filter((tenant) => !tenant.billingCycle || tenant.billingCycle === "monthly");
    const weeklyTenantCount = hostelTenants.filter((tenant) => tenant.billingCycle === "weekly").length;
    const dailyTenantCount = hostelTenants.filter((tenant) => tenant.billingCycle === "daily").length;

    const { cycleStart, nextBillingDate } = getCycleWindow(hostel.createdAt);
    const cutoff = new Date(nextBillingDate.getTime() - TEN_DAYS_MS);
    const monthlyTenantCount = monthlyTenants.filter((tenant) => new Date(tenant.paidOnDate) < cutoff).length;
    const nextMonthCount = monthlyTenants.filter((tenant) => new Date(tenant.paidOnDate) >= cutoff).length;

    return NextResponse.json({
      ...billing,
      weeklyTenantCount,
      dailyTenantCount,
      monthlyTenantCount,
      nextMonthCount,
      cycleStart: cycleStart.toISOString().slice(0, 10),
      nextBillingDate: nextBillingDate.toISOString().slice(0, 10),
      onboardingDate: hostel.createdAt.slice(0, 10),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load billing.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
