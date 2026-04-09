import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyHostelAdminAction } from "@/data/adminStore";
import { isAdminAuthenticated } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: "activate" | "deactivate" | "suspend_owner" | "unsuspend_owner" | "delete_hostel" | "reset_owner_password";
  };
  if (!body.action) {
    return NextResponse.json({ message: "Action is required." }, { status: 400 });
  }

  const { id } = await params;
  try {
    const control = applyHostelAdminAction(id, body.action);
    return NextResponse.json({ control });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to apply action.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
