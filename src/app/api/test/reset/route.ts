import { NextResponse } from "next/server";
import { resetFinanceLedgerEntries } from "@/data/financeLedgerStore";
import { resetOwnerHostel } from "@/data/ownerHostelStore";
import { resetTenantRecords } from "@/data/tenantStore";

export const dynamic = "force-dynamic";

// Only available during Playwright test runs. Resets in-memory stores to demo state.
export async function POST() {
  if (process.env.PLAYWRIGHT_TEST !== "true") {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }
  // Reset both demo and live in-memory stores during tests
  resetOwnerHostel(true);
  resetOwnerHostel(false);
  resetTenantRecords(true);
  resetTenantRecords(false);
  resetFinanceLedgerEntries(true);
  resetFinanceLedgerEntries(false);
  return NextResponse.json({ ok: true });
}
