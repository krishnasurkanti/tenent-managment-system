import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getPendingProofInvoices } from "@/data/adminStore";
import { getOwnerHostels } from "@/data/ownerHostelStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const invoices = getPendingProofInvoices();
  const hostels = getOwnerHostels();
  const hostelMap = Object.fromEntries(hostels.map((h) => [h.id, h.hostelName]));

  const proofs = invoices.map((inv) => ({
    invoiceId: inv.invoiceId,
    hostelId: inv.hostelId,
    hostelName: hostelMap[inv.hostelId] ?? inv.hostelId,
    monthKey: inv.monthKey,
    finalAmount: inv.finalAmount,
    paymentStatus: inv.paymentStatus,
    proof: inv.proof ?? null,
  }));

  return NextResponse.json({ proofs });
}
