import { NextResponse } from "next/server";
import { getOwnerHostel, saveOwnerHostel, updateOwnerHostel } from "@/data/ownerHostelStore";
import type { OwnerRoom } from "@/types/owner-hostel";
import { requireOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";
import { normalizeRoom } from "@/utils/hostel-occupancy";
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

    const hostels = Array.isArray(payload.hostels) ? payload.hostels : [];
    return NextResponse.json({ hostel: hostels[0] ?? null });
  }

  return NextResponse.json({ hostel: getOwnerHostel() });
}

export async function POST(request: Request) {
  return saveOrUpdateHostel(request, "create");
}

export async function PUT(request: Request) {
  return saveOrUpdateHostel(request, "update");
}

async function saveOrUpdateHostel(request: Request, mode: "create" | "update") {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { body, error: jsonError } = await parseJsonBody<{ hostelId?: string; hostelName?: string; address?: string; type?: string; rooms?: OwnerRoom[] }>(request);
  if (jsonError) return jsonError;

  const hostelName = body.hostelName?.trim() ?? "";
  const address = body.address?.trim() ?? "";
  const type = body.type === "RESIDENCE" ? "RESIDENCE" : "PG";
  const rooms = body.rooms ?? [];
  const hostelId = body.hostelId ?? `draft-${Date.now()}`;

  if (!hostelName || !address || rooms.length === 0) {
    return NextResponse.json({ message: "Please complete hostel name, address, and at least one room." }, { status: 400 });
  }

  const hasInvalidRoom = rooms.some(
    (room) => !room.roomNumber.trim() || !room.bedCount || room.bedCount < 1,
  );
  if (hasInvalidRoom) {
    return NextResponse.json({ message: "Each room must have a valid room number and capacity." }, { status: 400 });
  }

  if (session.isLive) {
    const floors = wrapRoomsInFloor(rooms, hostelId, type);
    const backendResponse = await backendFetch(mode === "update" && body.hostelId ? `/api/hostels/${body.hostelId}` : "/api/hostels", {
      method: mode === "update" ? "PUT" : "POST",
      body: JSON.stringify({ name: hostelName, address, type, floors }),
    });
    const payload = (await backendResponse.json()) as { hostel?: unknown; message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message || "Unable to save hostel." }, { status: backendResponse.status });
    }

    return NextResponse.json({ hostel: payload.hostel }, { status: mode === "update" ? 200 : 201 });
  }

  const normalizedRooms = rooms.map((r) => normalizeRoom(hostelId, "floor-1", type, r));

  const hostel =
    mode === "update"
      ? updateOwnerHostel({ hostelName, address, type, rooms: normalizedRooms }, body.hostelId)
      : saveOwnerHostel({ hostelName, address, type, rooms: normalizedRooms });

  return NextResponse.json({ hostel }, { status: mode === "update" ? 200 : 201 });
}
