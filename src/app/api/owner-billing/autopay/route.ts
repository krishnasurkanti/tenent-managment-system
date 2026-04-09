import { NextResponse } from "next/server";
import { setOwnerAutoPay } from "@/data/adminStore";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const body = (await request.json()) as { hostelId?: string; enabled?: boolean };

  if (!body.hostelId) {
    return NextResponse.json({ message: "hostelId is required." }, { status: 400 });
  }

  try {
    const control = setOwnerAutoPay(body.hostelId, Boolean(body.enabled));
    return NextResponse.json({ hostelId: control.hostelId, autoPayEnabled: control.autoPayEnabled });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update auto-pay.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
