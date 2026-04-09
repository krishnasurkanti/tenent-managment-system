import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    requestedPlanId?: "starter" | "growth" | "pro" | "scale";
    note?: string;
  };

  const response = await backendFetch("/api/owner/billing/request-upgrade", {
    method: "POST",
    body: JSON.stringify({
      requestedPlan: body.requestedPlanId,
      note: body.note,
    }),
  });
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
