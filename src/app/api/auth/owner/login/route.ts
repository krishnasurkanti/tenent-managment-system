import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";
import { setAuthCookies } from "@/services/core/backend-api";
import { parseJsonBody } from "@/lib/safe-json";
import { authRateLimit, getTrustedClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getTrustedClientIp(request);
  if (authRateLimit(ip)) {
    return NextResponse.json({ message: "Too many login attempts. Try again later." }, { status: 429 });
  }

  const { body, error: jsonError } = await parseJsonBody<{ email?: string; phoneNumber?: string; password?: string }>(request);
  if (jsonError) return jsonError;
  const email = body.email?.trim() ?? "";
  const phoneNumber = body.phoneNumber?.trim() ?? "";
  const password = body.password ?? "";

  if ((!email && !phoneNumber) || !password) {
    return NextResponse.json({ message: "Email/phone and password are required." }, { status: 400 });
  }

  try {
    const backendResponse = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email || undefined, phoneNumber: phoneNumber || undefined, password }),
      cache: "no-store",
    });

    const payload = (await backendResponse.json()) as {
      message?: string;
      token?: string;
      owner?: { id?: string | number; email?: string; username?: string };
    };

    if (!backendResponse.ok || !payload.token) {
      return NextResponse.json(
        { message: payload.message || "Invalid username or password." },
        { status: backendResponse.status || 401 },
      );
    }

    const response = NextResponse.json({ ok: true, owner: payload.owner });
    setAuthCookies(response, payload.token);
    return response;
  } catch {
    return NextResponse.json({ message: "Unable to sign in right now. Please try again." }, { status: 503 });
  }
}
