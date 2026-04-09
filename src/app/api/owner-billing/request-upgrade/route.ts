import { NextResponse } from "next/server";
import { requestPlanUpgrade } from "@/data/adminStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    hostelId?: string;
    requestedPlanId?: "starter" | "growth" | "pro" | "scale";
    note?: string;
  };

  if (!body.hostelId || !body.requestedPlanId) {
    return NextResponse.json({ message: "hostelId and requestedPlanId are required." }, { status: 400 });
  }

  try {
    const upgradeRequest = requestPlanUpgrade(body.hostelId, body.requestedPlanId, body.note ?? "");
    return NextResponse.json({ upgradeRequest }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to request upgrade.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
