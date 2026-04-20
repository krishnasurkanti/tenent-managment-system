const DEMO_USERNAME = process.env.DEMO_USERNAME ?? "demo";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "";
const DEMO_OWNER_EMAIL = `${DEMO_USERNAME}@demo.local`;

export function matchesDemoCredentials(identifier: string, password: string): boolean {
  if (!DEMO_PASSWORD) return false;
  const normalized = identifier.trim().toLowerCase();
  return (
    password === DEMO_PASSWORD &&
    (normalized === DEMO_USERNAME || normalized === DEMO_OWNER_EMAIL)
  );
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

