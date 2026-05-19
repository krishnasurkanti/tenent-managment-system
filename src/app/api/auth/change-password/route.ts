import { NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/session-mode";
import { backendFetch } from "@/services/core/backend-api";
import { parseJsonBody } from "@/lib/safe-json";
import { authRateLimit, getTrustedClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (authRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }

  if (session.isDemo) {
    return NextResponse.json(
      { message: "Password change is not available in demo mode." },
      { status: 403 },
    );
  }

  const { body, error: jsonError } = await parseJsonBody(request);
  if (jsonError) return jsonError;
  const currentPassword = String(body.currentPassword ?? "").trim();
  const newPassword = String(body.newPassword ?? "").trim();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { message: "Both current and new password are required." },
      { status: 400 },
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { message: "New password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    const backendResponse = await backendFetch("/api/auth/change-password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const payload = (await backendResponse.json()) as { message?: string };

    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: payload.message ?? "Unable to change password." },
        { status: backendResponse.status },
      );
    }

    return NextResponse.json({ message: "Password updated." });
  } catch {
    return NextResponse.json({ message: "Unable to reach the server." }, { status: 503 });
  }
}
