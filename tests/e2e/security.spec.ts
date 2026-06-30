/**
 * security.spec.ts
 * Audit Council – Security checks
 *
 * Verifies: auth enforcement, CSRF protection, injection safety,
 * security headers, cookie flags, and privilege escalation guards.
 *
 * All tests run in demo mode; session state is reset per test.
 */
import { test, expect, type Page } from "@playwright/test";

// ── helpers ──────────────────────────────────────────────────────────────────

async function clearSession(page: Page) {
  await page.context().clearCookies();
  await page.addInitScript(() => window.localStorage.clear());
}

async function loginDemoOwner(page: Page) {
  await clearSession(page);
  await page.goto("/owner/login");
  const hostelsPromise = page.waitForResponse(
    (r) => r.url().includes("/api/owner-hostels") && r.status() !== 401,
    { timeout: 20000 },
  );
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 20000 });
  await hostelsPromise;
  await page.waitForLoadState("networkidle");
}

async function getCsrf(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const res = await fetch("/api/csrf");
    const data = await res.json() as { token?: string };
    return data.token ?? "";
  });
}

async function apiPost(page: Page, url: string, body: unknown, extraHeaders: Record<string, string> = {}) {
  return page.evaluate(
    async ({ url, body, headers }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });
      return { status: res.status, ok: res.ok };
    },
    { url, body, headers: extraHeaders },
  );
}

// ── 1. Unauthenticated API access ────────────────────────────────────────────

test.describe("Unauthenticated API access", () => {
  test("GET /api/tenants without session returns 401", async ({ page }) => {
    await clearSession(page);
    await page.goto("/owner/login"); // sets base URL context, no login
    const status = await page.evaluate(async () => {
      const res = await fetch("/api/tenants", { credentials: "same-origin" });
      return res.status;
    });
    expect(status).toBe(401);
  });

  test("POST /api/tenants without session returns 401", async ({ page }) => {
    await clearSession(page);
    await page.goto("/owner/login");
    const result = await apiPost(page, "/api/tenants", {
      fullName: "Hack Attempt",
      monthlyRent: 1000,
      rentPaid: 0,
      paidOnDate: "2026-05-01",
    });
    expect(result.status).toBe(401);
  });

  test("PATCH /api/tenants/:id without session returns 401", async ({ page }) => {
    await clearSession(page);
    await page.goto("/owner/login");
    const status = await page.evaluate(async () => {
      const res = await fetch("/api/tenants/51201", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyRent: 1 }),
        credentials: "same-origin",
      });
      return res.status;
    });
    expect(status).toBe(401);
  });

  test("POST /api/tenants/pay-rent without session returns 401", async ({ page }) => {
    await clearSession(page);
    await page.goto("/owner/login");
    const status = await page.evaluate(async () => {
      const fd = new FormData();
      fd.append("tenantId", "51201");
      fd.append("amount", "8500");
      fd.append("paidOnDate", "2026-05-01");
      const res = await fetch("/api/tenants/pay-rent", { method: "POST", body: fd, credentials: "same-origin" });
      return res.status;
    });
    expect(status).toBe(401);
  });

  test("GET /api/admin/hostels without session returns 401", async ({ page }) => {
    await clearSession(page);
    await page.goto("/");
    const status = await page.evaluate(async () => {
      const res = await fetch("/api/admin/hostels", { credentials: "same-origin" });
      return res.status;
    });
    expect(status).toBe(401);
  });

  test("GET /api/super-admin/owners without session returns 401", async ({ page }) => {
    await clearSession(page);
    await page.goto("/");
    const status = await page.evaluate(async () => {
      const res = await fetch("/api/super-admin/owners", { credentials: "same-origin" });
      return res.status;
    });
    expect(status).toBe(401);
  });
});

// ── 2. CSRF protection ────────────────────────────────────────────────────────

