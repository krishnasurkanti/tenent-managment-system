import { NextResponse } from "next/server";
import { addPaymentProof } from "@/data/tenantStore";
import { savePaymentProofImage } from "@/lib/payment-proof-upload";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();

  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const txnId = String(formData.get("txnId") ?? "").trim();
  const proofImage = formData.get("proofImage");

  if (!tenantId || !paymentId) {
    return NextResponse.json({ message: "Tenant and payment record are required." }, { status: 400 });
  }

  const hasProofImage = proofImage instanceof File && proofImage.name;

  if (!txnId && !hasProofImage) {
    return NextResponse.json({ message: "Add a transaction id or payment proof image." }, { status: 400 });
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

    const tenant = addPaymentProof(tenantId, paymentId, txnId, proofImageName, proofImageUrl, proofMimeType);
    return NextResponse.json({ tenant });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to save payment proof." },
      { status: 400 },
    );
  }
}
