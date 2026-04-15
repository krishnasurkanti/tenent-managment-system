import { NextResponse } from "next/server";
import { getOwnerHostels, saveOwnerHostel } from "@/data/ownerHostelStore";
import { seedDemoTenantsForHostel } from "@/data/tenantStore";
import type { OwnerFloor } from "@/types/owner-hostel";
import { getOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getOwnerSession();

  if (session.isLive) {
    const backendResponse = await backendFetch("/api/hostels");
    const payload = (await backendResponse.json()) as { hostels?: unknown[]; message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message || "Unable to load hostels." }, { status: backendResponse.status });
    }

    return NextResponse.json({ hostels: payload.hostels ?? [] });
  }

  return NextResponse.json({ hostels: getOwnerHostels() });
}

export async function POST(request: Request) {
  const session = await getOwnerSession();
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

  if (session.isLive) {
    const backendResponse = await backendFetch("/api/hostels", {
      method: "POST",
      body: JSON.stringify({
        name: hostelName,
        address,
        floors,
      }),
    });
    const payload = (await backendResponse.json()) as { hostel?: unknown; message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message || "Unable to save hostel." }, { status: backendResponse.status });
    }

    return NextResponse.json({ hostel: payload.hostel }, { status: 201 });
  }

  const hostel = saveOwnerHostel({
    hostelName,
    address,
    floors,
  });

  const seededTenants = seedDemoTenantsForHostel(hostel.id);

  return NextResponse.json({ hostel, seededTenants }, { status: 201 });
}
