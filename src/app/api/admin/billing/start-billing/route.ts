import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { backendFetch } from "@/services/core/backend-api";
import { parseJsonBody } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { body, error: jsonError } = await parseJsonBody(request);
  if (jsonError) return jsonError;
  const res = await backendFetch("/api/admin/billing/start-billing", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
