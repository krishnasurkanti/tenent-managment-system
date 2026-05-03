import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false }, { status: 503 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
