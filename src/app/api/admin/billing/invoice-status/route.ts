import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { backendFetch } from "@/services/core/backend-api";
import { approvePaymentProof, rejectPaymentProof, updateInvoiceStatus } from "@/data/adminStore";
import { parseJsonBody } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { body, error: jsonError } = await parseJsonBody<{ invoiceId?: string; status?: string; action?: "approve" | "reject" }>(request);
  if (jsonError) return jsonError;

  if (!body.invoiceId) {
    return NextResponse.json({ message: "invoiceId required." }, { status: 400 });
  }

  // Demo mode: invoiceId is a string like "inv-hostelId-2026-05"
  const isDemoInvoice = typeof body.invoiceId === "string" && body.invoiceId.startsWith("inv-");

  if (isDemoInvoice) {
    try {
      const action = body.action ?? (body.status === "paid" ? "approve" : body.status === "rejected" ? "reject" : null);
      if (action === "approve") {
        const invoice = approvePaymentProof(body.invoiceId);
        return NextResponse.json({ invoice });
      }
      if (action === "reject") {
        const invoice = rejectPaymentProof(body.invoiceId);
        return NextResponse.json({ invoice });
      }
      // Generic status update
      if (body.status) {
        const invoice = updateInvoiceStatus(body.invoiceId, body.status as "paid" | "pending" | "pending_review" | "rejected" | "failed");
        return NextResponse.json({ invoice });
      }
      return NextResponse.json({ message: "Provide action or status." }, { status: 400 });
    } catch (err) {
      return NextResponse.json({ message: err instanceof Error ? err.message : "Error." }, { status: 400 });
    }
  }

  // Live mode: numeric invoice IDs from backend
  const invoiceId = Number(body.invoiceId);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return NextResponse.json({ message: "Invalid invoiceId." }, { status: 400 });
  }
  const status = body.status === "paid" ? "paid" : "pending";
  const response = await backendFetch("/api/admin/billing/mark-paid", {
    method: "POST",
    body: JSON.stringify({ invoice_id: invoiceId, status }),
  });
  const payload = (await response.json()) as unknown;
  return NextResponse.json(payload, { status: response.status });
}
