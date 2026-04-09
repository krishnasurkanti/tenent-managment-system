import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = await backendFetch("/api/admin/upgrade-requests");
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    requestId?: string;
    action?: "approve" | "reject";
  };

  const response = await backendFetch("/api/admin/upgrade-requests", {
    method: "PATCH",
    body: JSON.stringify({
      request_id: body.requestId,
      action: body.action,
    }),
  });
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
