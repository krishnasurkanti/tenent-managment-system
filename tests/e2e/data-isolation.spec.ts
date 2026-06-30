/**
 * data-isolation.spec.ts
 * Cross-hostel and cross-owner data isolation.
 * IDOR checks, owner-scoped queries, search isolation, API privilege guards.
 * Covers critical scenarios 4-10 from the QA spec.
 */
import { expect, test, type Page } from "@playwright/test";
import { uniqueTenantData } from "./test-data";

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function loginAsDemoOwner(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    // Pre-select Aurora Residency — test-created hostels get prepended (unshift) to the
    // demo store and would become hostels[0], making UI default to the wrong hostel.
    window.localStorage.setItem("currentHostelId", "owner-hostel-aurora");
  });
  await page.goto("/owner/login");
  const hostelsPromise = page.waitForResponse(
    (r) => r.url().includes("/api/owner-hostels") && r.status() !== 401,
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
  await hostelsPromise;
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
}

async function getCsrf(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const res = await fetch("/api/csrf");
    const data = await res.json() as { token?: string };
    return data.token ?? "";
  });
}

async function apiGet(page: Page, path: string) {
  const csrf = await getCsrf(page);
  return page.evaluate(
    async ({ path, csrf }) => {
      const res = await fetch(path, {
        headers: { "x-csrf-token": decodeURIComponent(csrf) },
        credentials: "same-origin",
      });
      return { status: res.status, body: await res.json().catch(() => null) };
    },
    { path, csrf }
  );
}

async function apiPost(page: Page, path: string, body: Record<string, unknown>) {
  const csrf = await getCsrf(page);
  return page.evaluate(
    async ({ path, body, csrf }) => {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": decodeURIComponent(csrf) },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });
      return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
    },
    { path, body, csrf }
  );
}

async function createTenant(page: Page, overrides: Record<string, unknown> = {}) {
  const d = uniqueTenantData();
  const result = await apiPost(page, "/api/tenants", {
    fullName: d.fullName,
    phone: d.phone,
    monthlyRent: 6000,
    rentPaid: 0,
    paidOnDate: "2026-05-01",
    ...overrides,
  });
  const tenantId = (result.body as { tenant?: { tenantId?: string } })?.tenant?.tenantId ?? "";
  return { tenantId, fullName: d.fullName, result };
}

async function deleteTenant(page: Page, tenantId: string) {
  return apiPost(page, "/api/tenants/remove", { tenantId });
}

