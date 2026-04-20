import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";
import { setAuthCookies } from "@/services/core/backend-api";
import { authRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (authRateLimit(ip)) {
    return NextResponse.json({ message: "Too many login attempts. Try again later." }, { status: 429 });
  }

  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username?.trim() ?? "";
  const password = body.password?.trim() ?? "";

  if (!username || !password) {
    return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
  }

  try {
    const backendResponse = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
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
