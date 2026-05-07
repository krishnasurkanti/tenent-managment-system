import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/session-mode";
import { createBackup, listBackups } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (session.isLive) {
    return NextResponse.json({
      mode: "live",
      backups: [],
      message: "File backups are not available in live mode. Use JSON export to download a local copy.",
    });
  }

  const backups = listBackups();
  return NextResponse.json({ mode: "demo", backups });
}

export async function POST() {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (session.isLive) {
    return NextResponse.json({ message: "File backups are not available in live mode." }, { status: 400 });
  }

  const backup = createBackup("manual");

  if (!backup) {
    return NextResponse.json({ message: "Failed to create backup. Check server disk permissions." }, { status: 500 });
  }

  return NextResponse.json({ backup }, { status: 201 });
}
