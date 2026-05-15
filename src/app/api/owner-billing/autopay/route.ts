import { NextResponse } from "next/server";
import { backendFetch } from "@/services/core/backend-api";
import { requireOwnerSession } from "@/lib/session-mode";
import { parseJsonBody } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { body, error: jsonError } = await parseJsonBody<{ enabled?: boolean }>(request);
  if (jsonError) return jsonError;

  const response = await backendFetch("/api/owner-billing/autopay", {
    method: "PATCH",
    body: JSON.stringify({ enabled: Boolean(body.enabled) }),
  });
  const payload = (await response.json()) as unknown;
  return NextResponse.json(payload, { status: response.status });
}
