const DEMO_USERNAME = process.env.DEMO_USERNAME ?? "demo";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "";
const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME ?? DEMO_USERNAME;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? DEMO_PASSWORD;
const DEMO_OWNER_EMAIL = `${DEMO_USERNAME}@demo.local`;
const SUPER_ADMIN_EMAIL = `${SUPER_ADMIN_USERNAME}@demo.local`;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function matchesDemoCredentials(identifier: string, password: string): boolean {
  if (!DEMO_PASSWORD) return false;
  const normalized = normalize(identifier);
  return (
    password === DEMO_PASSWORD &&
    (normalized === normalize(DEMO_USERNAME) || normalized === normalize(DEMO_OWNER_EMAIL))
  );
}

export function matchesSuperAdminCredentials(identifier: string, password: string): boolean {
  if (!SUPER_ADMIN_PASSWORD) return false;
  const normalized = normalize(identifier);
  return (
    password === SUPER_ADMIN_PASSWORD &&
    (normalized === normalize(SUPER_ADMIN_USERNAME) || normalized === normalize(SUPER_ADMIN_EMAIL))
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
    email: SUPER_ADMIN_EMAIL,
    username: SUPER_ADMIN_USERNAME,
  };
}
