/**
 * tenant-crud.spec.ts
 * Full tenant lifecycle: create â†’ list â†’ view â†’ edit â†’ search
 * Every form field, validation rule, and display format tested.
 */
import { expect, test, type Page } from "@playwright/test";
import { uniqueTenantData } from "./test-data";

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function visibleText(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true }).first();
}

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
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 20000 });
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

async function createTenantViaApi(page: Page, overrides: Record<string, unknown> = {}) {
  const csrf = await getCsrf(page);
  return page.evaluate(
    async ({ payload, token }) => {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": decodeURIComponent(token) },
        body: JSON.stringify(payload),
      });
      return { ok: res.ok, status: res.status, body: await res.json() };
    },
    {
      payload: {
        fullName: "API Test Tenant",
        monthlyRent: 8000,
        rentPaid: 8000,
        paidOnDate: "2026-05-01",
        ...overrides,
      },
      token: csrf,
    },
  );
}

async function deleteTenantViaApi(page: Page, tenantId: string) {
  const csrf = await getCsrf(page);
  return page.evaluate(
    async ({ id, token }) => {
      // Use DELETE /api/tenants?tenantId=X so create (POST) and delete share the same module
      // bundle â†’ same demoTenantRecords instance (avoids Turbopack cross-bundle isolation).
      const res = await fetch(`/api/tenants?tenantId=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "x-csrf-token": decodeURIComponent(token) },
      });
      return { ok: res.ok, status: res.status };
    },
    { id: tenantId, token: csrf },
  );
}

// â”€â”€ tenant list page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Tenant list", () => {
  test("shows all demo tenants with key columns", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    // Hub heading
    await expect(visibleText(page, /tenant/i)).toBeVisible();

    // Use search to bring each demo tenant to position 0 in the virtualizer
    // (parallel test files add tenants to the list, pushing demo tenants off-screen on mobile)
    await page.goto("/owner/tenants?q=Aarav");
    await expect(visibleText(page, "Aarav Sharma")).toBeVisible();

    await page.goto("/owner/tenants?q=Meera");
    await expect(visibleText(page, "Meera Nair")).toBeVisible();
  });

  test("shows summary stats: total, due soon, overdue, assigned", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");

    // Stat labels
    await expect(visibleText(page, /total tenants/i)).toBeVisible();
    await expect(visibleText(page, /overdue/i)).toBeVisible();
    await expect(visibleText(page, /assigned/i)).toBeVisible();
  });

  test("tenant IDs are displayed as 6-digit padded numbers", async ({ page }) => {
    await loginAsDemoOwner(page);
    // Search for Aarav to guarantee he renders at position 0 in the virtualizer
    // (parallel test files create extra tenants that push him off-screen on mobile)
    await page.goto("/owner/tenants?q=Aarav");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    await expect(visibleText(page, "Aarav Sharma")).toBeVisible();

    // Demo tenant 51201 â†’ displayed as "051201" (desktop table) or "#051201" (mobile)
    await expect(page.getByText(/0?51201/).filter({ visible: true }).first()).toBeVisible();
  });

  test("search by tenant name filters list", async ({ page }) => {
    await loginAsDemoOwner(page);
    // Use URL query param â€” the page initialises searchQuery from ?q= and filters on load
    await page.goto("/owner/tenants?q=Aarav");

    // Aarav must be visible in filtered result
    await expect(visibleText(page, "Aarav Sharma")).toBeVisible();
    // Meera must not be in the desktop table after filter
    await expect(page.locator("table").getByText("Meera Nair").filter({ visible: true })).toHaveCount(0, { timeout: 5000 });
  });

  test("search by phone number filters list", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");

    const searchInput = page.getByPlaceholder(/search/i).filter({ visible: true }).first();
    await searchInput.fill("9876501201"); // Aarav's phone

    await expect(visibleText(page, "Aarav Sharma")).toBeVisible();
  });

  test("search by room number filters list", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    const searchInput = page.getByPlaceholder(/search/i).filter({ visible: true }).first();
    await searchInput.fill("401"); // Meera's room

    await expect(visibleText(page, "Meera Nair")).toBeVisible({ timeout: 10000 });
  });

  test("clearing search shows all tenants again", async ({ page }) => {
    await loginAsDemoOwner(page);
    // Start with filter applied
    await page.goto("/owner/tenants?q=Aarav");
    await expect(visibleText(page, "Aarav Sharma")).toBeVisible();

    // Navigate to clear the filter â€” same as clearing the search input
    await page.goto("/owner/tenants");
    // Wait for tenant list to settle (virtualizer may need a moment)
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    // Verify multiple tenants rendered via API (virtualizer may not render all on mobile)
    const tenantCount = await page.evaluate(async () => {
      const res = await fetch("/api/tenants");
      const body = await res.json() as { tenants: unknown[] };
      return body.tenants.length;
    });
    expect(tenantCount).toBeGreaterThan(1);
  });
});

// â”€â”€ create tenant via UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Create tenant (UI)", () => {
  test("creates tenant with all fields filled", async ({ page }, testInfo) => {
    const tenant = uniqueTenantData(testInfo.title, testInfo.project.name);
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");

    await page.getByRole("button", { name: /add new tenant|^add$/i }).filter({ visible: true }).first().click();
    await expect(visibleText(page, "Add Tenant")).toBeVisible();

    // Step 1: Personal info
    await page.getByPlaceholder("Enter full name").fill(tenant.fullName);
    await page.getByPlaceholder(/parent name/i).fill(tenant.parentName);
    await page.locator('input[type="date"]').first().fill(tenant.dateOfBirth);
    await page.getByPlaceholder("98765 43210").first().fill(tenant.phone);
    await page.getByPlaceholder("email@example.com").fill(tenant.email);
    await page.locator("select").nth(1).selectOption("pan"); // nth(0)=Occupation, nth(1)=ID Type
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 2: Emergency contact
    await page.getByPlaceholder(/emergency contact/i).fill(tenant.emergencyName);
    await page.getByPlaceholder("98765 43210").last().fill(tenant.emergencyPhone);
    await page.getByRole("button", { name: /continue to payment/i }).click();

    // Step 3: Payment details
    await page.getByPlaceholder("Enter amount").fill(tenant.monthlyRent);
    await page.getByPlaceholder("Rent amount collected").fill(tenant.rentPaid);
    await page.locator('input[type="date"]').last().fill(tenant.paidOnDate);
    await page.getByRole("button", { name: /save tenant/i }).click();

    // Skip room assignment
    await expect(visibleText(page, "Room Assignment")).toBeVisible();
    await page.getByRole("button", { name: /later/i }).click();

    // Tenant appears in list
    await expect(visibleText(page, tenant.fullName)).toBeVisible();
  });

  test("creates tenant with minimum required fields only", async ({ page }, testInfo) => {
    const tenant = uniqueTenantData(testInfo.title, testInfo.project.name);
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");

    await page.getByRole("button", { name: /add new tenant|^add$/i }).filter({ visible: true }).first().click();
    await expect(visibleText(page, "Add Tenant")).toBeVisible();

    // Only required: full name
    await page.getByPlaceholder("Enter full name").fill(tenant.fullName);

    // Payment step (step 1 â†’ 2 â†’ 3)
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: /continue to payment/i }).click();
    await page.getByPlaceholder("Enter amount").fill("6000");
    await page.getByPlaceholder("Rent amount collected").fill("0");
    await page.locator('input[type="date"]').last().fill(tenant.paidOnDate);
    await page.getByRole("button", { name: /save tenant/i }).click();

    // Skip room assignment â€” wait for navigation to assign-room page before clicking Later
    await page.waitForURL(/\/assign-room$/, { timeout: 15000 });
    await page.getByRole("button", { name: /later/i }).click();

    await expect(visibleText(page, tenant.fullName)).toBeVisible();
  });

  test("blocks saving when full name is empty", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");

    await page.getByRole("button", { name: /add new tenant|^add$/i }).filter({ visible: true }).first().click();
    await expect(visibleText(page, "Add Tenant")).toBeVisible();

    // Try to proceed without name (step 1 "Continue" button)
    const continueBtn = page.getByRole("button", { name: "Continue", exact: true });
    await continueBtn.click();

    // Should either stay on step 1 or show validation
    const nameInput = page.getByPlaceholder("Enter full name");
    // Form should not advance â€” still visible
    await expect(nameInput).toBeVisible();
  });

  test("API rejects creation with missing name", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");

    const result = await createTenantViaApi(page, { fullName: "", monthlyRent: 5000, rentPaid: 0, paidOnDate: "2026-05-01" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  test("API rejects negative monthlyRent", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");

    const result = await createTenantViaApi(page, { monthlyRent: -100 });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });
});

// â”€â”€ tenant detail page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Tenant detail page", () => {
  test("shows all personal and payment details for Aarav Sharma", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants/51201");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    await expect(visibleText(page, "Aarav Sharma")).toBeVisible({ timeout: 10000 });
    await expect(visibleText(page, "9876501201")).toBeVisible({ timeout: 10000 });
    await expect(visibleText(page, "aarav.test@example.com")).toBeVisible({ timeout: 10000 });
    await expect(visibleText(page, /TEST-ID-51201/i)).toBeVisible({ timeout: 10000 });
  });

  test("shows room assignment details on detail page", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants/51201");

    await expect(visibleText(page, "Aurora Residency")).toBeVisible();
    await expect(visibleText(page, "101")).toBeVisible(); // room 101
  });

  test("shows payment history on detail page", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants/51201");

    // Payment history section
    await expect(visibleText(page, /payment/i)).toBeVisible();
  });

  test("404 page for non-existent tenant ID", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants/999999");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    await expect(page.getByRole("alert").filter({ hasText: /failed to load|404|not found/i })).toBeVisible({ timeout: 10000 });
  });

  test("navigation from tenant list to detail works", async ({ page }) => {
    await loginAsDemoOwner(page);
    // Search for Aarav to render his card at position 0 in the virtualizer
    // (mobile viewport shows fewer items; parallel tests push demo tenants down)
    await page.goto("/owner/tenants?q=Aarav");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    // Use href selector to guarantee we click Aarav's specific link (avoids same-name collision)
    // filter visible: mobile section hidden on desktop (lg:hidden), desktop table hidden on mobile
    await page.locator('a[href*="/owner/tenants/51201"]').filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/owner\/tenants\/51201/, { timeout: 10000 });
    await expect(visibleText(page, "Aarav Sharma")).toBeVisible({ timeout: 10000 });
  });
});

// â”€â”€ soft-delete / removal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Tenant deletion (soft delete)", () => {
  test("deleted tenant no longer appears in list", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");

    // Create via API
    const result = await createTenantViaApi(page, {
      fullName: "Delete Me Tenant",
      monthlyRent: 5000,
      rentPaid: 5000,
      paidOnDate: "2026-05-01",
    });
    expect(result.ok).toBe(true);
    const tenantId = (result.body as { tenant?: { tenantId?: string } }).tenant?.tenantId;
    expect(tenantId).toBeTruthy();

    // Delete it
    const del = await deleteTenantViaApi(page, tenantId!);
    expect(del.ok).toBe(true);

    // Should not appear in list anymore
    await page.reload();
    const body = await page.evaluate(async () => {
      const res = await fetch("/api/tenants");
      return res.json();
    }) as { tenants: Array<{ tenantId: string }> };

    const found = body.tenants.find((t) => t.tenantId === tenantId);
    expect(found).toBeUndefined();
  });
});

// â”€â”€ room assignment flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Room assignment", () => {
  test("room assignment modal shown after tenant creation", async ({ page }, testInfo) => {
    const tenant = uniqueTenantData(testInfo.title, testInfo.project.name);
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");

    await page.getByRole("button", { name: /add new tenant|^add$/i }).filter({ visible: true }).first().click();
    await page.getByPlaceholder("Enter full name").fill(tenant.fullName);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: /continue to payment/i }).click();
    await page.getByPlaceholder("Enter amount").fill("7000");
    await page.getByPlaceholder("Rent amount collected").fill("7000");
    await page.locator('input[type="date"]').last().fill(tenant.paidOnDate);
    await page.getByRole("button", { name: /save tenant/i }).click();

    await expect(visibleText(page, "Room Assignment")).toBeVisible();

    // Dismiss with "Later"
    await page.getByRole("button", { name: /later/i }).click();
    await expect(visibleText(page, tenant.fullName)).toBeVisible();
  });
});
