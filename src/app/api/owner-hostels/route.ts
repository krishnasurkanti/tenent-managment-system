import { NextResponse } from "next/server";
import { getOwnerHostels, saveOwnerHostel } from "@/data/ownerHostelStore";
import { seedDemoTenantsForHostel } from "@/data/tenantStore";
import type { OwnerFloor } from "@/types/owner-hostel";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ hostels: getOwnerHostels() });
}

export async function POST(request: Request) {
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

  const hostel = saveOwnerHostel({
    hostelName,
    address,
    floors,
  });

  const seededTenants = seedDemoTenantsForHostel(hostel.id);

  return NextResponse.json({ hostel, seededTenants }, { status: 201 });
}
