import { NextResponse } from "next/server";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

type BackendRequest = {
  id: number;
  owner_id: number;
  owner_name: string;
  current_plan: string;
  requested_plan: string;
  note: string;
  status: string;
  created_at: string;
};

export async function GET() {
  const response = await backendFetch("/api/admin/billing/upgrade-requests");
  if (!response.ok) {
    const payload = (await response.json()) as unknown;
    return NextResponse.json(payload, { status: response.status });
  }

  const { requests } = (await response.json()) as { requests: BackendRequest[] };

  const transformed = requests.map((r) => ({
    requestId: String(r.id),
    hostelId: String(r.owner_id),
    hostelName: r.owner_name,
    currentPlanId: r.current_plan,
    requestedPlanId: r.requested_plan,
    note: r.note,
    status: r.status,
    requestedAt: r.created_at,
  }));

  return NextResponse.json({ requests: transformed });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    requestId?: string;
    action?: "approve" | "reject";
  };

  const response = await backendFetch("/api/admin/billing/upgrade-requests", {
    method: "PATCH",
    body: JSON.stringify({
      request_id: Number(body.requestId),
      action: body.action,
    }),
  });
  const payload = (await response.json()) as unknown;
  return NextResponse.json(payload, { status: response.status });
}
