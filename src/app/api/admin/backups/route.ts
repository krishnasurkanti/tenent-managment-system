import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const res = await backendFetch("/api/admin/backups");
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const res = await backendFetch("/api/admin/backups", { method: "POST" });
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
