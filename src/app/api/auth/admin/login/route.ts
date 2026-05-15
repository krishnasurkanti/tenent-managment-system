import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { matchesSuperAdminCredentials, getDemoAdminProfile } from "@/lib/demo-auth";
import { setAuthCookies } from "@/services/core/backend-api";
import { signDemoToken } from "@/lib/sign-token";
import { parseJsonBody } from "@/lib/safe-json";
import { authRateLimit, getTrustedClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = getTrustedClientIp(request);
  if (authRateLimit(`admin:${ip}`)) {
    return NextResponse.json({ message: "Too many login attempts. Try again later." }, { status: 429 });
  }

  const { body, error: jsonError } = await parseJsonBody<{ username?: string; email?: string; password?: string }>(request);
  if (jsonError) return jsonError;

  const identifier = body.username?.trim() || body.email?.trim() || "";
  const password = body.password?.trim() ?? "";

  if (!identifier || !password) {
    return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
  }

  if (matchesSuperAdminCredentials(identifier, password)) {
    const token = await signDemoToken("super_admin");
    const response = NextResponse.json({ ok: true, admin: getDemoAdminProfile() });
    setAuthCookies(response, token);
    return response;
  }

  return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
}