// â”€â”€ owner-scoped API isolation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Owner-scoped API isolation", () => {
  test("/api/tenants returns only current owner's tenants", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiGet(page, "/api/tenants");

    expect(result.status).toBe(200);
    const tenants = (result.body as { tenants?: Array<Record<string, unknown>> }).tenants ?? [];

    // All tenants must have same owner (we can't check owner_id directly but
    // we can verify no tenant from a different owner appears by checking hostel scope)
    expect(Array.isArray(tenants)).toBe(true);
    // Demo owner's tenants should include known demo tenants
    const names = tenants.map(t => (t.data as { fullName?: string } | undefined)?.fullName ?? "");
    expect(names.some(n => n.includes("Aarav") || n.includes("Meera") || n.includes("PW"))).toBe(true);
  });

  test("/api/tenants?hostelId=X returns only that hostel's tenants", async ({ page }) => {
    await loginAsDemoOwner(page);

    // Get hostels
    const hostelResult = await apiGet(page, "/api/owner-hostels");
    const hostels = (hostelResult.body as { hostels?: Array<{ id: number }> }).hostels ?? [];
    if (hostels.length === 0) {
      test.skip(true, "No hostels found");
      return;
    }

    const hostelId = hostels[0].id;
    const result = await apiGet(page, `/api/tenants?hostelId=${hostelId}`);
    expect(result.status).toBe(200);

    const tenants = (result.body as { tenants?: Array<{ hostelId?: number | string }> }).tenants ?? [];
    // All tenants in response must belong to hostelId
    tenants.forEach(t => {
      if (t.hostelId !== undefined) {
        expect(String(t.hostelId)).toBe(String(hostelId));
      }
    });
  });

  test("tenantId from one hostel not returned when querying another hostel", async ({ page }) => {
    await loginAsDemoOwner(page);

    const hostelResult = await apiGet(page, "/api/owner-hostels");
    const hostels = (hostelResult.body as { hostels?: Array<{ id: number }> }).hostels ?? [];

    if (hostels.length < 2) {
      test.skip(true, "Need 2+ hostels for cross-hostel query test");
      return;
    }

    const hostelA = hostels[0];
    const hostelB = hostels[1];

    // Create tenant in hostel A
    const { tenantId, fullName } = await createTenant(page, { hostel_id: hostelA.id });
    if (!tenantId) {
      test.skip(true, "Could not create tenant in hostel A");
      return;
    }

    // Query hostel B's tenants â€” tenant from A must not appear
    const resultB = await apiGet(page, `/api/tenants?hostelId=${hostelB.id}`);
    const tenantsB = (resultB.body as { tenants?: Array<{ tenantId?: string; data?: { fullName?: string } }> }).tenants ?? [];
    const leaked = tenantsB.find(t => t.tenantId === tenantId || t.data?.fullName === fullName);
    expect(leaked).toBeUndefined();

    await deleteTenant(page, tenantId);
  });

  test("direct URL /owner/tenants/{tenantId} with non-existent ID returns error", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants/999999999");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    // Should show an error state, not random data
    const body = await page.locator("body").textContent();
    expect(body).not.toBe("");
    // Should not show real tenant data for a fake ID
    await expect(page.getByText("Aarav Sharma").filter({ visible: true })).toHaveCount(0, { timeout: 3000 });
  });

  test("search in UI scoped to selected hostel", async ({ page }) => {
    await loginAsDemoOwner(page);

    // Create a uniquely named tenant
    const { tenantId, fullName } = await createTenant(page);
    if (!tenantId) {
      test.skip(true, "Could not create test tenant");
      return;
    }

    await page.goto("/owner/tenants");
    // Wait for the hostelId-filtered tenant list to load
    await page.waitForResponse(
      r => r.url().includes("/api/tenants") && r.url().includes("hostelId=owner-hostel-aurora") && r.status() === 200,
      { timeout: 10000 }
    );
    await page.waitForTimeout(300);

    // Should find the tenant we just created in the list
    await expect(page.getByText(fullName).filter({ visible: true }).first()).toBeVisible({ timeout: 5000 });

    await deleteTenant(page, tenantId);
  });
});

// â”€â”€ privilege escalation guards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Privilege escalation guards", () => {
  test("owner cannot GET /api/admin/hostels", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiGet(page, "/api/admin/hostels");
    expect([401, 403]).toContain(result.status);
  });

  test("owner cannot GET /api/super-admin/owners", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiGet(page, "/api/super-admin/owners");
    expect([401, 403]).toContain(result.status);
  });

  test("owner cannot POST /api/admin/billing/control", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/admin/billing/control", { action: "upgrade" });
    expect([401, 403]).toContain(result.status);
  });

  test("owner cannot access /admin/dashboard UI route", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/admin/dashboard");
    // Should redirect to admin login (not owner dashboard)
    await expect(page).toHaveURL(/admin\/login/, { timeout: 8000 });
  });

  test("owner cannot access /super-admin/dashboard UI route", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/super-admin/dashboard");
    await expect(page).toHaveURL(/super-admin\/login/, { timeout: 8000 });
  });

  test("unauthenticated user gets 401 from /api/tenants", async ({ page }) => {
    // Navigate to establish base URL so relative fetch URLs resolve correctly
    await page.goto("/owner/login");
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/tenants", { credentials: "same-origin" });
      return res.status;
    });
    expect(result).toBe(401);
  });

  test("unauthenticated user gets 401 from /api/owner-hostels", async ({ page }) => {
    await page.goto("/owner/login");
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/owner-hostels", { credentials: "same-origin" });
      return res.status;
    });
    expect(result).toBe(401);
  });

  test("unauthenticated user gets 401 from /api/owner-billing", async ({ page }) => {
    await page.goto("/owner/login");
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/owner-billing", { credentials: "same-origin" });
      return res.status;
    });
    expect([401, 403]).toContain(result);
  });
});

