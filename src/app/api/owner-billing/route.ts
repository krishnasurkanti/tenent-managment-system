import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { backendFetch } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const hostelId = request.nextUrl.searchParams.get("hostelId");
  const query = hostelId ? `?hostelId=${encodeURIComponent(hostelId)}` : "";
  const response = await backendFetch(`/api/owner/billing${query}`);
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
