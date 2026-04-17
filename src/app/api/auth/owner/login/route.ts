import { NextResponse } from "next/server";
import { validateOwner } from "@/data/ownersStore";
import { setAuthCookies } from "@/services/core/backend-api";

export const dynamic = "force-dynamic";

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function createOwnerToken(ownerId: string, username: string) {
  const payload = {
    sub: ownerId,
    role: "owner",
    source: "local",
    username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  };
  return [
    encodeBase64Url(JSON.stringify({ alg: "none", typ: "JWT" })),
    encodeBase64Url(JSON.stringify(payload)),
    "owner-signature",
  ].join(".");
}

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username?.trim() ?? "";
  const password = body.password?.trim() ?? "";

  if (!username || !password) {
    return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
  }

  const result = validateOwner(username, password);

  if (!result.ok) {
    const message =
      result.reason === "suspended"
        ? "Your account has been suspended. Contact your administrator."
        : "Invalid username or password.";
    return NextResponse.json({ message }, { status: 401 });
  }

  const token = createOwnerToken(result.owner.id, result.owner.username);
  const response = NextResponse.json({ ok: true, owner: { id: result.owner.id, username: result.owner.username } });
  setAuthCookies(response, token);
  return response;
}