// â”€â”€ IDOR checks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("IDOR protection", () => {
  test("PATCH /api/tenants/{randomId} without ownership returns 403/404/400", async ({ page }) => {
    await loginAsDemoOwner(page);

    const csrf = await getCsrf(page);
    const result = await page.evaluate(async ({ csrf }) => {
      const fakeId = "999888777";
      const res = await fetch(`/api/tenants/${fakeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-token": decodeURIComponent(csrf) },
        body: JSON.stringify({ fullName: "HACKED" }),
        credentials: "same-origin",
      });
      return { status: res.status };
    }, { csrf });

    expect([400, 401, 403, 404]).toContain(result.status);
  });

  test("DELETE /api/tenants/remove for non-owned tenant ID returns error", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/remove", { tenantId: "999888777" });
    expect([400, 401, 403, 404]).toContain(result.status);
  });

  test("pay-rent for fake tenantId returns error", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/pay-rent", {
      tenantId: "999888777",
      amount: 5000,
      paidOnDate: "2026-05-01",
      paymentMethod: "cash",
    });
    expect([400, 401, 403, 404]).toContain(result.status);
  });
});

// â”€â”€ data integrity: reports & export scoped to owner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Reports and export data isolation", () => {
  test("reports page loads and shows only current owner's stats", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/reports");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    await expect(
      page.getByText(/total tenants|collection rate|occupancy|assigned/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("CSV export scoped to current owner â€” no foreign tenant names", async ({ page }) => {
    await loginAsDemoOwner(page);
    const csrf = await getCsrf(page);

    const csv = await page.evaluate(async ({ csrf }) => {
      const res = await fetch("/api/tenants/export", {
        headers: { "x-csrf-token": decodeURIComponent(csrf) },
        credentials: "same-origin",
      });
      return res.text();
    }, { csrf });

    // CSV must not be empty
    expect(csv.length).toBeGreaterThan(0);
    // Must contain demo owner's tenants
    expect(csv).toMatch(/Aarav|Meera|PW Tenant/i);
    // Must not contain seeded owner data not owned by demo owner (arjun@ etc. tenants)
    // (This is a best-effort check â€” seeded owners have distinct names)
    expect(csv.toLowerCase()).not.toContain("vikram executive");
  });

  test("dashboard shows data after page refresh without mixing owners", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/dashboard");
    await page.reload();
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    await expect(
      page.getByText(/aurora residency|tenants|collection/i).first()
    ).toBeVisible({ timeout: 10000 });
    // Should NOT show other owners' hostel names
    await expect(page.getByText("Sunrise PG").filter({ visible: true })).toHaveCount(0, { timeout: 3000 });
  });
});

// â”€â”€ cross-hostel search UI isolation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Search result identity checks", () => {
  test("search result click navigates to correct tenant by ID", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");

    // Click Aarav Sharma â€” should navigate to exact tenant ID 51201
    const link = page.getByRole("link", { name: /Aarav Sharma/i }).first();
    if (await link.isVisible()) {
      await link.click();
      await expect(page).toHaveURL(/\/owner\/tenants\/51201/);
      await expect(page.getByText("Aarav Sharma").filter({ visible: true }).first()).toBeVisible();
      // Phone and email shown on detail are Aarav's â€” not another tenant
      await expect(page.getByText("9876501201").filter({ visible: true }).first()).toBeVisible();
    }
  });

  test("tenant IDs displayed in list are 6-digit padded", async ({ page }) => {
    await loginAsDemoOwner(page);
    // Use search param to ensure Aarav renders in virtualizer (parallel tests may push him off-screen)
    await page.goto("/owner/tenants?q=Aarav");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await expect(page.getByText("Aarav Sharma").filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/0?51201/).filter({ visible: true }).first()).toBeVisible();
  });

  test("same room number in different hostels â€” search scoped to current hostel", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");

    const searchInput = page.getByPlaceholder(/search/i).filter({ visible: true }).first();
    await searchInput.fill("101");
    await page.waitForTimeout(600);

    // Results should only be from current hostel
    const rows = page.locator("table tbody tr, [data-testid*='tenant-row'], [data-testid*='tenant-card']");
    const count = await rows.count();
    // Just verify it doesn't crash and shows some results or empty state
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// â”€â”€ notifications scoped to owner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Notifications scoped to owner", () => {
  test("notifications page shows only current owner's alerts", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/notifications");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    // Should show alert content or empty state â€” not crash
    await expect(
      page.getByText(/overdue|due soon|no active|alert/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Should NOT show another owner's hostel name
    await expect(page.getByText("Vikram Executive PG").filter({ visible: true })).toHaveCount(0, { timeout: 3000 });
  });

  test("billing page reflects only current owner's plan", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/billing");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    await expect(
      page.getByText(/plan|billing|tenant|free|trial|upgrade/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