test.describe("CSRF protection", () => {
  test("POST /api/tenants without CSRF header returns 403", async ({ page }) => {
    await loginDemoOwner(page);
    // POST without x-csrf-token header — middleware must reject
    const result = await apiPost(page, "/api/tenants", {
      fullName: "CSRF Test Tenant",
      monthlyRent: 5000,
      rentPaid: 0,
      paidOnDate: "2026-05-01",
    });
    // No CSRF header → 403 Forbidden
    expect(result.status).toBe(403);
  });

  test("POST /api/tenants with wrong CSRF token returns 403", async ({ page }) => {
    await loginDemoOwner(page);
    const result = await apiPost(
      page,
      "/api/tenants",
      { fullName: "Wrong CSRF", monthlyRent: 5000, rentPaid: 0, paidOnDate: "2026-05-01" },
      { "x-csrf-token": "totally-fake-token-xyz" },
    );
    expect(result.status).toBe(403);
  });

  test("POST /api/tenants with valid CSRF token succeeds (2xx)", async ({ page }) => {
    await loginDemoOwner(page);
    const csrf = await getCsrf(page);
    expect(csrf.length).toBeGreaterThan(0);

    const result = await page.evaluate(
      async ({ token }) => {
        const res = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": decodeURIComponent(token) },
          body: JSON.stringify({ fullName: "Valid CSRF Test", monthlyRent: 5000, rentPaid: 0, paidOnDate: "2026-05-01" }),
          credentials: "same-origin",
        });
        return res.status;
      },
      { token: csrf },
    );
    expect([200, 201]).toContain(result);
  });

  test("CSRF cookie is not HttpOnly (required for double-submit pattern)", async ({ page }) => {
    await loginDemoOwner(page);
    await getCsrf(page);
    // csrf_token must be readable via JS (not HttpOnly) for double-submit to work
    const csrfVisible = await page.evaluate(() =>
      document.cookie.includes("csrf_token")
    );
    expect(csrfVisible).toBe(true);
  });
});

// ── 3. Auth cookie flags ──────────────────────────────────────────────────────

test.describe("Auth cookie flags", () => {
  test("access_token cookie is not readable via JS (HttpOnly)", async ({ page }) => {
    await loginDemoOwner(page);
    // HttpOnly cookies are invisible to document.cookie
    const visibleCookies = await page.evaluate(() => document.cookie);
    expect(visibleCookies).not.toContain("access_token");
  });

  test("CSRF cookie has SameSite=Strict or SameSite=Lax attribute", async ({ context, page }) => {
    await loginDemoOwner(page);
    const cookies = await context.cookies();
    const csrf = cookies.find((c) => c.name === "csrf_token");
    // csrf_token must exist after demo login
    expect(csrf).toBeDefined();
    // sameSite must be Strict or Lax (never None without Secure)
    expect(["Strict", "Lax"]).toContain(csrf?.sameSite);
  });
});

// ── 4. Input validation — injection strings ───────────────────────────────────

