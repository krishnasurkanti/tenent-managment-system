import { NextResponse } from "next/server";
import { getOwnerHostel, saveOwnerHostel, updateOwnerHostel } from "@/data/ownerHostelStore";
import type { OwnerFloor } from "@/types/owner-hostel";
import { getOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";
import { normalizeFloors } from "@/utils/hostel-occupancy";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getOwnerSession();

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
  const session = await getOwnerSession();
  const body = (await request.json()) as {
    hostelId?: string;
    hostelName?: string;
    address?: string;
    type?: string;
    floors?: OwnerFloor[];
  };

  const hostelName = body.hostelName?.trim() ?? "";
  const address = body.address?.trim() ?? "";
  const type = body.type === "RESIDENCE" ? "RESIDENCE" : "PG";
  const normalizeId = body.hostelId ?? `draft-${Date.now()}`;
  const floors = normalizeFloors(normalizeId, type, body.floors ?? []);

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
          room.bedCount < 1,
      ),
  );

  if (hasInvalidRoom) {
    return NextResponse.json({ message: "Each floor must have valid room or unit labels and capacity." }, { status: 400 });
  }

  if (session.isLive) {
    const backendResponse = await backendFetch(mode === "update" && body.hostelId ? `/api/hostels/${body.hostelId}` : "/api/hostels", {
      method: mode === "update" ? "PUT" : "POST",
      body: JSON.stringify({
        name: hostelName,
        address,
        type,
        floors,
      }),
    });
    const payload = (await backendResponse.json()) as { hostel?: unknown; message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message || "Unable to save hostel." }, { status: backendResponse.status });
    }

    return NextResponse.json({ hostel: payload.hostel }, { status: mode === "update" ? 200 : 201 });
  }

  const hostel =
    mode === "update"
      ? updateOwnerHostel({
          hostelName,
          address,
          type,
          floors,
        }, body.hostelId)
      : saveOwnerHostel({
          hostelName,
          address,
          type,
          floors,
        });

  return NextResponse.json({ hostel }, { status: mode === "update" ? 200 : 201 });
}
