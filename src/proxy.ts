import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  getRoleFromAccessToken,
} from "@/lib/auth";

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const CSRF_EXEMPT = new Set([
  "/api/csrf",
  "/api/auth/login",
  "/api/auth/owner/login",
  "/api/auth/admin/login",
  "/api/auth/demo-login",
  "/api/super-admin/login",
  "/api/auth/register",
]);
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getRole(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? "";
  return getRoleFromAccessToken(token);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = getRole(request);
  const ownerAuthenticated = role === "owner" || role === "staff";
  const adminAuthenticated = role === "super_admin";
  const isSecure = process.env.NODE_ENV === "production";
  const existingCsrf = request.cookies.get(CSRF_COOKIE)?.value;

  if (pathname.startsWith("/api/")) {
    if (MUTATION_METHODS.has(request.method) && !CSRF_EXEMPT.has(pathname)) {
      const headerToken = request.headers.get(CSRF_HEADER) ?? "";
      const cookieToken = existingCsrf ?? "";

      if (!headerToken || !cookieToken || headerToken !== cookieToken) {
        return new NextResponse(
          JSON.stringify({ message: "Invalid CSRF token. Refresh the page and try again." }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    if (!existingCsrf) {
      const token = crypto.randomUUID();
      const response = NextResponse.next();
      response.cookies.set({
        name: CSRF_COOKIE,
        value: token,
        httpOnly: false,
        sameSite: "strict",
        secure: isSecure,
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      return response;
    }
  }

  if ((pathname.startsWith("/owner") && pathname !== "/owner/login") || pathname.startsWith("/api/owner-hostel") || pathname.startsWith("/api/owner-hostels") || pathname.startsWith("/api/tenants") || pathname.startsWith("/api/owner-billing")) {
    if (!ownerAuthenticated) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const url = new URL("/owner/login", request.url);
      if (pathname !== "/owner/login") url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/super-admin") && pathname !== "/super-admin/login") {
    const isSuperAdmin = role === "super_admin";
    if (!isSuperAdmin) {
      return NextResponse.redirect(new URL("/super-admin/login", request.url));
    }
  }

  if (pathname.startsWith("/api/super-admin") && pathname !== "/api/super-admin/login" && role !== "super_admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (pathname.startsWith("/admin")) {
    if (!adminAuthenticated && pathname !== "/admin/login") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname.startsWith("/api/admin") && !adminAuthenticated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if ((pathname === "/login" || pathname === "/owner/login") && ownerAuthenticated) {
    return NextResponse.redirect(new URL("/owner/dashboard", request.url));
  }

  if (pathname === "/admin/login" && adminAuthenticated) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/owner/:path*", "/super-admin/:path*", "/admin/:path*", "/api/:path*"],
};
