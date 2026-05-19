import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDemoOwnerProfile } from "@/lib/demo-auth";
import { setAuthCookies } from "@/services/core/backend-api";
import { signDemoToken } from "@/lib/sign-token";
import { authRateLimit, getTrustedClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Skip rate limiting in Playwright test environment so test setup isn't throttled
  if (process.env.PLAYWRIGHT_TEST !== "true") {
    const ip = getTrustedClientIp(request);
    if (authRateLimit(ip)) {
      return NextResponse.json({ message: "Too many login attempts. Try again later." }, { status: 429 });
    }
  }
  const token = await signDemoToken("owner");
  const response = NextResponse.json({ ok: true, owner: getDemoOwnerProfile() });
  setAuthCookies(response, token);
  return response;
}
