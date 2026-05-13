import path from "node:path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function validateDocumentFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return "File too large. Maximum 5 MB.";
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return "Invalid file type. Use JPEG, PNG, or WebP.";
  return null;
}

function sanitizeFileName(fileName: string) {
  const extension = path.extname(fileName) || ".jpg";
  return `${path.basename(fileName, extension).replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 30)}${extension.toLowerCase()}`;
}

export async function saveTenantDocument(file: File, prefix: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const uniqueName = `${prefix}-${Date.now()}-${sanitizeFileName(file.name)}`;

  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const dir = path.join(process.cwd(), "public", "uploads", "tenant-docs");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, uniqueName), buffer);
    return {
      url: `/uploads/tenant-docs/${uniqueName}`,
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
