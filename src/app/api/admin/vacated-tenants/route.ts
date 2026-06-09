import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const period = request.nextUrl.searchParams.get("period") ?? "all";
  const res = await backendFetch(`/api/admin/tenants/vacated?period=${encodeURIComponent(period)}`);
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
