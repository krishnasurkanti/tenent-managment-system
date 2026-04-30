import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    hostelId?: string;
    planId?: string;
    freeMonthsRemaining?: number;
    // pricingOverride and discountPercent not supported in new billing system
  };

  if (!body.hostelId) {
    return NextResponse.json({ message: "hostelId is required." }, { status: 400 });
  }

  const ownerId = Number(body.hostelId);
  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    return NextResponse.json({ message: "Invalid hostelId." }, { status: 400 });
  }

  const payload: Record<string, unknown> = { owner_id: ownerId };
  if (body.planId !== undefined) payload.plan = body.planId;
  if (body.freeMonthsRemaining !== undefined) payload.free_months = Number(body.freeMonthsRemaining);

  if (Object.keys(payload).length === 1) {
    return NextResponse.json({ message: "No supported fields to update." }, { status: 400 });
  }

  const response = await backendFetch("/api/admin/billing/override-billing", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as unknown;
  return NextResponse.json(data, { status: response.status });
}
