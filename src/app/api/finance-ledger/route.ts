import { NextResponse } from "next/server";
import { getFinanceLedgerEntries } from "@/data/financeLedgerStore";
import { requireOwnerSession } from "@/lib/session-mode";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const hostelId = searchParams.get("hostelId");

  let entries = getFinanceLedgerEntries(session.isDemo);
  if (hostelId) entries = entries.filter((entry) => entry.hostelId === hostelId);
  if (session.ownerId) entries = entries.filter((entry) => !entry.ownerId || entry.ownerId === session.ownerId);

  return NextResponse.json({ entries });
}
