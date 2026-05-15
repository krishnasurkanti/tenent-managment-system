import { NextResponse } from "next/server";
import { getOwnerHostels, saveOwnerHostel } from "@/data/ownerHostelStore";
import { seedDemoTenantsForHostel } from "@/data/tenantStore";
import type { OwnerHostel, OwnerRoom } from "@/types/owner-hostel";
import { requireOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";
import { normalizeRoom, normalizeHostel } from "@/utils/hostel-occupancy";
import { parseJsonBody } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

function wrapRoomsInFloor(rooms: OwnerRoom[], hostelId: string, type: "PG" | "RESIDENCE") {
  return [
    {
      id: "floor-1",
      floorLabel: "Floor 1",
      rooms: rooms.map((room) => normalizeRoom(hostelId, "floor-1", type, room)),
    },
  ];
}

export async function GET() {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (session.isLive) {
    const backendResponse = await backendFetch("/api/hostels");
    const payload = (await backendResponse.json()) as { hostels?: unknown[]; message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message || "Unable to load hostels." }, { status: backendResponse.status });
    }

    const normalized = (payload.hostels ?? []).map((h) => normalizeHostel(h as OwnerHostel));
    return NextResponse.json({ hostels: normalized });
  }

  return NextResponse.json({ hostels: getOwnerHostels() });
}

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { body, error: jsonError } = await parseJsonBody<{ hostelName?: string; address?: string; type?: string; rooms?: OwnerRoom[] }>(request);
  if (jsonError) return jsonError;

  const hostelName = body.hostelName?.trim() ?? "";
  const address = body.address?.trim() ?? "";
  const type = body.type === "RESIDENCE" ? "RESIDENCE" : "PG";
  const rooms = body.rooms ?? [];

  if (!hostelName || !address || rooms.length === 0) {
    return NextResponse.json({ message: "Please complete hostel name, address, and at least one room." }, { status: 400 });
  }

  const hasInvalidRoom = rooms.some((room) => !room.roomNumber.trim() || !room.bedCount || room.bedCount < 1);
  if (hasInvalidRoom) {
    return NextResponse.json({ message: "Each room must have a valid room number and capacity." }, { status: 400 });
  }

  const draftId = `draft-${Date.now()}`;
  const floors = wrapRoomsInFloor(rooms, draftId, type);

  if (session.isLive) {
    const backendResponse = await backendFetch("/api/hostels", {
      method: "POST",
      body: JSON.stringify({ name: hostelName, address, type, floors }),
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
    type,
    rooms: rooms.map((r) => normalizeRoom(draftId, "floor-1", type, r)),
    ownerId: session.ownerId ?? undefined,
  });

  const seededTenants = seedDemoTenantsForHostel(hostel.id);

  return NextResponse.json({ hostel, seededTenants }, { status: 201 });
}
