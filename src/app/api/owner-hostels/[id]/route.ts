import { NextResponse } from "next/server";
import { getOwnerHostel, updateOwnerHostel } from "@/data/ownerHostelStore";
import type { OwnerFloor } from "@/types/owner-hostel";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const hostel = getOwnerHostel(id);

  if (!hostel) {
    return NextResponse.json({ message: "Hostel not found." }, { status: 404 });
  }

  return NextResponse.json({ hostel });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const existingHostel = getOwnerHostel(id);

  if (!existingHostel) {
    return NextResponse.json({ message: "Hostel not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    hostelName?: string;
    address?: string;
    floors?: OwnerFloor[];
  };

  const hostelName = body.hostelName?.trim() ?? "";
  const address = body.address?.trim() ?? "";
  const floors = body.floors ?? [];

  if (!hostelName || !address || floors.length === 0) {
    return NextResponse.json({ message: "Please complete hostel name, address, and at least one floor." }, { status: 400 });
  }

  const hasInvalidRoom = floors.some(
    (floor) =>
      floor.rooms.length === 0 ||
      floor.rooms.some((room) => !room.roomNumber.trim() || !room.bedCount || room.bedCount < 1 || !room.sharingType.trim()),
  );

  if (hasInvalidRoom) {
    return NextResponse.json({ message: "Each floor must have valid room number, bed count, and sharing type." }, { status: 400 });
  }

  const hostel = updateOwnerHostel(
    {
      hostelName,
      address,
      floors,
    },
    id,
  );

  return NextResponse.json({ hostel });
}
