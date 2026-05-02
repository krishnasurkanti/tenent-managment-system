import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE_NAME, verifyJwtRole } from "@/lib/auth";

export async function isAdminAuthenticated(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? "";
  return (await verifyJwtRole(token)) === "super_admin";
}
