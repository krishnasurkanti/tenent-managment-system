import { NextResponse, type NextRequest } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";
import { authRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { setAuthCookies } from "@/services/core/backend-api";
import { parseJsonBody } from "@/lib/safe-json";
import { saveOwnerHostel } from "@/data/ownerHostelStore";
import { setOwnerCredentials } from "@/data/adminStore";
import { signOwnerToken } from "@/lib/sign-token";
import type { OwnerRoom } from "@/types/owner-hostel";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (authRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }
  const { body: rawBody, error: jsonError } = await parseJsonBody<{
    key?: string;
    name?: string;
    email?: string;
    phoneNumber?: string;
    password?: string;
    hostelName?: string;
    hostelAddress?: string;
    hostelType?: string;
    rooms?: OwnerRoom[];
  }>(request);
  if (jsonError) return jsonError;
  const { key, ...body } = rawBody;

  if (!key) {
    return NextResponse.json({ message: "Signup key is required." }, { status: 400 });
  }

  // Local-only signup — no backend required
  if (key === "local-setup") {
    const { name: _name, email, password, hostelName, hostelAddress, hostelType, rooms } = rawBody;
    const emailClean = email?.trim() ?? "";
    const passwordClean = password ?? "";

    if (!emailClean || passwordClean.length < 6) {
      return NextResponse.json({ message: "Email and password (min 6 chars) are required." }, { status: 400 });
    }
    if (!hostelName?.trim() || !hostelAddress?.trim()) {
      return NextResponse.json({ message: "Hostel name and address are required." }, { status: 400 });
    }
    if (!rooms || rooms.length === 0) {
      return NextResponse.json({ message: "At least one room is required." }, { status: 400 });
    }

    const type = hostelType === "RESIDENCE" ? "RESIDENCE" : "PG";
    const hostel = saveOwnerHostel({
      hostelName: hostelName.trim(),
      address: hostelAddress.trim(),
      type,
      rooms: rooms.map((r) => ({
        id: r.id || `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        roomNumber: r.roomNumber,
        bedCount: Number(r.bedCount) || 1,
        sharingType: r.sharingType || "1 sharing",
      })),
      ownerId: "local-owner",
    });

    try {
      setOwnerCredentials(hostel.id, emailClean, passwordClean);
    } catch {
      return NextResponse.json({ message: "Could not save credentials. Try again." }, { status: 500 });
    }

    const ownerId = `owner-${hostel.id}`;
    const token = await signOwnerToken(ownerId, emailClean);
    const response = NextResponse.json({ ok: true, hostel: { id: hostel.id } });
    setAuthCookies(response, token);
    return response;
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/signup/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await res.json()) as { message?: string; token?: string; owner?: unknown; hostel?: unknown };
    if (!res.ok || !data.token) {
      return NextResponse.json({ message: data.message ?? "Registration failed." }, { status: res.status });
    }
    const response = NextResponse.json({ ok: true, owner: data.owner, hostel: data.hostel });
    setAuthCookies(response, data.token);
    return response;
  } catch {
    return NextResponse.json({ message: "Service unavailable." }, { status: 503 });
  }
}
