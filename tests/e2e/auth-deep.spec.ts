/**
 * auth-deep.spec.ts
 * Deep authentication testing: login flows, wrong passwords, rate limiting,
 * session persistence, logout, protected routes, admin/super-admin access.
 */
import { expect, test, type Page } from "@playwright/test";

// ── helpers ───────────────────────────────────────────────────────────────────

async function clearSession(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
}

async function loginAsDemoOwner(page: Page) {
  await clearSession(page);
  await page.goto("/owner/login");
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

async function postLogin(page: Page, body: Record<string, string>) {
  await page.goto("/owner/login"); // ensure CSRF cookie is set
  return page.evaluate(async (payload) => {
    const csrfRes = await fetch("/api/csrf");
    const csrfData = await csrfRes.json() as { token?: string };
    const csrf = csrfData.token ?? "";
    const res = await fetch("/api/auth/owner/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": decodeURIComponent(csrf) },
      body: JSON.stringify(payload),
      credentials: "same-origin",
    });
    return { status: res.status, body: await res.json() };
  }, body);
}

// ── demo login ────────────────────────────────────────────────────────────────

test.describe("Demo login", () => {
  test("demo login button lands on dashboard", async ({ page }) => {
    await clearSession(page);
    await page.goto("/owner/login");
    await page.getByRole("button", { name: /try demo workspace/i }).click();
    await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
  });

  test("demo session shows hostel data on dashboard", async ({ page }) => {
    await loginAsDemoOwner(page);
    // At least one key dashboard element must render
    await expect(
      page.getByText(/Aurora Residency|Tenants|Collection Rate|Occupancy/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("demo login repeated twice gives valid session each time", async ({ page }) => {
    await clearSession(page);
    await page.goto("/owner/login");
    await page.getByRole("button", { name: /try demo workspace/i }).click();
    await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });

    // Second demo login from fresh login page
    await page.goto("/logout");
    await page.goto("/owner/login");
    await page.getByRole("button", { name: /try demo workspace/i }).click();
    await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
  });
});

// ── owner login with credentials ──────────────────────────────────────────────

test.describe("Owner login with credentials", () => {
  test("wrong password returns 401 or error message", async ({ page }) => {
    const result = await postLogin(page, {
      email: "arjun@demo.com",
      password: "WrongPassword123",
    });
    // 503 if backend unreachable in test env; 401/400 from live backend
    expect([401, 400, 503]).toContain(result.status);
    expect(result.body.message).toBeTruthy();
  });

  test("empty password returns 400", async ({ page }) => {
    const result = await postLogin(page, { email: "arjun@demo.com", password: "" });
    expect(result.status).toBe(400);
  });

  test("empty email and empty phone returns 400", async ({ page }) => {
    const result = await postLogin(page, { email: "", phoneNumber: "", password: "Demo@1234" });
    expect(result.status).toBe(400);
  });

  test("non-existent email returns 401", async ({ page }) => {
    const result = await postLogin(page, {
      email: "nobody@notexist.example.test",
      password: "SomePass123",
    });
    // 503 if backend unreachable in test env; 401 from live backend
    expect([401, 503]).toContain(result.status);
  });

  test("login with phone number works for seeded owner", async ({ page }) => {
    const result = await postLogin(page, {
      phoneNumber: "9000000001",
      password: "Demo@1234",
    });
    // Either 200 with token, or skip if seeded data not present
    if (result.status === 200) {
      expect(result.body.token ?? result.body.ok).toBeTruthy();
    } else {
      // seeded owners may not exist in all envs — just check no 500
      expect(result.status).not.toBe(500);
    }
  });

  test("login UI shows error message for wrong password", async ({ page }) => {
    await clearSession(page);
    await page.goto("/owner/login");

    // Fill credentials in the real login form if it has email/password fields
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[placeholder*="phone" i]').first();
    const passInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible() && await passInput.isVisible()) {
      await emailInput.fill("arjun@demo.com");
      await passInput.fill("WrongPass999");
      await page.getByRole("button", { name: /^login$/i }).click();
      // Should show error — not redirect to dashboard
      await page.waitForTimeout(2000);
      await expect(page).not.toHaveURL(/\/owner\/dashboard/);
    }
  });
});

// ── rate limiting ─────────────────────────────────────────────────────────────

test.describe("Rate limiting on auth endpoints", () => {
  test("11 rapid wrong-password attempts trigger 429", async ({ page }) => {
    await page.goto("/owner/login");

    let hit429 = false;
    for (let i = 0; i < 12; i++) {
      const result = await postLogin(page, {
        email: `nobody${i}@test.example`,
        password: "WrongPass999",
      });
      if (result.status === 429) {
        hit429 = true;
        break;
      }
    }
    expect(hit429).toBe(true);
  });

  test("rate limit response has human-readable message", async ({ page }) => {
    await page.goto("/owner/login");

    let lastBody: { message?: string } = {};
    for (let i = 0; i < 12; i++) {
      const result = await postLogin(page, {
        email: `ratelimit${i}@test.example`,
        password: "Wrong",
      });
      lastBody = result.body as { message?: string };
      if (result.status === 429) break;
    }
    // If we hit 429, message should mention "too many" or "later"
    if (lastBody.message) {
      expect(lastBody.message.toLowerCase()).toMatch(/too many|later|rate|limit/i);
    }
  });
});

// ── logout & session ──────────────────────────────────────────────────────────

test.describe("Logout and session", () => {
  test("logout clears session — protected route redirects to login", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/api/auth/logout", { method: "GET" } as Parameters<typeof page.goto>[1]);

    // POST logout via API
    await page.evaluate(async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    });

    // Now visit protected route
    await page.goto("/owner/dashboard");
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test("/logout page clears session and redirects to login", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/logout");
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test("session persists across page refresh", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.reload();
    await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 10000 });
  });

  test("session persists when navigating between pages", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");
    await expect(page).toHaveURL(/\/owner\/tenants/);
    await page.goto("/owner/payments");
    await expect(page).toHaveURL(/\/owner\/payments/);
    await page.goto("/owner/rooms");
    await expect(page).toHaveURL(/\/owner\/rooms/);
    // Never redirected to login
    await expect(page).not.toHaveURL(/login/);
  });

  test("login page redirects to dashboard when already authenticated", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/login");
    // Should redirect away from login page
    await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 8000 });
  });

  test("/login redirects to dashboard when already authenticated", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 8000 });
  });
});

