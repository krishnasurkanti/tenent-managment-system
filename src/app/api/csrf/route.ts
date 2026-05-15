import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Returns the CSRF token from the HttpOnly cookie in the response body.
// The client stores this value in memory (not via document.cookie) and sends
// it as X-CSRF-Token on mutations. Middleware compares header vs HttpOnly cookie.
export async function GET() {
  const token = (await cookies()).get("csrf_token")?.value ?? "";
  return Response.json({ token });
}
