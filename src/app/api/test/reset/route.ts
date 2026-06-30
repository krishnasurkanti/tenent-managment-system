import { NextResponse } from "next/server";
import { resetFinanceLedgerEntries } from "@/data/financeLedgerStore";
import { resetOwnerHostel } from "@/data/ownerHostelStore";
import { disableDemoSeeding, resetTenantRecords } from "@/data/tenantStore";

export const dynamic = "force-dynamic";

// Only available in development. Resets in-memory stores to demo state.
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }
  // Reset both demo and live in-memory stores during tests
  resetOwnerHostel(true);
  resetOwnerHostel(false);
  resetTenantRecords(true);
  resetTenantRecords(false);
  resetFinanceLedgerEntries(true);
  resetFinanceLedgerEntries(false);
  // Disable hostel auto-seeding so test-created hostels start empty (reliable even when
  // PLAYWRIGHT_TEST env var is absent due to server reuse).
  disableDemoSeeding();
  return NextResponse.json({ ok: true });
}
