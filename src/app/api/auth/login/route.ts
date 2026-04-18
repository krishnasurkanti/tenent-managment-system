import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";
import { setAuthCookies } from "@/services/core/backend-api";
import { validateOwner } from "@/data/ownersStore";
import { matchesDemoCredentials, createDemoSessionToken, getDemoOwnerProfile } from "@/lib/demo-auth";

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
  const body = (await request.json()) as {
    username?: string;
    email?: string;
    password?: string;
  };

  const identifier = body.username?.trim() || body.email?.trim() || "";
  const password = body.password?.trim() ?? "";

  if (!identifier || !password) {
    return NextResponse.json({ message: "Email/username and password are required." }, { status: 400 });
  }

  // Demo owner check
  if (matchesDemoCredentials(identifier, password)) {
    const profile = getDemoOwnerProfile();
    const token = createDemoSessionToken("owner");
    const response = NextResponse.json({ ok: true, owner: profile });
    setAuthCookies(response, token);
    return response;
  }

  // Local owners created via super admin
  const result = validateOwner(identifier, password);
  if (result.ok) {
    const token = createOwnerToken(result.owner.id, result.owner.username);
    const response = NextResponse.json({ ok: true, owner: { id: result.owner.id, username: result.owner.username } });
    setAuthCookies(response, token);
    return response;
  }
  if (result.reason === "suspended") {
    return NextResponse.json({ message: "Your account has been suspended. Contact your administrator." }, { status: 401 });
  }

  // Fallback: legacy backend (for any backend-registered owners)
  try {
    const backendResponse = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identifier, password }),
      cache: "no-store",
    });
    const payload = (await backendResponse.json()) as {
      message?: string;
      token?: string;
      owner?: { id?: string | number; email?: string; created_at?: string };
    };

    if (!backendResponse.ok || !payload.token) {
      return NextResponse.json({ message: payload.message || "Invalid email or password." }, { status: backendResponse.status || 401 });
    }

    const response = NextResponse.json({ ok: true, owner: payload.owner });
    setAuthCookies(response, payload.token);
    return response;
  } catch {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }
}
