import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE_NAME, verifyJwtPayload, verifyJwtRole } from "@/lib/auth";

export type OwnerSessionMode = "demo" | "live" | "guest";

export async function getOwnerSession() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? "";
  const [payload, role] = await Promise.all([verifyJwtPayload(token), verifyJwtRole(token)]);

  const ownerId =
    typeof payload?.ownerId === "number" || typeof payload?.ownerId === "string"
      ? String(payload.ownerId)
      : typeof payload?.sub === "string"
        ? payload.sub
        : null;

  // "demo" if the token explicitly carries source:demo OR the ownerId is the sentinel demo value
  const isDemo = payload?.source === "demo" || ownerId === "demo-owner";

  const mode: OwnerSessionMode =
    role !== "owner" && role !== "staff"
      ? "guest"
      : isDemo
        ? "demo"
        : "live";

  return {
    token,
    role,
    ownerId,
    mode,
    isDemo: mode === "demo",
    isLive: mode === "live",
  };
}

export async function requireOwnerSession() {
  const session = await getOwnerSession();
  return session.mode === "guest" ? null : session;
}
