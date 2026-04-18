import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOwnerSession } from "@/lib/session-mode";
import { getTenantRecords } from "@/data/tenantStore";
import { getOwnerHostels } from "@/data/ownerHostelStore";
import { getOwnerById } from "@/data/ownersStore";
import { getDemoOwnerProfile } from "@/lib/demo-auth";

export const dynamic = "force-dynamic";

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getBillingCycle(onboardingDateIso: string): {
  cycleStart: Date;
  nextBillingDate: Date;
  trialEndsAt: Date;
} {
  const onboarding = new Date(onboardingDateIso);
  const now = new Date();

  const trialEndsAt = new Date(onboarding.getTime() + THIRTY_DAYS_MS);

  // Billing repeats on the same day-of-month as onboarding
  const billingDay = onboarding.getDate();

  // Find the most recent billing date on or before today
  let cycleStart = new Date(now.getFullYear(), now.getMonth(), billingDay);
  if (cycleStart > now) {
    cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, billingDay);
  }
  // Don't go before the onboarding date
  if (cycleStart < onboarding) {
    cycleStart = new Date(onboarding);
  }

  const nextBillingDate = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, billingDay);

  return { cycleStart, nextBillingDate, trialEndsAt };
}

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

  // Resolve onboarding date and plan info from owner record
  let onboardingDate: string;
  let plan = "trial";
  let planStatus = "trial";

  if (session.mode === "demo" && session.ownerId === "demo-owner") {
    onboardingDate = getDemoOwnerProfile().created_at;
  } else if (session.ownerId) {
    const owner = getOwnerById(session.ownerId);
    if (owner) {
      onboardingDate = owner.trialStartDate;
      plan = owner.plan;
      planStatus = owner.planStatus;
    } else {
      onboardingDate = new Date().toISOString();
    }
  } else {
    onboardingDate = new Date().toISOString();
  }

  const { cycleStart, nextBillingDate, trialEndsAt } = getBillingCycle(onboardingDate);

  const allTenants = getTenantRecords();
  const hostelTenants = allTenants.filter((t) => t.assignment?.hostelId === hostelId);

  const monthlyTenants = hostelTenants.filter((t) => !t.billingCycle || t.billingCycle === "monthly");
  const weeklyCount = hostelTenants.filter((t) => t.billingCycle === "weekly").length;
  const dailyCount = hostelTenants.filter((t) => t.billingCycle === "daily").length;

  // Cutoff: 10 days before next billing date
  const cutoff = new Date(nextBillingDate.getTime() - TEN_DAYS_MS);

  // Tenants who joined before the cutoff count in the current cycle
  const currentMonthCount = monthlyTenants.filter((t) => new Date(t.paidOnDate) < cutoff).length;
  // Tenants who joined within 10 days of next billing date count next cycle
  const nextMonthCount = monthlyTenants.filter((t) => new Date(t.paidOnDate) >= cutoff).length;

  return NextResponse.json({
    hostelId,
    hostelName: hostel.hostelName,
    plan,
    planStatus,
    trialActive: planStatus === "trial",
    trialEndsAt: trialEndsAt.toISOString().slice(0, 10),
    cycleStart: cycleStart.toISOString().slice(0, 10),
    nextBillingDate: nextBillingDate.toISOString().slice(0, 10),
    onboardingDate: new Date(onboardingDate).toISOString().slice(0, 10),
    monthlyTenantCount: currentMonthCount,
    nextMonthCount,
    weeklyTenantCount: weeklyCount,
    dailyTenantCount: dailyCount,
    totalTenants: hostelTenants.length,
  });
}
