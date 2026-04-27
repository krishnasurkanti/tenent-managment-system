import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (session.isDemo) {
    return NextResponse.json({ owner: { name: "Demo Owner", email: "demo@hostel.app" } });
  }

  try {
    const backendResponse = await backendFetch("/api/auth/me");
    const payload = (await backendResponse.json()) as { owner?: { name?: string; email?: string }; message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json({ message: payload.message ?? "Unable to load profile." }, { status: backendResponse.status });
    }

    return NextResponse.json({ owner: payload.owner ?? {} });
  } catch {
    return NextResponse.json({ message: "Unable to load profile." }, { status: 503 });
  }
}
