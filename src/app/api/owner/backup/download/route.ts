import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/session-mode";
import { getBackupById } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ message: "Backup id is required." }, { status: 400 });
  }

  const snapshot = getBackupById(id);

  if (!snapshot) {
    return NextResponse.json({ message: "Backup not found." }, { status: 404 });
  }

  const filename = id.replace(/\.json$/, "") + "-backup.json";

  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
