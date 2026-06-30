import { NextResponse } from "next/server";
import { getOwnerHostels, saveOwnerHostel } from "@/data/ownerHostelStore";
import { getTenantRecords, isDemoSeedingEnabled, seedDemoTenantsForHostel } from "@/data/tenantStore";
import type { OwnerHostel, OwnerRoom } from "@/types/owner-hostel";
import { requireOwnerSession } from "@/lib/session-mode";
import { apiRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { backendFetch } from "@/services/core/backend-api";
import { buildHostelInventory, normalizeRoom, normalizeHostel } from "@/utils/hostel-occupancy";
import { parseJsonBody } from "@/lib/safe-json";

export const dynamic = "force-dynamic";


export async function GET(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const withInventory = searchParams.get("withInventory") === "true";

  if (session.isLive) {
    const backendUrl = withInventory ? "/api/hostels?withInventory=true" : "/api/hostels";
    const backendResponse = await backendFetch(backendUrl);
    const payload = (await backendResponse.json()) as { hostels?: unknown[]; message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message || "Unable to load hostels." }, { status: backendResponse.status });
    }

    const normalized = (payload.hostels ?? []).map((h) => normalizeHostel(h as OwnerHostel));
    return NextResponse.json({ hostels: normalized });
  }

  const rawHostels = getOwnerHostels(session.isDemo);

  if (!withInventory) {
    return NextResponse.json({ hostels: rawHostels.map((h) => normalizeHostel(h)) });
  }

  // withInventory=true: compute bed occupancy for room assignment modal
  const tenants = getTenantRecords(session.isDemo);
  const hostels = rawHostels.map((h) => {
    const inventory = buildHostelInventory(h, tenants);
    return {
      ...h,
      data: {
        ...h,
        rooms: inventory.rooms.map((room) => ({
          ...room,
          // M-12 fix: return ALL beds (occupied + free) so TenantRoomAssignmentModal
          // can show owners the full room state. occupied flag preserved on each bed.
          beds: room.beds ?? [],
        })),
      },
    };
  });
  return NextResponse.json({ hostels });
}

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (process.env.NODE_ENV === "production" && apiRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }

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
    // Live path: pre-normalize rooms with a draft ID so the backend receives bed IDs.
    const draftId = `draft-${Date.now()}`;
    const normalizedRooms = rooms.map((r) => normalizeRoom(draftId, "main", type, r));
    const backendResponse = await backendFetch("/api/hostels", {
      method: "POST",
      body: JSON.stringify({ name: hostelName, address, type, rooms: normalizedRooms }),
    });
    const payload = (await backendResponse.json()) as { hostel?: unknown; message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message || "Unable to save hostel." }, { status: backendResponse.status });
    }

    return NextResponse.json({ hostel: payload.hostel }, { status: 201 });
  }

  // Demo path: pass raw rooms to saveOwnerHostel so normalizeHostel uses the final hostel ID
  // for bed IDs (avoids draft-TIMESTAMP prefix in stored bed IDs).
  const hostel = saveOwnerHostel({
    hostelName,
    address,
    type,
    rooms,
    ownerId: session.ownerId ?? undefined,
  }, session.isDemo);

  // Only seed demo tenants for demo sessions — never for real/local data or during tests.
  // isDemoSeedingEnabled() returns false after the test reset endpoint is called, ensuring
  // test-created hostels start empty even when PLAYWRIGHT_TEST env var is absent (server reuse).
  const playwrightTestMode = process.env.PLAYWRIGHT_TEST === "true";
  const seededTenants =
    session.isDemo && !playwrightTestMode && isDemoSeedingEnabled()
      ? seedDemoTenantsForHostel(hostel.id, true)
      : [];

  return NextResponse.json({ hostel, seededTenants }, { status: 201 });
}
