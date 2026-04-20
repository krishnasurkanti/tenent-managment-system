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

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/admin/owners`, {
      headers: adminHeaders(),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Owner service unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    username?: string;
    password?: string;
    plan?: string;
    planStatus?: string;
  };

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/admin/owners`, {
      method: "POST",
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
