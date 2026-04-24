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
    const res = await fetch(`${getApiBaseUrl()}/api/signup/key`, {
      headers: adminHeaders(),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Service unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/signup/key/generate`, {
      method: "POST",
      headers: adminHeaders(),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: "Service unavailable." }, { status: 503 });
  }
}
