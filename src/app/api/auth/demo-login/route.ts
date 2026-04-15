import { NextResponse } from "next/server";
import { createDemoSessionToken, getDemoOwnerProfile } from "@/lib/demo-auth";
import { setAuthCookies } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true, owner: getDemoOwnerProfile() });
  setAuthCookies(response, createDemoSessionToken("owner"));
  return response;
}
