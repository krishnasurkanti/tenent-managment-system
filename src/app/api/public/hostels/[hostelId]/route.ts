import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hostelId: string }> },
) {
  const { hostelId } = await params;
  const res = await fetch(
    `${getApiBaseUrl()}/api/complaints/public/hostels/${encodeURIComponent(hostelId)}/info`,
    { cache: "no-store", signal: AbortSignal.timeout(5000) },
  );
  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}
