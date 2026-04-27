import { NextResponse } from "next/server";
import { recordTenantPayment } from "@/data/tenantStore";
import { savePaymentProofImage } from "@/lib/payment-proof-upload";
import { requireOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";
import { calculateNextDueDate, getDueStatus } from "@/utils/payment";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  // In demo mode only the demo-owner may record payments (local owners must upgrade to live)
  if (session.isDemo && session.ownerId !== "demo-owner") {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const formData = await request.formData();

  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const paidOnDate = String(formData.get("paidOnDate") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim().toLowerCase();
  const txnId = String(formData.get("txnId") ?? "").trim();
  const proofImage = formData.get("proofImage");

  if (!tenantId || !paidOnDate || Number.isNaN(amount) || amount < 0 || !paymentMethod) {
    return NextResponse.json({ message: "Tenant, payment amount, payment mode, and paid date are required." }, { status: 400 });
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

  if (proofImage instanceof File && proofImage.name) {
    if (proofImage.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: "Proof file is too large. Maximum size is 5 MB." }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.includes(proofImage.type)) {
      return NextResponse.json({ message: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF." }, { status: 400 });
    }
  }

  try {
    let proofImageName = "";
    let proofImageUrl = "";
    let proofMimeType = "";

    if (proofImage instanceof File && proofImage.name) {
      const savedProof = await savePaymentProofImage(proofImage, tenantId);
      proofImageName = savedProof.proofImageName;
      proofImageUrl = savedProof.proofImageUrl;
      proofMimeType = savedProof.proofMimeType;
    }

    if (session.isLive) {
      const existingResponse = await backendFetch(`/api/tenants/${encodeURIComponent(tenantId)}`);
      const existingPayload = (await existingResponse.json()) as { tenant?: Record<string, unknown>; message?: string };

      if (!existingResponse.ok || !existingPayload.tenant) {
        return NextResponse.json({ message: existingPayload.message || "Tenant not found." }, { status: existingResponse.status || 404 });
      }

      const tenant = existingPayload.tenant;
      const billingAnchorDate = typeof tenant.billingAnchorDate === "string" ? tenant.billingAnchorDate : paidOnDate;
      const nextDueDate = calculateNextDueDate(paidOnDate, billingAnchorDate);
      const paymentHistory = Array.isArray(tenant.paymentHistory) ? tenant.paymentHistory : [];
      const tone = getDueStatus(nextDueDate).tone;

      const updateResponse = await backendFetch(`/api/tenants/${encodeURIComponent(tenantId)}`, {
        method: "PUT",
        body: JSON.stringify({
          rentPaid: amount,
          paidOnDate,
          nextDueDate,
          paymentHistory: [
            {
              paymentId: `pay-${tenantId}-${Date.now()}`,
              amount,
              paidOnDate,
              nextDueDate,
              status: tone === "green" ? "active" : tone === "orange" || tone === "yellow" ? "due-soon" : "overdue",
              paymentMethod: paymentMethod === "online" ? "online" : "cash",
              txnId,
              proofImageName,
              proofImageUrl,
              proofMimeType,
            },
            ...paymentHistory,
          ],
        }),
      });
      const updatePayload = (await updateResponse.json()) as { tenant?: unknown; message?: string };

      if (!updateResponse.ok) {
        return NextResponse.json({ message: updatePayload.message || "Unable to record payment." }, { status: updateResponse.status });
      }

      return NextResponse.json({ tenant: updatePayload.tenant });
    }

    const tenant = recordTenantPayment(
      tenantId,
      amount,
      paidOnDate,
      paymentMethod === "online" ? "online" : "cash",
      txnId,
      proofImageName,
      proofImageUrl,
      proofMimeType,
    );
    return NextResponse.json({ tenant });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to record payment." },
      { status: 400 },
    );
  }
}
