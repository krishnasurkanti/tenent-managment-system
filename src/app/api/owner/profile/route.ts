import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";
import { parseJsonBody } from "@/lib/safe-json";

export async function PATCH(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { body, error: jsonError } = await parseJsonBody(request);
  if (jsonError) return jsonError;
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();

  if (!name) {
    return NextResponse.json({ message: "Name is required." }, { status: 400 });
  }

  if (session.isDemo) {
    return NextResponse.json({ owner: { name, phone, email: "demo@hostel.app" } });
  }

  try {
    const backendResponse = await backendFetch("/api/auth/update-profile", {
      method: "PATCH",
      body: JSON.stringify({ name, phone }),
    });
    const payload = (await backendResponse.json()) as {
      owner?: { name?: string; email?: string; phone?: string };
      message?: string;
    };

    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: payload.message ?? "Unable to update profile." },
        { status: backendResponse.status },
      );
    }

    return NextResponse.json({ owner: payload.owner ?? { name, phone } });
  } catch {
    return NextResponse.json({ message: "Unable to reach the server." }, { status: 503 });
  }
}

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
