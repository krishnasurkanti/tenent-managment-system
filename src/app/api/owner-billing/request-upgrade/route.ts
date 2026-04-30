import { NextResponse } from "next/server";
import { backendFetch } from "@/services/core/backend-api";
import { requireOwnerSession } from "@/lib/session-mode";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = (await request.json()) as {
    requestedPlanId?: string;
    note?: string;
  };

  if (!body.requestedPlanId) {
    return NextResponse.json({ message: "requestedPlanId is required." }, { status: 400 });
  }

  // Backend expects "requestedPlan", not "requestedPlanId"
  const response = await backendFetch("/api/owner-billing/request-upgrade", {
    method: "POST",
    body: JSON.stringify({
      requestedPlan: body.requestedPlanId,
      note: body.note ?? "",
    }),
  });
  const payload = (await response.json()) as unknown;
  return NextResponse.json(payload, { status: response.status });
}
