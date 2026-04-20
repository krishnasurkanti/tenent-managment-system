import { NextResponse, type NextRequest } from "next/server";

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";

// Routes that must never require a CSRF token
// (csrf endpoint sets the cookie; auth endpoints are first-contact)
const CSRF_EXEMPT = new Set([
  "/api/csrf",
  "/api/auth/login",         // first contact — cookie may not exist yet
  "/api/auth/owner/login",
  "/api/auth/admin/login",
  "/api/auth/demo-login",
  "/api/super-admin/login",
  "/api/auth/register",
]);

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isSecure = process.env.NODE_ENV === "production";
  const existing = request.cookies.get(CSRF_COOKIE)?.value;

  // ── Validate CSRF on mutations ─────────────────────────────────────────────
  if (MUTATION_METHODS.has(request.method) && !CSRF_EXEMPT.has(pathname)) {
    const headerToken = request.headers.get(CSRF_HEADER) ?? "";
    const cookieToken = existing ?? "";

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid CSRF token. Refresh the page and try again." }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // ── Ensure cookie exists (set on first API request) ────────────────────────
  if (!existing) {
    const token = crypto.randomUUID();
    const response = NextResponse.next();
    response.cookies.set({
      name: CSRF_COOKIE,
      value: token,
      httpOnly: false, // JS must be able to read it
      sameSite: "strict",
      secure: isSecure,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
