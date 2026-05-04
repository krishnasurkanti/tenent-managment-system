import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";

export const dynamic = "force-dynamic";

export async function GET() {
  // Random 0–3 min delay so cron-job.org's fixed 10-min schedule lands unpredictably
  const jitterMs = Math.random() * 3 * 60 * 1000;
  await new Promise((r) => setTimeout(r, jitterMs));

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
