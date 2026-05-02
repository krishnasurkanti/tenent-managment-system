import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { invoiceId?: string; status?: string };

  if (!body.invoiceId || !body.status) {
    return NextResponse.json({ message: "invoiceId and status are required." }, { status: 400 });
  }

  const invoiceId = Number(body.invoiceId);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return NextResponse.json({ message: "Invalid invoiceId." }, { status: 400 });
  }

  // Backend only supports "paid" | "pending"; map "failed" → "pending"
  const status = body.status === "paid" ? "paid" : "pending";

  const response = await backendFetch("/api/admin/billing/mark-paid", {
    method: "POST",
    body: JSON.stringify({ invoice_id: invoiceId, status }),
  });
  const payload = (await response.json()) as unknown;
  return NextResponse.json(payload, { status: response.status });
}
