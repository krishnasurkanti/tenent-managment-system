import { NextResponse } from "next/server";
import { assignTenantRoom } from "@/data/tenantStore";
import { requireOwnerSession } from "@/lib/session-mode";
import { apiRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { backendFetch } from "@/services/core/backend-api";
import { calculateNextDueDate } from "@/utils/payment";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (process.env.NODE_ENV === "production" && apiRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }

  let body: {
    tenantId?: string;
    hostelId?: string;
    unitId?: string;
    roomNumber?: string;
    sharingType?: string;
    moveInDate?: string;
    propertyType?: "PG" | "RESIDENCE";
    bedId?: string;
    bedLabel?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  if (!body.tenantId || !body.hostelId || !body.roomNumber || !body.moveInDate) {
    return NextResponse.json({ message: "Please choose hostel, room, and move-in date." }, { status: 400 });
  }
  // sharingType defaults to empty string when omitted (store handles missing value gracefully)
  if (!body.sharingType) body.sharingType = "";

  try {
    if (session.isLive) {
      const existingResponse = await backendFetch(`/api/tenants/${encodeURIComponent(body.tenantId)}`);
      const existingPayload = (await existingResponse.json()) as { tenant?: Record<string, unknown>; message?: string };

      if (!existingResponse.ok || !existingPayload.tenant) {
        return NextResponse.json({ message: existingPayload.message || "Tenant not found." }, { status: existingResponse.status || 404 });
      }

      const tenant = existingPayload.tenant;
      const paidOnDate = typeof tenant.paidOnDate === "string" ? tenant.paidOnDate : "";

      const updateResponse = await backendFetch(`/api/tenants/${encodeURIComponent(body.tenantId)}`, {
        method: "PUT",
        body: JSON.stringify({
          hostel_id: body.hostelId,
          billingAnchorDate: body.moveInDate,
          nextDueDate: calculateNextDueDate(paidOnDate, body.moveInDate),
          assignment: {
            hostelId: body.hostelId,
            unitId: body.unitId,
            roomNumber: body.roomNumber,
            sharingType: body.sharingType,
            moveInDate: body.moveInDate,
            propertyType: body.propertyType,
            bedId: body.bedId,
            bedLabel: body.bedLabel,
          },
        }),
      });
      const updatePayload = (await updateResponse.json()) as { tenant?: unknown; message?: string };

      if (!updateResponse.ok) {
        return NextResponse.json({ message: updatePayload.message || "Unable to assign room." }, { status: updateResponse.status });
      }

      return NextResponse.json({ tenant: updatePayload.tenant });
    }

    const tenant = assignTenantRoom(body.tenantId, {
      hostelId: body.hostelId,
      unitId: body.unitId,
      roomNumber: body.roomNumber,
      sharingType: body.sharingType,
      moveInDate: body.moveInDate,
      propertyType: body.propertyType,
      bedId: body.bedId,
      bedLabel: body.bedLabel,
    }, session.isDemo);

    return NextResponse.json({ tenant });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to assign room." },
      { status: 400 },
    );
  }
}
