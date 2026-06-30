import { NextResponse } from "next/server";
import { backendFetch } from "@/services/core/backend-api";
import { requireOwnerSession } from "@/lib/session-mode";
import { apiRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { submitPaymentProof } from "@/data/adminStore";
import { parseJsonBody } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (process.env.NODE_ENV === "production" && apiRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }

  const { body, error: jsonError } = await parseJsonBody<{ paymentMethod?: "online" | "manual"; txnId?: string; screenshotDataUrl?: string; hostelId?: string }>(request);
  if (jsonError) return jsonError;

  if (!session.isLive) {
    const hostelId = body.hostelId ?? session.ownerId ?? "";
    const txnId = (body.txnId ?? "").trim();
    if (!txnId && !body.screenshotDataUrl) {
      return NextResponse.json({ message: "Provide transaction ID or payment screenshot." }, { status: 400 });
    }
    const invoice = submitPaymentProof(hostelId, {
      txnId,
      screenshotDataUrl: body.screenshotDataUrl,
      submittedAt: new Date().toISOString(),
    });
    return NextResponse.json({ invoice, message: "Proof submitted. Awaiting admin approval." });
  }

  const response = await backendFetch("/api/owner/billing/pay", {
    method: "POST",
    body: JSON.stringify({ paymentMethod: body.paymentMethod ?? "online" }),
  });
  const payload = (await response.json()) as unknown;
  return NextResponse.json(payload, { status: response.status });
}
