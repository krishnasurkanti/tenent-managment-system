import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resetOwnerLoginFailures, setOwnerCredentials } from "@/data/adminStore";
import { isAdminAuthenticated } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    hostelId?: string;
    username?: string;
    password?: string;
  };

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
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    hostelId?: string;
  };
  if (!body.hostelId) {
    return NextResponse.json({ message: "hostelId is required." }, { status: 400 });
  }

  try {
    const control = resetOwnerLoginFailures(body.hostelId);
    return NextResponse.json({ control });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reset owner access.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
