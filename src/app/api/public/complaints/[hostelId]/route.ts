import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";
import { authRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ hostelId: string }> },
) {
  if (authRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }
  const { hostelId } = await params;
  const { body, error: jsonError } = await parseJsonBody(request);
  if (jsonError) return jsonError;
  const res = await fetch(
    `${getApiBaseUrl()}/api/complaints/public/hostels/${encodeURIComponent(hostelId)}/complaints`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
