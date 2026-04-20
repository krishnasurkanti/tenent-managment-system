import { NextResponse } from "next/server";
import { getDemoOwnerProfile } from "@/lib/demo-auth";
import { setAuthCookies } from "@/services/core/backend-api";
import { signDemoToken } from "@/lib/sign-token";

export const dynamic = "force-dynamic";

export async function POST() {
  const token = await signDemoToken("owner");
  const response = NextResponse.json({ ok: true, owner: getDemoOwnerProfile() });
  setAuthCookies(response, token);
  return response;
}