test.describe("Input validation and injection safety", () => {
  test("SQL injection string in fullName is stored safely (no 500)", async ({ page }) => {
    await loginDemoOwner(page);
    const csrf = await getCsrf(page);

    const result = await page.evaluate(
      async ({ token }) => {
        const res = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": decodeURIComponent(token) },
          body: JSON.stringify({
            fullName: "'; DROP TABLE tenants; --",
            monthlyRent: 5000,
            rentPaid: 0,
            paidOnDate: "2026-05-01",
          }),
          credentials: "same-origin",
        });
        return { status: res.status };
      },
      { token: csrf },
    );
    // Must be 200/201 (demo mode stores safely) or 400 (validation rejection) — never 500
    expect(result.status).not.toBe(500);
    expect([200, 201, 400, 422]).toContain(result.status);
  });

  test("XSS string in fullName is stored safely (no 500)", async ({ page }) => {
    await loginDemoOwner(page);
    const csrf = await getCsrf(page);

    const result = await page.evaluate(
      async ({ token }) => {
        const res = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": decodeURIComponent(token) },
          body: JSON.stringify({
            fullName: "<script>alert('xss')</script>",
            monthlyRent: 5000,
            rentPaid: 0,
            paidOnDate: "2026-05-01",
          }),
          credentials: "same-origin",
        });
        return { status: res.status };
      },
      { token: csrf },
    );
    expect(result.status).not.toBe(500);
    expect([200, 201, 400, 422]).toContain(result.status);
  });

  test("XSS name stored does not execute in tenant list page", async ({ page }) => {
    await loginDemoOwner(page);
    const csrf = await getCsrf(page);

    // Store XSS payload
    await page.evaluate(
      async ({ token }) => {
        await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": decodeURIComponent(token) },
          body: JSON.stringify({
            fullName: "<img src=x onerror=window.__xss_fired=true>",
            monthlyRent: 5000,
            rentPaid: 0,
            paidOnDate: "2026-05-01",
          }),
          credentials: "same-origin",
        });
      },
      { token: csrf },
    );

    await page.goto("/owner/tenants");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const xssFired = await page.evaluate(() => (window as unknown as { __xss_fired?: boolean }).__xss_fired);
    expect(xssFired).toBeFalsy();
  });

  test("empty object body on POST /api/tenants returns 400 not 500", async ({ page }) => {
    await loginDemoOwner(page);
    const csrf = await getCsrf(page);

    const result = await page.evaluate(
      async ({ token }) => {
        const res = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": decodeURIComponent(token) },
          body: "{}",
          credentials: "same-origin",
        });
        return res.status;
      },
      { token: csrf },
    );
    expect(result).not.toBe(500);
    expect([400, 422]).toContain(result);
  });

  test("malformed JSON body returns 4xx not 500", async ({ page }) => {
    await loginDemoOwner(page);
    const csrf = await getCsrf(page);

    const result = await page.evaluate(
      async ({ token }) => {
        const res = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": decodeURIComponent(token) },
          body: "not-valid-json{",
          credentials: "same-origin",
        });
        return res.status;
      },
      { token: csrf },
    );
    expect(result).not.toBe(500);
  });
});

// ── 5. Privilege escalation ───────────────────────────────────────────────────

test.describe("Privilege escalation guards", () => {
  test("owner session cannot access /api/admin/hostels", async ({ page }) => {
    await loginDemoOwner(page);
    const status = await page.evaluate(async () => {
      const res = await fetch("/api/admin/hostels", { credentials: "same-origin" });
      return res.status;
    });
    // Owner token must be rejected on admin routes
    expect([401, 403]).toContain(status);
  });

  test("owner session cannot access /api/super-admin/owners", async ({ page }) => {
    await loginDemoOwner(page);
    const status = await page.evaluate(async () => {
      const res = await fetch("/api/super-admin/owners", { credentials: "same-origin" });
      return res.status;
    });
    expect([401, 403]).toContain(status);
  });
});

// ── 6. Security response headers ─────────────────────────────────────────────

test.describe("Security response headers", () => {
  test("API responses include X-Content-Type-Options: nosniff", async ({ page }) => {
    await clearSession(page);
    await page.goto("/");
    const header = await page.evaluate(async () => {
      const res = await fetch("/api/csrf");
      return res.headers.get("x-content-type-options");
    });
    // Next.js sets this by default; verify it's present
    expect(header?.toLowerCase()).toBe("nosniff");
  });

  test("API 401 response body has message field (not raw error)", async ({ page }) => {
    await clearSession(page);
    await page.goto("/");
    const body = await page.evaluate(async () => {
      const res = await fetch("/api/tenants", { credentials: "same-origin" });
      return res.json();
    });
    expect(body).toHaveProperty("message");
    expect(typeof (body as { message: string }).message).toBe("string");
  });
});
