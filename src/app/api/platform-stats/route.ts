import { NextResponse } from "next/server";
import { backendFetch } from "@/services/core/backend-api";
import { requireOwnerSession } from "@/lib/session-mode";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const response = await backendFetch("/api/platform-stats");
  if (!response.ok) {
    return NextResponse.json({ owners: 0, hostels: 0, tenants: 0 }, { status: 200 });
  }

  const data = (await response.json()) as { owners: number; hostels: number; tenants: number };
  return NextResponse.json(data);
}
