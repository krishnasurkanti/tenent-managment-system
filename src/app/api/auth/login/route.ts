import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";
import { setAuthCookies } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    email?: string;
    password?: string;
  };

  const identifier = body.username?.trim() || body.email?.trim() || "";
  const password = body.password?.trim() ?? "";

  let backendResponse: Response;
  let payload: {
    message?: string;
    token?: string;
    owner?: { id?: string | number; email?: string; created_at?: string };
  } = {};
  try {
    backendResponse = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: identifier,
        password,
      }),
      cache: "no-store",
    });
    payload = (await backendResponse.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Authentication service unavailable." }, { status: 503 });
  }

  if (!backendResponse.ok || !payload.token) {
    return NextResponse.json({ message: payload.message || "Invalid email or password." }, { status: backendResponse.status || 401 });
  }

  const response = NextResponse.json({ ok: true, owner: payload.owner });
  setAuthCookies(response, payload.token);
  return response;
}
