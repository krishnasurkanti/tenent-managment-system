import { NextResponse } from "next/server";
import { removeTenantRecord } from "@/data/tenantStore";
import { requireOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const body = (await request.json()) as {
    tenantId?: string;
  };

  if (!body.tenantId) {
    return NextResponse.json({ message: "Tenant ID is required." }, { status: 400 });
  }

  try {
    if (session.isLive) {
      const backendResponse = await backendFetch(`/api/tenants/${encodeURIComponent(body.tenantId)}`, {
        method: "DELETE",
      });
      const payload = (await backendResponse.json()) as { tenant?: unknown; message?: string };

      if (!backendResponse.ok) {
        return NextResponse.json({ message: payload.message || "Unable to remove tenant." }, { status: backendResponse.status });
      }

      return NextResponse.json({ tenant: payload.tenant });
    }

    const tenant = removeTenantRecord(body.tenantId);
    return NextResponse.json({ tenant });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to remove tenant." },
      { status: 400 },
    );
  }
}
