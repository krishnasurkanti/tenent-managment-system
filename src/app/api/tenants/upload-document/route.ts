import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/session-mode";
import { apiRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { saveTenantDocument, validateDocumentFileWithMagicBytes } from "@/lib/document-upload";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (process.env.PLAYWRIGHT_TEST !== "true" && apiRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const docType = String(formData.get("docType") ?? "").trim(); // "tenant_photo" | "id_photo"

  if (!file || !(file instanceof File) || !file.name) {
    return NextResponse.json({ message: "No file provided." }, { status: 400 });
  }
  if (docType !== "tenant_photo" && docType !== "id_photo" && docType !== "receipt") {
    return NextResponse.json({ message: "docType must be tenant_photo, id_photo, or receipt." }, { status: 400 });
  }

  const validationError = await validateDocumentFileWithMagicBytes(file);
  if (validationError) return NextResponse.json({ message: validationError }, { status: 400 });

  try {
    const prefix = `${docType}-${session.ownerId ?? "owner"}`;
    const saved = await saveTenantDocument(file, prefix);
    return NextResponse.json({ url: saved.url, mimeType: saved.mimeType });
  } catch {
    return NextResponse.json({ message: "Failed to upload file." }, { status: 500 });
  }
}
