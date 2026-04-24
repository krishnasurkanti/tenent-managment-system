import { NextResponse, type NextRequest } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  if (!key) {
    return NextResponse.json({ message: "Key is required." }, { status: 400 });
  }
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/signup/validate/${encodeURIComponent(key)}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Service unavailable." }, { status: 503 });
  }
}
