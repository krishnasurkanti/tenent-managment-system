export const dynamic = "force-dynamic";

// This endpoint exists solely so the middleware has a chance to set the
// csrf_token cookie before the first mutation. The browser calls it on page
// load; the middleware intercepts and attaches the cookie in the response.
export function GET() {
  return Response.json({ ok: true });
}
