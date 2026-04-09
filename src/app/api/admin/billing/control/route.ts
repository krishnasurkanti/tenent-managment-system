import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateBillingControl } from "@/data/adminStore";
import { isAdminAuthenticated } from "@/lib/admin-session";
import type { AdminPlanId } from "@/types/admin";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    hostelId?: string;
    planId?: AdminPlanId;
    pricingOverride?: number | null;
    discountPercent?: number;
    freeMonthsRemaining?: number;
  };

  if (!body.hostelId) {
    return NextResponse.json({ message: "hostelId is required." }, { status: 400 });
  }

  try {
    const control = updateBillingControl(body.hostelId, {
      planId: body.planId,
      pricingOverride: body.pricingOverride,
      discountPercent: body.discountPercent,
      freeMonthsRemaining: body.freeMonthsRemaining,
    });
    return NextResponse.json({ control });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update billing controls.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
