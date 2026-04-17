import { NextResponse } from "next/server";
import { createDemoSessionToken, getDemoAdminProfile, matchesDemoCredentials } from "@/lib/demo-auth";
import { setAuthCookies } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  const identifier = body.username?.trim() ?? "";
  const password = body.password?.trim() ?? "";

  if (!identifier || !password) {
    return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
  }

  if (matchesDemoCredentials(identifier, password)) {
    const response = NextResponse.json({ ok: true, admin: getDemoAdminProfile() });
    setAuthCookies(response, createDemoSessionToken("super_admin"));
    return response;
  }

  return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
}
