import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const hostelId = searchParams.get("hostelId");

  const qs = hostelId ? `?hostelId=${encodeURIComponent(hostelId)}` : "";
  const res = await backendFetch(`/api/complaints/${qs}`);
  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}
