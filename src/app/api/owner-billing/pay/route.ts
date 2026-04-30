import { NextResponse } from "next/server";
import { backendFetch } from "@/services/core/backend-api";
import { requireOwnerSession } from "@/lib/session-mode";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = (await request.json()) as { paymentMethod?: "online" | "manual" };

  const response = await backendFetch("/api/owner/billing/pay", {
    method: "POST",
    body: JSON.stringify({ paymentMethod: body.paymentMethod ?? "online" }),
  });
  const payload = (await response.json()) as unknown;
  return NextResponse.json(payload, { status: response.status });
}
