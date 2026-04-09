import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  getRoleFromAccessToken,
} from "@/lib/auth";

function getRole(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? "";
  return getRoleFromAccessToken(token);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = getRole(request);
  const ownerAuthenticated = role === "owner" || role === "staff";
  const adminAuthenticated = role === "super_admin";

  if (pathname.startsWith("/owner") || pathname.startsWith("/api/owner-hostel") || pathname.startsWith("/api/owner-hostels") || pathname.startsWith("/api/tenants") || pathname.startsWith("/api/owner-billing")) {
    if (!ownerAuthenticated) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!adminAuthenticated && pathname !== "/admin/login") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname.startsWith("/api/admin") && !adminAuthenticated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (pathname === "/login" && ownerAuthenticated) {
    return NextResponse.redirect(new URL("/owner/dashboard", request.url));
  }

  if (pathname === "/admin/login" && adminAuthenticated) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/owner/:path*", "/admin/:path*", "/api/admin/:path*", "/api/owner-hostel", "/api/owner-hostels/:path*", "/api/tenants/:path*", "/api/owner-billing/:path*"],
};
