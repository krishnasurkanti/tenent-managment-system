import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/session-mode";
import { getTenantRecords } from "@/data/tenantStore";
import { getOwnerHostels } from "@/data/ownerHostelStore";
import { backendFetch } from "@/services/core/backend-api";
import type { BackupSnapshot } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  let tenants: unknown[];
  let hostels: unknown[];

  if (session.isLive) {
    try {
      const [tenantsRes, hostelsRes] = await Promise.all([
        backendFetch("/api/tenants"),
        backendFetch("/api/hostels"),
      ]);
      const tenantsPayload = (await tenantsRes.json()) as { tenants?: unknown[] };
      const hostelsPayload = (await hostelsRes.json()) as { hostels?: unknown[] };
      tenants = Array.isArray(tenantsPayload.tenants) ? tenantsPayload.tenants : [];
      hostels = Array.isArray(hostelsPayload.hostels) ? hostelsPayload.hostels : [];
    } catch {
      return NextResponse.json({ message: "Unable to fetch data from backend." }, { status: 503 });
    }
  } else {
    tenants = getTenantRecords();
    hostels = getOwnerHostels();
  }

  const snapshot: BackupSnapshot = {
    version: 1,
    createdAt: new Date().toISOString(),
    type: "manual",
    tenants,
    hostels,
  };

  const filename = `hostel-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
