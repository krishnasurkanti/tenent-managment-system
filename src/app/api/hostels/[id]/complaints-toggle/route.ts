import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/session-mode";
import { apiRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { backendFetch } from "@/services/core/backend-api";
import { parseJsonBody } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (process.env.NODE_ENV === "production" && apiRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }

  const { body, error: jsonError } = await parseJsonBody(request);
  if (jsonError) return jsonError;
  const res = await backendFetch(`/api/complaints/hostels/${encodeURIComponent(id)}/toggle`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
