import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";
import { authRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { setAuthCookies } from "@/services/core/backend-api";
import { parseJsonBody } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (authRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }
  const { body, error: jsonError } = await parseJsonBody<{ email?: string; password?: string }>(request);
  if (jsonError) return jsonError;

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  let backendResponse: Response;
  let payload: {
    message?: string;
    token?: string;
    owner?: { id?: string | number; email?: string; created_at?: string };
  } = {};

  try {
    backendResponse = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    payload = (await backendResponse.json()) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Registration service unavailable." }, { status: 503 });
  }

  if (!backendResponse.ok || !payload.token) {
    return NextResponse.json({ message: payload.message || "Unable to create account." }, { status: backendResponse.status || 400 });
  }

  const response = NextResponse.json({ ok: true, owner: payload.owner });
  setAuthCookies(response, payload.token);
  return response;
}
