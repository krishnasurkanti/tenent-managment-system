import { NextResponse } from "next/server";
import { matchesDemoCredentials, getDemoAdminProfile } from "@/lib/demo-auth";
import { setAuthCookies } from "@/services/core/backend-api";
import { signDemoToken } from "@/lib/sign-token";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    email?: string;
    password?: string;
  };

  const identifier = body.username?.trim() || body.email?.trim() || "";
  const password = body.password?.trim() ?? "";

  if (matchesDemoCredentials(identifier, password)) {
    const token = await signDemoToken("super_admin");
    const response = NextResponse.json({ ok: true, admin: getDemoAdminProfile() });
    setAuthCookies(response, token);
    return response;
  }

  return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
}
