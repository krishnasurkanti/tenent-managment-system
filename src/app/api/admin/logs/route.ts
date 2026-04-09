import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminLogs } from "@/data/adminStore";
import { isAdminAuthenticated } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ logs: getAdminLogs() });
}
