import { jwtVerify } from "jose";

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

function getJwtSecret(): Uint8Array | null {
  const raw = (process.env.JWT_SECRET ?? "").trim();
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export async function verifyJwtPayload(token: string): Promise<Record<string, unknown> | null> {
  if (!token) return null;
  const secret = getJwtSecret();
  if (!secret) {
    // No secret configured — fall back to decode-only (dev / misconfigured env)
    return decodeJwtPayload(token);
  }
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function verifyJwtRole(token: string): Promise<SessionRole | null> {
  const payload = await verifyJwtPayload(token);
  const role = payload?.role;
  if (role === "owner" || role === "staff" || role === "super_admin" || role === "tenant") {
    return role as SessionRole;
  }
  return null;
}
