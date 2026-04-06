import { NextResponse } from "next/server";
import { assignTenantRoom } from "@/data/tenantStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    tenantId?: string;
    hostelId?: string;
    floorNumber?: number;
    roomNumber?: string;
    sharingType?: string;
    moveInDate?: string;
  };

  if (!body.tenantId || !body.hostelId || !body.floorNumber || !body.roomNumber || !body.sharingType || !body.moveInDate) {
    return NextResponse.json({ message: "Please choose hostel, floor, room, sharing type, and move-in date." }, { status: 400 });
  }

  try {
    const tenant = assignTenantRoom(body.tenantId, {
      hostelId: body.hostelId,
      floorNumber: body.floorNumber,
      roomNumber: body.roomNumber,
      sharingType: body.sharingType,
      moveInDate: body.moveInDate,
    });

    return NextResponse.json({ tenant });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to assign room." },
      { status: 400 },
    );
  }
}
