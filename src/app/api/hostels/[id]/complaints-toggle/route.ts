import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = await request.json();
  const res = await backendFetch(`/api/complaints/hostels/${encodeURIComponent(id)}/toggle`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
