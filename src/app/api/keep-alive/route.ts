import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isCron = searchParams.get("source") === "cron";

  // Jitter only for cron pings (prevents predictable keep-alive detection).
  // Never jitter user-facing wakeup polls — that caused 180s+ overlay waits.
  if (isCron) {
    const jitterMs = Math.random() * 2 * 60 * 1000; // 0–2 min for cron only
    await new Promise((r) => setTimeout(r, jitterMs));
  }

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
