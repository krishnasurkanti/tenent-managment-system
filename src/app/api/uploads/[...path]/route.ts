import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/session-mode";
import path from "node:path";
import fs from "node:fs/promises";

export const dynamic = "force-dynamic";

const UPLOAD_BASE_DIR = path.join(process.cwd(), ".data", "uploads");
const ALLOWED_SUBDIRS = new Set(["tenant-docs", "payment-proofs"]);

// Mime type map for safe Content-Type response headers
const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const segments = (await params).path;
  if (!segments || segments.length < 2) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  const [subdir, ...rest] = segments;

  // Allowlist subdirectories to prevent directory traversal
  if (!ALLOWED_SUBDIRS.has(subdir)) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  // Sanitize each segment — reject any path traversal attempts
  for (const seg of rest) {
    if (seg.includes("..") || seg.includes("/") || seg.includes("\\")) {
      return NextResponse.json({ message: "Invalid path." }, { status: 400 });
    }
  }

  const filename = rest.join("-");
  const filePath = path.join(UPLOAD_BASE_DIR, subdir, filename);

  // Double-check resolved path stays within UPLOAD_BASE_DIR
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(UPLOAD_BASE_DIR))) {
    return NextResponse.json({ message: "Invalid path." }, { status: 400 });
  }

  try {
    const buffer = await fs.readFile(resolved);
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_MAP[ext] ?? "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ message: "File not found." }, { status: 404 });
  }
}
