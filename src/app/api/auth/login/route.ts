import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";
import { setAuthCookies } from "@/services/core/backend-api";
import { matchesDemoCredentials, getDemoOwnerProfile } from "@/lib/demo-auth";
import { signDemoToken, signOwnerToken } from "@/lib/sign-token";
import { parseJsonBody } from "@/lib/safe-json";
import { authRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { validateOwnerCredentials } from "@/data/adminStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getTrustedClientIp(request);
  if (authRateLimit(ip)) {
    return NextResponse.json({ message: "Too many login attempts. Try again later." }, { status: 429 });
  }

  const { body, error: jsonError } = await parseJsonBody<{ phoneNumber?: string; email?: string; password?: string }>(request);
  if (jsonError) return jsonError;

  const identifier = body.phoneNumber?.trim() || body.email?.trim() || "";
  const password = body.password?.trim() ?? "";

  if (!identifier || !password) {
    return NextResponse.json({ message: "Email/username and password are required." }, { status: 400 });
  }

  // Demo owner — no DB hit needed
  if (matchesDemoCredentials(identifier, password)) {
    const token = await signDemoToken("owner");
    const response = NextResponse.json({ ok: true, owner: getDemoOwnerProfile() });
    setAuthCookies(response, token);
    return response;
  }

  // All real owners live in PostgreSQL via backend; fall back to local admin-control.json
  try {
    const backendResponse = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identifier, phoneNumber: identifier, password }),
      cache: "no-store",
    });

    const payload = (await backendResponse.json()) as {
      message?: string;
      token?: string;
      owner?: { id?: string | number; email?: string; name?: string; username?: string };
    };

    if (!backendResponse.ok || !payload.token) {
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, owner: payload.owner });
    setAuthCookies(response, payload.token);
    return response;
  } catch {
    // Backend unavailable — try local admin-control.json credentials
    const localResult = validateOwnerCredentials(identifier, password);
    if (localResult.ok) {
      const ownerId = (localResult as { ok: true; ownerId: string; hostelId: string }).ownerId;
      const token = await signOwnerToken(ownerId, identifier);
      const response = NextResponse.json({
        ok: true,
        owner: { id: ownerId, email: identifier, username: identifier },
      });
      setAuthCookies(response, token);
      return response;
    }
    return NextResponse.json({ message: "Unable to sign in right now. Please try again." }, { status: 503 });
  }
}
