import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    paymentMethod?: "online" | "manual";
  };

  const response = await backendFetch("/api/owner/billing/pay", {
    method: "POST",
    body: JSON.stringify({
      paymentMethod: body.paymentMethod ?? "online",
    }),
  });
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
