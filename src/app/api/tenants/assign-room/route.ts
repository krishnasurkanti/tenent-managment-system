import { NextResponse } from "next/server";
import { assignTenantRoom } from "@/data/tenantStore";
import { getOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";
import { calculateNextDueDate } from "@/utils/payment";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getOwnerSession();

  if (session.mode === "guest") {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    tenantId?: string;
    hostelId?: string;
    floorNumber?: number;
    roomNumber?: string;
    sharingType?: string;
    moveInDate?: string;
    propertyType?: "PG" | "RESIDENCE";
    bedId?: string;
    bedLabel?: string;
  };

  if (!body.tenantId || !body.hostelId || !body.floorNumber || !body.roomNumber || !body.sharingType || !body.moveInDate) {
    return NextResponse.json({ message: "Please choose hostel, floor, room, sharing type, and move-in date." }, { status: 400 });
  }

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
            floorNumber: body.floorNumber,
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
      floorNumber: body.floorNumber,
      roomNumber: body.roomNumber,
      sharingType: body.sharingType,
      moveInDate: body.moveInDate,
      propertyType: body.propertyType,
      bedId: body.bedId,
      bedLabel: body.bedLabel,
    });

    return NextResponse.json({ tenant });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to assign room." },
      { status: 400 },
    );
  }
}
