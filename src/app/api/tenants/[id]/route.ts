import path from "node:path";
import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/session-mode";
import { PENDING_ID_IMAGE } from "@/types/tenant";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

async function saveIdImage(file: File, tenantId: string): Promise<string> {
  const extension = path.extname(file.name).toLowerCase() || ".jpg";
  const uniqueName = `${tenantId}-id-${Date.now()}${extension}`;

  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const dir = path.join(process.cwd(), "public", "uploads", "id-proofs");
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, uniqueName), buffer);
    return uniqueName;
  } catch {
    return file.name;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const formData = await request.formData();
  const idNumber = String(formData.get("idNumber") ?? "").trim().toUpperCase();
  const idImage = formData.get("idImage");
  const hasImage = idImage instanceof File && idImage.size > 0;

  if (!idNumber) {
    return NextResponse.json({ message: "ID number is required." }, { status: 400 });
  }

  const MAX_SIZE = 5 * 1024 * 1024;
  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (hasImage && idImage instanceof File) {
    if (idImage.size > MAX_SIZE) return NextResponse.json({ message: "File too large (max 5 MB)." }, { status: 400 });
    if (!ALLOWED.includes(idImage.type)) return NextResponse.json({ message: "Invalid file type." }, { status: 400 });
  }

  let idImageName = PENDING_ID_IMAGE;
  if (hasImage && idImage instanceof File) {
    idImageName = await saveIdImage(idImage, id);
  }

  if (session.isLive) {
    const patch: Record<string, unknown> = { idNumber, idImageName };

    const backendResponse = await backendFetch(`/api/tenants/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });

    const payload = (await backendResponse.json()) as { tenant?: unknown; message?: string };
    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message ?? "Failed to update tenant." }, { status: backendResponse.status });
    }
    return NextResponse.json({ ok: true, tenant: payload.tenant });
  }

  // Mock mode: return success (in-memory store would need a reload anyway)
  return NextResponse.json({ ok: true });
}
