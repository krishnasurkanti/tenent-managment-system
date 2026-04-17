import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE_NAME, decodeJwtPayload, getRoleFromAccessToken } from "@/lib/auth";

export type OwnerSessionMode = "demo" | "live" | "guest";

export async function getOwnerSession() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? "";
  const payload = decodeJwtPayload(token);
  const role = getRoleFromAccessToken(token);
  const ownerId =
    typeof payload?.ownerId === "number" || typeof payload?.ownerId === "string"
      ? String(payload.ownerId)
      : typeof payload?.sub === "string"
        ? payload.sub
        : null;

  const isLocalOwner = payload?.source === "local";

  const mode: OwnerSessionMode =
    role !== "owner" && role !== "staff"
      ? "guest"
      : ownerId === "demo-owner" || isLocalOwner
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
