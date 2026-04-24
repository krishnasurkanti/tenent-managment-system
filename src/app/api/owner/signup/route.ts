import { NextResponse, type NextRequest } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";
import { setAuthCookies } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { key, ...body } = (await request.json()) as {
    key: string;
    name?: string;
    email?: string;
    phoneNumber?: string;
    password?: string;
    hostelName?: string;
    hostelAddress?: string;
    hostelType?: string;
  };

  if (!key) {
    return NextResponse.json({ message: "Signup key is required." }, { status: 400 });
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
