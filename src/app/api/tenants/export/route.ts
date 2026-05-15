import { NextResponse } from "next/server";
import { getTenantRecords } from "@/data/tenantStore";
import { requireOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";
import { getDueStatus } from "@/utils/payment";
import type { TenantRecord } from "@/types/tenant";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  // Neutralize CSV formula injection: prefix =, +, -, @, tab, CR with single quote
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[,"\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

function buildCSV(tenants: TenantRecord[]): string {
  const HEADERS = [
    "Tenant ID",
    "Full Name",
    "Phone",
    "Email",
    "Room",
    "Monthly Rent (Rs)",
    "Rent Paid (Rs)",
    "Paid On",
    "Next Due",
    "Status",
    "Billing Cycle",
    "ID Number",
    "Joined",
  ];

  const rows = tenants.map((t) => {
    const { label } = getDueStatus(t.nextDueDate, t.billingCycle);
    return [
      t.tenantId,
      t.fullName,
      t.phone,
      t.email,
      t.assignment?.roomNumber ?? "",
      t.monthlyRent,
      t.rentPaid,
      t.paidOnDate,
      t.nextDueDate,
      label,
      t.billingCycle ?? "monthly",
      t.idNumber,
      t.createdAt.slice(0, 10),
    ]
      .map(csvCell)
      .join(",");
  });

  return [HEADERS.join(","), ...rows].join("\r\n");
}

export async function GET(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const hostelId = searchParams.get("hostelId");

  let tenants: TenantRecord[];

  if (session.isLive) {
    const url = hostelId
      ? `/api/tenants?hostel_id=${encodeURIComponent(hostelId)}`
      : "/api/tenants";
    const backendResponse = await backendFetch(url);
    const payload = (await backendResponse.json()) as { tenants?: TenantRecord[]; message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: payload.message ?? "Unable to export tenants." },
        { status: backendResponse.status },
      );
    }

    tenants = Array.isArray(payload.tenants) ? payload.tenants : [];
  } else {
    tenants = getTenantRecords();
    if (hostelId) tenants = tenants.filter((t) => t.assignment?.hostelId === hostelId);
  }

  const csv = buildCSV(tenants);
  const filename = `tenants-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
