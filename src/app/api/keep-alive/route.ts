import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";

export const dynamic = "force-dynamic";

export async function GET() {
  // App is alive — always 200. Backend status is informational only.
  let backendOk = false;
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    backendOk = res.ok;
  } catch {
    // backend unreachable — fine, app itself is still up
  }

  return NextResponse.json({ ok: true, backend: backendOk });
}
