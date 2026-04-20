import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getApiBaseUrl } from "@/lib/api-config";

export const dynamic = "force-dynamic";

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-key": process.env.ADMIN_SECRET ?? "",
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { status?: string; plan?: string; planStatus?: string };

  // Route to the correct backend endpoint depending on what's being updated
  const endpoint = body.status !== undefined ? "status" : "plan";

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/admin/owners/${id}/${endpoint}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Owner service unavailable." }, { status: 503 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/admin/owners/${id}`, {
      method: "DELETE",
      headers: adminHeaders(),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Owner service unavailable." }, { status: 503 });
  }
}
