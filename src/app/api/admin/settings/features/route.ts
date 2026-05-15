import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminFeatures, setAdminFeature } from "@/data/adminStore";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { parseJsonBody } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ features: getAdminFeatures() });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { body, error: jsonError } = await parseJsonBody<{ name?: string; enabled?: boolean }>(request);
  if (jsonError) return jsonError;

  if (!body.name || typeof body.enabled !== "boolean") {
    return NextResponse.json({ message: "name and enabled are required." }, { status: 400 });
  }

  const features = setAdminFeature(body.name, body.enabled);
  return NextResponse.json({ features });
}
