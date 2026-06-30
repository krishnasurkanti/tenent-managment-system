import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/session-mode";
import { apiRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { createBackup, restoreFromSnapshot, type BackupSnapshot } from "@/lib/backup";
import { reloadTenantRecords } from "@/data/tenantStore";
import { reloadOwnerHostels } from "@/data/ownerHostelStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (process.env.NODE_ENV === "production" && apiRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }

  if (session.isLive) {
    return NextResponse.json({ message: "Restore is not available in live mode." }, { status: 400 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  const MAX_RESTORE_BYTES = 10 * 1024 * 1024; // 10 MB
  if (contentLength > MAX_RESTORE_BYTES) {
    return NextResponse.json({ message: "Backup file too large (max 10 MB)." }, { status: 413 });
  }

  let snapshot: BackupSnapshot;
  try {
    snapshot = (await request.json()) as BackupSnapshot;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  if (!snapshot || snapshot.version !== 1) {
    return NextResponse.json({ message: "Invalid or unsupported backup format." }, { status: 400 });
  }

  // Safety snapshot before restore
  createBackup("auto");

  const result = restoreFromSnapshot(snapshot);

  if (!result.ok) {
    return NextResponse.json({ message: result.error }, { status: 500 });
  }

  // Reload in-memory state so next requests see restored data without restart
  reloadTenantRecords();
  reloadOwnerHostels();

  return NextResponse.json({ message: `Restored ${result.tenantCount} tenants successfully.`, tenantCount: result.tenantCount });
}
