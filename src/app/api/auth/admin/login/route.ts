import { NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };

  const username = body.username?.trim() ?? "";
  const password = body.password?.trim() ?? "";

  let backendResponse: Response;
  let payload: {
    message?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: { role?: string };
  } = {};
  try {
    backendResponse = await fetch(`${process.env.BACKEND_URL?.trim() || "http://localhost:4000"}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        roleHint: "super_admin",
      }),
      cache: "no-store",
    });

    payload = (await backendResponse.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Authentication service unavailable." }, { status: 503 });
  }

  if (!backendResponse.ok || !payload.accessToken || !payload.refreshToken || payload.user?.role !== "super_admin") {
    return NextResponse.json({ message: payload.message || "Invalid username or password." }, { status: backendResponse.status || 401 });
  }

  const response = NextResponse.json({ ok: true, user: payload.user });
  setAuthCookies(response, payload.accessToken, payload.refreshToken);
  return response;
}
