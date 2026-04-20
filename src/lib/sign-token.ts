import { SignJWT } from "jose";

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET ?? "";
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET env var is required in production.");
    }
    console.warn("[sign-token] JWT_SECRET not set — using insecure dev default.");
  }
  return new TextEncoder().encode(raw || "dev-only-secret-DO-NOT-USE-IN-PRODUCTION");
}

export async function signOwnerToken(ownerId: string, username: string): Promise<string> {
  return new SignJWT({ sub: ownerId, role: "owner", source: "local", username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function signDemoToken(role: "owner" | "super_admin"): Promise<string> {
  const sub = role === "owner" ? "demo-owner" : "demo-admin";
  return new SignJWT({ sub, role, source: "demo" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}
