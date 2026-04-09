import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOwnerBilling } from "@/data/adminStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const hostelId = request.nextUrl.searchParams.get("hostelId");

  if (!hostelId) {
    return NextResponse.json({ message: "hostelId is required." }, { status: 400 });
  }

  try {
    return NextResponse.json(getOwnerBilling(hostelId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load billing.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
