import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function sanitizeFileName(fileName: string) {
  const extension = path.extname(fileName) || ".png";
  const baseName = path.basename(fileName, extension).replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 40) || "proof";
  return `${baseName}${extension.toLowerCase()}`;
}

export async function savePaymentProofImage(file: File, tenantId: string) {
  const uploadsDirectory = path.join(process.cwd(), "public", "uploads", "payment-proofs");
  await mkdir(uploadsDirectory, { recursive: true });

  const uniqueFileName = `${tenantId}-${Date.now()}-${sanitizeFileName(file.name)}`;
  const absoluteFilePath = path.join(uploadsDirectory, uniqueFileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(absoluteFilePath, buffer);

  return {
    proofImageName: file.name,
    proofImageUrl: `/uploads/payment-proofs/${uniqueFileName}`,
    proofMimeType: file.type || "",
  };
}
