import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateInvoiceStatus } from "@/data/adminStore";
import { isAdminAuthenticated } from "@/lib/admin-session";
import type { PaymentStatus } from "@/types/admin";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    invoiceId?: string;
    status?: PaymentStatus;
  };

  if (!body.invoiceId || !body.status) {
    return NextResponse.json({ message: "invoiceId and status are required." }, { status: 400 });
  }

  try {
    const invoice = updateInvoiceStatus(body.invoiceId, body.status);
    return NextResponse.json({ invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update invoice status.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
