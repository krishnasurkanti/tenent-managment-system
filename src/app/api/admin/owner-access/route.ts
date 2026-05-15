import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resetOwnerLoginFailures, setOwnerCredentials } from "@/data/adminStore";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { parseJsonBody } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { body, error: jsonError } = await parseJsonBody<{ hostelId?: string; username?: string; password?: string }>(request);
  if (jsonError) return jsonError;

  if (!body.hostelId || !body.username || !body.password) {
    return NextResponse.json({ message: "hostelId, username and password are required." }, { status: 400 });
  }

  try {
    const control = setOwnerCredentials(body.hostelId, body.username, body.password);
    return NextResponse.json({ control });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to set owner credentials.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { body: body2, error: jsonError2 } = await parseJsonBody<{ hostelId?: string }>(request);
  if (jsonError2) return jsonError2;
  if (!body2.hostelId) {
    return NextResponse.json({ message: "hostelId is required." }, { status: 400 });
  }

  try {
    const control = resetOwnerLoginFailures(body2.hostelId);
    return NextResponse.json({ control });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reset owner access.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
