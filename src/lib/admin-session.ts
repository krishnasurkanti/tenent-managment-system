import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE_NAME, decodeJwtPayload } from "@/lib/auth";

export function isAdminAuthenticated(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? "";
  return decodeJwtPayload(token)?.role === "super_admin";
}
