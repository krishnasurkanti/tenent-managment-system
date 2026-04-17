import { NextResponse } from "next/server";
import { addPaymentProof } from "@/data/tenantStore";
import { savePaymentProofImage } from "@/lib/payment-proof-upload";
import { getOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getOwnerSession();

  if (session.mode === "guest") {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();

  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const txnId = String(formData.get("txnId") ?? "").trim();
  const proofImage = formData.get("proofImage");

  if (!tenantId || !paymentId) {
    return NextResponse.json({ message: "Tenant and payment record are required." }, { status: 400 });
  }

  const hasProofImage = proofImage instanceof File && !!proofImage.name;

  if (!txnId && !hasProofImage) {
    return NextResponse.json({ message: "Add a transaction id or payment proof image." }, { status: 400 });
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

  if (hasProofImage && proofImage instanceof File) {
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

    if (hasProofImage) {
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
      const paymentHistory = Array.isArray(tenant.paymentHistory) ? tenant.paymentHistory : [];
      const nextPaymentHistory = paymentHistory.map((payment) =>
        payment && typeof payment === "object" && (payment as { paymentId?: string }).paymentId === paymentId
          ? {
              ...(payment as Record<string, unknown>),
              txnId: txnId || (payment as { txnId?: string }).txnId || "",
              proofImageName: proofImageName || (payment as { proofImageName?: string }).proofImageName || "",
              proofImageUrl: proofImageUrl || (payment as { proofImageUrl?: string }).proofImageUrl || "",
              proofMimeType: proofMimeType || (payment as { proofMimeType?: string }).proofMimeType || "",
            }
          : payment,
      );

      const updateResponse = await backendFetch(`/api/tenants/${encodeURIComponent(tenantId)}`, {
        method: "PUT",
        body: JSON.stringify({
          paymentHistory: nextPaymentHistory,
        }),
      });
      const updatePayload = (await updateResponse.json()) as { tenant?: unknown; message?: string };

      if (!updateResponse.ok) {
        return NextResponse.json({ message: updatePayload.message || "Unable to save payment proof." }, { status: updateResponse.status });
      }

      return NextResponse.json({ tenant: updatePayload.tenant });
    }

    const tenant = addPaymentProof(tenantId, paymentId, txnId, proofImageName, proofImageUrl, proofMimeType);
    return NextResponse.json({ tenant });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to save payment proof." },
      { status: 400 },
    );
  }
}
