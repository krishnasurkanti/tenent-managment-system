export const ACCESS_TOKEN_COOKIE_NAME = "access_token";
export const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

export type SessionRole = "owner" | "staff" | "super_admin" | "tenant";

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getRoleFromAccessToken(token: string): SessionRole | null {
  const payload = decodeJwtPayload(token);
  const role = payload?.role;
  if (role === "owner" || role === "staff" || role === "super_admin" || role === "tenant") {
    return role;
  }
  return null;
}
