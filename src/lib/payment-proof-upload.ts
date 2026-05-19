import path from "node:path";
import { UPLOAD_MAX_FILE_SIZE, PROOF_ALLOWED_MIME_TYPES } from "@/lib/document-upload";

function sanitizeFileName(fileName: string) {
  const extension = path.extname(fileName) || ".png";
  const baseName = path.basename(fileName, extension).replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 40) || "proof";
  return `${baseName}${extension.toLowerCase()}`;
}

// Files stored outside public/ — served only via /api/uploads (authenticated)
const UPLOAD_BASE_DIR = path.join(process.cwd(), ".data", "uploads");

export async function savePaymentProofImage(file: File, tenantId: string) {
  if (file.size > UPLOAD_MAX_FILE_SIZE) throw new Error("Proof file too large. Maximum 5 MB.");
  if (!PROOF_ALLOWED_MIME_TYPES.includes(file.type)) throw new Error("Invalid proof file type.");

  // In Playwright tests, skip the actual file write to avoid AV-scan blocking
  if (process.env.PLAYWRIGHT_TEST === "true") {
    return {
      proofImageName: file.name,
      proofImageUrl: `/api/uploads/payment-proofs/test-${tenantId}-${Date.now()}-proof.png`,
      proofMimeType: file.type || "image/png",
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const uploadsDirectory = path.join(UPLOAD_BASE_DIR, "payment-proofs");
    await mkdir(uploadsDirectory, { recursive: true });

    const uniqueFileName = `${tenantId}-${Date.now()}-${sanitizeFileName(file.name)}`;
    await writeFile(path.join(uploadsDirectory, uniqueFileName), buffer);

    return {
      proofImageName: file.name,
      proofImageUrl: `/api/uploads/payment-proofs/${uniqueFileName}`,
      proofMimeType: file.type || "",
    };
  } catch (err) {
    if (err instanceof Error && (err.message.includes("too large") || err.message.includes("Invalid"))) throw err;
    // Read-only filesystem (Vercel) — store as base64 data URL
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/png";
    return {
      proofImageName: file.name,
      proofImageUrl: `data:${mimeType};base64,${base64}`,
      proofMimeType: mimeType,
    };
  }
}
