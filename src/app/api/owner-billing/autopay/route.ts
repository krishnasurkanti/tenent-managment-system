import { NextResponse } from "next/server";
import { backendFetch } from "@/services/core/backend-api";
import { requireOwnerSession } from "@/lib/session-mode";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = (await request.json()) as { enabled?: boolean };

  const response = await backendFetch("/api/owner-billing/autopay", {
    method: "PATCH",
    body: JSON.stringify({ enabled: Boolean(body.enabled) }),
  });
  const payload = (await response.json()) as unknown;
  return NextResponse.json(payload, { status: response.status });
}
