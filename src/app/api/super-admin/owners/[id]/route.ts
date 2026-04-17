import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { updateOwnerStatus, deleteOwner, getOwnerById } from "@/data/ownersStore";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { status?: "active" | "inactive" };

  if (body.status !== "active" && body.status !== "inactive") {
    return NextResponse.json({ message: "Invalid status." }, { status: 400 });
  }

  const owner = getOwnerById(id);
  if (!owner) {
    return NextResponse.json({ message: "Owner not found." }, { status: 404 });
  }

  updateOwnerStatus(id, body.status);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  deleteOwner(id);
  return NextResponse.json({ ok: true });
}
