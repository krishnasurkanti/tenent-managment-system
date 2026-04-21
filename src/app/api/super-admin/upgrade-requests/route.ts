import { NextResponse } from "next/server";
import { decideUpgradeRequest, getUpgradeRequests } from "@/data/adminStore";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ requests: getUpgradeRequests() });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    requestId?: string;
    action?: "approve" | "reject";
  };

  if (!body.requestId || !body.action) {
    return NextResponse.json({ message: "requestId and action are required." }, { status: 400 });
  }

  try {
    const result = decideUpgradeRequest(body.requestId, body.action);
    return NextResponse.json({ request: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to decide request.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
