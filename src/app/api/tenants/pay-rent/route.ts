import { NextResponse } from "next/server";
import { recordTenantPayment } from "@/data/tenantStore";
import { savePaymentProofImage } from "@/lib/payment-proof-upload";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
