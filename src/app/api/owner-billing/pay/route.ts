import { NextResponse } from "next/server";
import { ownerPayBilling } from "@/data/adminStore";
import { requireOwnerSession } from "@/lib/session-mode";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = (await request.json()) as {
    hostelId?: string;
    paymentMethod?: "online" | "manual";
  };

  if (!body.hostelId) {
    return NextResponse.json({ message: "hostelId is required." }, { status: 400 });
  }

  try {
    const invoice = ownerPayBilling(body.hostelId, body.paymentMethod ?? "online");
    return NextResponse.json({ invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process payment.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
