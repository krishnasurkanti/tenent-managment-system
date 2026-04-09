import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateInvoice } from "@/data/adminStore";
import { isAdminAuthenticated } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    hostelId?: string;
    monthKey?: string;
  };

  if (!body.hostelId) {
    return NextResponse.json({ message: "hostelId is required." }, { status: 400 });
  }

  try {
    const invoice = generateInvoice(body.hostelId, body.monthKey);
    return NextResponse.json({ invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate invoice.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
