import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { hostelId?: string };

  if (!body.hostelId) {
    return NextResponse.json({ message: "hostelId is required." }, { status: 400 });
  }

  const ownerId = Number(body.hostelId);
  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    return NextResponse.json({ message: "Invalid hostelId." }, { status: 400 });
  }

  const response = await backendFetch("/api/admin/billing/generate-invoice", {
    method: "POST",
    body: JSON.stringify({ owner_id: ownerId }),
  });
  const payload = (await response.json()) as unknown;
  return NextResponse.json(payload, { status: response.status });
}
