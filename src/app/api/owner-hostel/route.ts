import { NextResponse } from "next/server";
import { getOwnerHostel, saveOwnerHostel, updateOwnerHostel } from "@/data/ownerHostelStore";
import type { OwnerFloor } from "@/types/owner-hostel";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ hostel: getOwnerHostel() });
}

export async function POST(request: Request) {
  return saveOrUpdateHostel(request, "create");
}

export async function PUT(request: Request) {
  return saveOrUpdateHostel(request, "update");
}

async function saveOrUpdateHostel(request: Request, mode: "create" | "update") {
  const body = (await request.json()) as {
    hostelId?: string;
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
      floor.rooms.some(
        (room) =>
          !room.roomNumber.trim() ||
          !room.bedCount ||
          room.bedCount < 1 ||
          !room.sharingType.trim(),
      ),
  );

  if (hasInvalidRoom) {
    return NextResponse.json({ message: "Each floor must have valid room number, bed count, and sharing type." }, { status: 400 });
  }

  const hostel =
    mode === "update"
      ? updateOwnerHostel({
          hostelName,
          address,
          floors,
        }, body.hostelId)
      : saveOwnerHostel({
          hostelName,
          address,
          floors,
        });

  return NextResponse.json({ hostel }, { status: mode === "update" ? 200 : 201 });
}
