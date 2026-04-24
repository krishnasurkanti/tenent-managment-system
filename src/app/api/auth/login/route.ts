import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";
import { setAuthCookies } from "@/services/core/backend-api";
import { matchesDemoCredentials, getDemoOwnerProfile } from "@/lib/demo-auth";
import { signDemoToken } from "@/lib/sign-token";
import { authRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (authRateLimit(ip)) {
    return NextResponse.json({ message: "Too many login attempts. Try again later." }, { status: 429 });
  }

  const body = (await request.json()) as {
    phoneNumber?: string;
    email?: string;
    password?: string;
  };

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

  // All real owners live in PostgreSQL via backend
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
    return NextResponse.json({ message: "Unable to sign in right now. Please try again." }, { status: 503 });
  }
}
