import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const body = (await request.json()) as { enabled?: boolean };
  const response = await backendFetch("/api/owner/billing/autopay", {
    method: "PATCH",
    body: JSON.stringify({
      enabled: Boolean(body.enabled),
    }),
  });
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
