import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE_NAME } from "@/lib/auth";

const OWNER_LOGIN = "/owner/login";
const SUPER_ADMIN_LOGIN = "/super-admin/login";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value;

  const isOwnerWorkspace =
    pathname.startsWith("/owner") && pathname !== OWNER_LOGIN;

  const isSuperAdminProtected =
    pathname.startsWith("/super-admin") && pathname !== SUPER_ADMIN_LOGIN;

  const isAdminProtected =
    pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (isOwnerWorkspace && !token) {
    const url = request.nextUrl.clone();
    url.pathname = OWNER_LOGIN;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isSuperAdminProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = SUPER_ADMIN_LOGIN;
    return NextResponse.redirect(url);
  }

  if (isAdminProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/owner/:path*", "/super-admin/:path*", "/admin/:path*"],
};