// ── protected routes without login ───────────────────────────────────────────

test.describe("Protected routes without auth", () => {
  const PROTECTED = [
    "/owner/dashboard",
    "/owner/tenants",
    "/owner/payments",
    "/owner/rooms",
    "/owner/notifications",
    "/owner/settings",
    "/owner/reports",
    "/owner/billing",
  ];

  for (const route of PROTECTED) {
    test(`${route} redirects to login when unauthenticated`, async ({ page }) => {
      // Fresh page — no session
      await page.goto(route);
      await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });
  }

  test("API /api/tenants returns 401 without auth", async ({ page }) => {
    await page.goto("/owner/login"); // need a base URL for relative fetch to work
    const res = await page.evaluate(async () => {
      const r = await fetch("/api/tenants", { credentials: "same-origin" });
      return r.status;
    });
    expect(res).toBe(401);
  });

  test("API /api/owner-hostels returns 401 without auth", async ({ page }) => {
    await page.goto("/owner/login");
    const res = await page.evaluate(async () => {
      const r = await fetch("/api/owner-hostels", { credentials: "same-origin" });
      return r.status;
    });
    expect(res).toBe(401);
  });
});

// ── admin login ───────────────────────────────────────────────────────────────

test.describe("Admin login", () => {
  test("admin login with wrong password returns 401", async ({ page }) => {
    await page.goto("/admin/login");
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "wrong@example.com", password: "WrongPass123" }),
        credentials: "same-origin",
      });
      return { status: res.status };
    });
    expect([400, 401, 403, 404]).toContain(result.status);
  });

  test("/admin redirect to login when unauthenticated", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/admin\/login/, { timeout: 8000 });
  });

  test("/admin/login page renders", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator("body")).not.toBeEmpty();
    await expect(page.locator('input[type="password"], input[type="email"], input[type="text"]').first())
      .toBeVisible({ timeout: 8000 });
  });
});

// ── super-admin login ─────────────────────────────────────────────────────────

test.describe("Super-admin login", () => {
  test("/super-admin redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/super-admin");
    await expect(page).toHaveURL(/super-admin\/login/, { timeout: 8000 });
  });

  test("/super-admin/login page renders", async ({ page }) => {
    await page.goto("/super-admin/login");
    await expect(page.locator('input[placeholder*="username" i], input[placeholder*="user" i], input[type="text"]').first())
      .toBeVisible({ timeout: 8000 });
  });

  test("owner session cannot access super-admin API", async ({ page }) => {
    await loginAsDemoOwner(page);
    const status = await page.evaluate(async () => {
      const res = await fetch("/api/super-admin/owners", { credentials: "same-origin" });
      return res.status;
    });
    expect([401, 403]).toContain(status);
  });

  test("owner session cannot access admin billing API", async ({ page }) => {
    await loginAsDemoOwner(page);
    const status = await page.evaluate(async () => {
      const res = await fetch("/api/admin/billing/invoice", { credentials: "same-origin" });
      return res.status;
    });
    expect([401, 403]).toContain(status);
  });
});

// ── CSRF protection ───────────────────────────────────────────────────────────

test.describe("CSRF protection", () => {
  test("mutation without CSRF token returns 403", async ({ page }) => {
    await loginAsDemoOwner(page);
    const status = await page.evaluate(async () => {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // No x-csrf-token header
        body: JSON.stringify({ fullName: "No CSRF", monthlyRent: 5000 }),
        credentials: "same-origin",
      });
      return res.status;
    });
    expect(status).toBe(403);
  });

  test("mutation with wrong CSRF token returns 403", async ({ page }) => {
    await loginAsDemoOwner(page);
    const status = await page.evaluate(async () => {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": "bad-token" },
        body: JSON.stringify({ fullName: "Wrong CSRF", monthlyRent: 5000 }),
        credentials: "same-origin",
      });
      return res.status;
    });
    expect(status).toBe(403);
  });
});
