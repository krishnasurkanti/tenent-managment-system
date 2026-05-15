import path from "node:path";

export const UPLOAD_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const UPLOAD_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
// Payment proofs: images or PDF receipts — GIF excluded (polyglot risk)
export const PROOF_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// Magic byte signatures for allowed image types
const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",  bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF header; webp has WEBP at offset 8
  { mime: "image/heic", bytes: [] }, // HEIC detection is complex; skip magic check, rely on extension
  { mime: "image/heif", bytes: [] },
];

function detectMimeFromBytes(buffer: Buffer): string | null {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return "image/webp";
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return "application/pdf";
  return null;
}

export function validateDocumentFile(file: File): string | null {
  if (file.size > UPLOAD_MAX_FILE_SIZE) return "File too large. Maximum 5 MB.";
  if (!UPLOAD_ALLOWED_MIME_TYPES.includes(file.type)) return "Invalid file type. Use JPEG, PNG, or WebP.";
  return null;
}

export async function validateDocumentFileWithMagicBytes(file: File): Promise<string | null> {
  const basicError = validateDocumentFile(file);
  if (basicError) return basicError;

  // Skip magic check for HEIC/HEIF — complex container format
  if (file.type === "image/heic" || file.type === "image/heif") return null;

  const headerBytes = Buffer.from(await file.slice(0, 12).arrayBuffer());
  const detectedMime = detectMimeFromBytes(headerBytes);

  if (!detectedMime) return "File content does not match an allowed image format.";
  if (detectedMime !== file.type) return "File extension does not match actual file content.";

  return null;
}

export async function validatePaymentProofWithMagicBytes(file: File): Promise<string | null> {
  if (file.size > UPLOAD_MAX_FILE_SIZE) return "Proof file too large. Maximum 5 MB.";
  if (!PROOF_ALLOWED_MIME_TYPES.includes(file.type)) {
    return "Invalid file type. Allowed: JPEG, PNG, WebP, PDF.";
  }

  const headerBytes = Buffer.from(await file.slice(0, 12).arrayBuffer());
  const detectedMime = detectMimeFromBytes(headerBytes);

  if (!detectedMime) return "File content does not match an allowed format.";
  if (detectedMime !== file.type) return "File extension does not match actual file content.";

  return null;
}

function sanitizeFileName(fileName: string) {
  const extension = path.extname(fileName) || ".jpg";
  return `${path.basename(fileName, extension).replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 30)}${extension.toLowerCase()}`;
}

// Files are stored outside public/ — served only via /api/uploads (authenticated)
const UPLOAD_BASE_DIR = path.join(process.cwd(), ".data", "uploads");

export async function saveTenantDocument(file: File, prefix: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const uniqueName = `${prefix}-${Date.now()}-${sanitizeFileName(file.name)}`;

  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const dir = path.join(UPLOAD_BASE_DIR, "tenant-docs");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, uniqueName), buffer);
    return {
      url: `/api/uploads/tenant-docs/${uniqueName}`,
      mimeType: file.type || "image/jpeg",
    };
  } catch {
    // Read-only filesystem (Vercel) — store as base64 data URL
    const mimeType = file.type || "image/jpeg";
    return {
      url: `data:${mimeType};base64,${buffer.toString("base64")}`,
      mimeType,
    };
  }
}
