import { NextResponse } from "next/server";
import { resetOwnerHostel } from "@/data/ownerHostelStore";
import { resetTenantRecords } from "@/data/tenantStore";

export const dynamic = "force-dynamic";

// Only available during Playwright test runs. Resets in-memory stores to demo state.
export async function POST() {
  if (process.env.PLAYWRIGHT_TEST !== "true") {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }
  resetOwnerHostel();
  resetTenantRecords();
  return NextResponse.json({ ok: true });
}
