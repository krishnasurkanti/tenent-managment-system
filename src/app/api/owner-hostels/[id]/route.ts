import { NextResponse } from "next/server";
import { getOwnerHostel, updateOwnerHostel } from "@/data/ownerHostelStore";
import type { OwnerRoom } from "@/types/owner-hostel";
import { requireOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";
import { normalizeRoom } from "@/utils/hostel-occupancy";
import { parseJsonBody } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function wrapRoomsInFloor(rooms: OwnerRoom[], hostelId: string, type: "PG" | "RESIDENCE") {
  return [
    {
      id: "floor-1",
      floorLabel: "Floor 1",
      rooms: rooms.map((room) => normalizeRoom(hostelId, "floor-1", type, room)),
    },
  ];
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (session.isLive) {
    const backendResponse = await backendFetch(`/api/hostels/${id}`);
    const payload = (await backendResponse.json()) as { hostel?: unknown; message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message || "Hostel not found." }, { status: backendResponse.status });
    }

    return NextResponse.json({ hostel: payload.hostel });
  }

  const hostel = getOwnerHostel(id);

  if (!hostel) {
    return NextResponse.json({ message: "Hostel not found." }, { status: 404 });
  }

  return NextResponse.json({ hostel });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
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

  if (session.isLive) {
    const floors = wrapRoomsInFloor(rooms, id, type);
    const backendResponse = await backendFetch(`/api/hostels/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: hostelName, address, type, floors }),
    });
    const payload = (await backendResponse.json()) as { hostel?: unknown; message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message || "Unable to update hostel." }, { status: backendResponse.status });
    }

    return NextResponse.json({ hostel: payload.hostel });
  }

  const hostel = updateOwnerHostel(
    {
      hostelName,
      address,
      type,
      rooms: rooms.map((r) => normalizeRoom(id, "floor-1", type, r)),
    },
    id,
  );

  return NextResponse.json({ hostel });
}
