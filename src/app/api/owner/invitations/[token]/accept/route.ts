import { NextResponse, type NextRequest } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";
import { setAuthCookies } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = (await request.json()) as { name?: string; phoneNumber?: string; password?: string };
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/admin/invitations/${encodeURIComponent(token)}/accept`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    const data = (await res.json()) as { message?: string; token?: string; owner?: unknown };
    if (!res.ok || !data.token) {
      return NextResponse.json({ message: data.message ?? "Failed to create account." }, { status: res.status });
    }
    const response = NextResponse.json({ ok: true, owner: data.owner });
    setAuthCookies(response, data.token);
    return response;
  } catch {
    return NextResponse.json({ message: "Service unavailable." }, { status: 503 });
  }
}
