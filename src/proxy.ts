import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/auth";

function isAuthenticated(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value === getSessionCookieValue();
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = isAuthenticated(request);

  if (pathname.startsWith("/owner") || pathname.startsWith("/api/owner-hostel") || pathname.startsWith("/api/owner-hostels") || pathname.startsWith("/api/tenants")) {
    if (!authenticated) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (pathname === "/login" && authenticated) {
    return NextResponse.redirect(new URL("/owner/welcome", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/owner/:path*", "/api/owner-hostel", "/api/owner-hostels/:path*", "/api/tenants/:path*"],
};
