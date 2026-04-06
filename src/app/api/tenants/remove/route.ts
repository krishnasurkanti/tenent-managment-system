import { NextResponse } from "next/server";
import { removeTenantRecord } from "@/data/tenantStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    tenantId?: string;
  };

  if (!body.tenantId) {
    return NextResponse.json({ message: "Tenant ID is required." }, { status: 400 });
  }

  try {
    const tenant = removeTenantRecord(body.tenantId);
    return NextResponse.json({ tenant });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to remove tenant." },
      { status: 400 },
    );
  }
}
