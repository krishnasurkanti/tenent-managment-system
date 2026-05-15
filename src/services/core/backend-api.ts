import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-config";

const BACKEND_TIMEOUT_MS = Number(process.env.BACKEND_TIMEOUT_MS ?? 8000);

export async function backendFetch(
  path: string,
  init: RequestInit = {},
  cacheStrategy: RequestCache = "no-store",
): Promise<Response> {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  const headers = new Headers(init.headers ?? {});
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  try {
    return await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: cacheStrategy,
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      console.error(`[backend] Timeout after ${BACKEND_TIMEOUT_MS}ms on ${path}`);
      return new Response(
        JSON.stringify({ message: "The server is taking too long to respond. Please try again in a moment." }),
        { status: 504, headers: { "Content-Type": "application/json" } },
      );
    }
    throw err;
  }
}

export function setAuthCookies(response: Response, accessToken: string, refreshToken?: string) {
  const secure = process.env.NODE_ENV === "production";
  const cookieHeaders = [
    `${ACCESS_TOKEN_COOKIE_NAME}=${encodeURIComponent(accessToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${secure ? "; Secure" : ""}`,
    refreshToken
      ? `${REFRESH_TOKEN_COOKIE_NAME}=${encodeURIComponent(refreshToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${secure ? "; Secure" : ""}`
      : `${REFRESH_TOKEN_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`,
  ];
  cookieHeaders.forEach((value) => response.headers.append("Set-Cookie", value));
}

export function clearAuthCookies(response: Response) {
  const secure = process.env.NODE_ENV === "production";
  const cookieHeaders = [
    `${ACCESS_TOKEN_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`,
    `${REFRESH_TOKEN_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`,
  ];
  cookieHeaders.forEach((value) => response.headers.append("Set-Cookie", value));
}
