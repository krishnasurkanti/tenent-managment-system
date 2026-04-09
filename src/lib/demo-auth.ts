const DEMO_USERNAME = "surkanti1703";
const DEMO_PASSWORD = "Kk17030202@";
const DEMO_OWNER_EMAIL = "surkanti1703@demo.local";

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function matchesDemoCredentials(identifier: string, password: string) {
  const normalized = identifier.trim().toLowerCase();
  return (
    password === DEMO_PASSWORD &&
    (normalized === DEMO_USERNAME || normalized === DEMO_OWNER_EMAIL)
  );
}

export function createDemoSessionToken(role: "owner" | "super_admin") {
  const payload = {
    sub: role === "owner" ? "demo-owner" : "demo-admin",
    role,
    email: DEMO_OWNER_EMAIL,
    username: DEMO_USERNAME,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  };

  return [
    encodeBase64Url(JSON.stringify({ alg: "none", typ: "JWT" })),
    encodeBase64Url(JSON.stringify(payload)),
    "demo-signature",
  ].join(".");
}

export function getDemoOwnerProfile() {
  return {
    id: "demo-owner",
    email: DEMO_OWNER_EMAIL,
    username: DEMO_USERNAME,
    created_at: "2026-04-09T00:00:00.000Z",
  };
}

export function getDemoAdminProfile() {
  return {
    id: "demo-admin",
    email: DEMO_OWNER_EMAIL,
    username: DEMO_USERNAME,
  };
}

