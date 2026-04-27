import { NextResponse } from "next/server";
import { getOwnerHostel, updateOwnerHostel } from "@/data/ownerHostelStore";
import type { OwnerFloor } from "@/types/owner-hostel";
import { requireOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";
import { normalizeFloors } from "@/utils/hostel-occupancy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

  if (session.isLive) {
    const body = (await request.json()) as {
      hostelName?: string;
      address?: string;
      type?: string;
      floors?: OwnerFloor[];
    };
    const liveType = body.type === "RESIDENCE" ? "RESIDENCE" : "PG";

    const backendResponse = await backendFetch(`/api/hostels/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: body.hostelName?.trim() ?? "",
        address: body.address?.trim() ?? "",
        type: liveType,
        floors: body.floors ?? [],
      }),
    });
    const payload = (await backendResponse.json()) as { hostel?: unknown; message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message || "Unable to update hostel." }, { status: backendResponse.status });
    }

    return NextResponse.json({ hostel: payload.hostel });
  }

  const existingHostel = getOwnerHostel(id);

  if (!existingHostel) {
    return NextResponse.json({ message: "Hostel not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    hostelName?: string;
    address?: string;
    type?: string;
    floors?: OwnerFloor[];
  };

  const hostelName = body.hostelName?.trim() ?? "";
  const address = body.address?.trim() ?? "";
  const type = body.type === "RESIDENCE" ? "RESIDENCE" : "PG";
  const floors = normalizeFloors(id, type, body.floors ?? []);

  if (!hostelName || !address || floors.length === 0) {
    return NextResponse.json({ message: "Please complete hostel name, address, and at least one floor." }, { status: 400 });
  }

  const hasInvalidRoom = floors.some(
    (floor) =>
      floor.rooms.length === 0 ||
      floor.rooms.some((room) => !room.roomNumber.trim() || !room.bedCount || room.bedCount < 1),
  );

  if (hasInvalidRoom) {
    return NextResponse.json({ message: "Each floor must have valid room or unit labels and capacity." }, { status: 400 });
  }

  const hostel = updateOwnerHostel(
    {
      hostelName,
      address,
      type,
      floors,
    },
    id,
  );

  return NextResponse.json({ hostel });
}
