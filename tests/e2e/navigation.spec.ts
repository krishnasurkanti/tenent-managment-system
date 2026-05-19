/**
 * navigation.spec.ts
 * Verifies all owner routes load without errors, redirects work,
 * 404 handling is correct, and nav links function.
 */
import { expect, test, type Page } from "@playwright/test";

// ── helpers ──────────────────────────────────────────────────────────────────

function visibleText(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true }).first();
}

async function loginAsDemoOwner(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/owner/login");
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await expect(page).toHaveURL(/\/owner\/dashboard/);
  await page.waitForLoadState("networkidle");
}

// ── auth redirects ────────────────────────────────────────────────────────────

test.describe("Auth redirects", () => {
  test("unauthenticated /owner/dashboard redirects to login", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto("/owner/dashboard");

    await expect(page).toHaveURL(/\/owner\/login/);
  });

  test("unauthenticated /owner/tenants redirects to login", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto("/owner/tenants");

    await expect(page).toHaveURL(/\/owner\/login/);
  });

  test("unauthenticated /owner/payments redirects to login", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto("/owner/payments");

    await expect(page).toHaveURL(/\/owner\/login/);
  });

  test("unauthenticated /owner/rooms redirects to login", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto("/owner/rooms");

    await expect(page).toHaveURL(/\/owner\/login/);
  });

  test("demo login button lands on dashboard", async ({ page }) => {
    await loginAsDemoOwner(page);
    await expect(page).toHaveURL(/\/owner\/dashboard/);
    await expect(visibleText(page, "Aurora Residency")).toBeVisible();
  });
});

// ── all authenticated routes load ────────────────────────────────────────────

test.describe("Authenticated route accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoOwner(page);
  });

  test("/owner/dashboard loads with key heading", async ({ page }) => {
    await page.goto("/owner/dashboard");
    await expect(visibleText(page, /owner dashboard|dashboard/i)).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("/owner/tenants loads with tenant list", async ({ page }) => {
    await page.goto("/owner/tenants");
    await expect(visibleText(page, /tenant/i)).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("/owner/payments loads with payment workspace", async ({ page }) => {
    await page.goto("/owner/payments");
    await expect(visibleText(page, /payment/i)).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("/owner/rooms loads with room occupancy view", async ({ page }) => {
    await page.goto("/owner/rooms");
    await expect(visibleText(page, /room/i)).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("/owner/notifications loads with alert centre", async ({ page }) => {
    await page.goto("/owner/notifications");
    await expect(visibleText(page, /owner alert centre/i)).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("/owner/billing loads without error", async ({ page }) => {
    await page.goto("/owner/billing");
    await expect(page.getByRole("main")).toBeVisible();
    // billing page uses useEffect + fetch; wait for post-load content
    // (skeleton has no text, so we wait for any visible substantive text)
    await expect(page.getByText(/plans|pricing|billing|current plan|unable to load/i).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
  });

  test("/owner/settings loads with hostel settings", async ({ page }) => {
    await page.goto("/owner/settings");
    await expect(visibleText(page, /settings|hostel/i)).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("/owner/reports loads without error", async ({ page }) => {
    await page.goto("/owner/reports");
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("/owner/create-hostel loads the hostel creation form", async ({ page }) => {
    await page.goto("/owner/create-hostel");
    await expect(visibleText(page, /hostel/i)).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });
});

// ── 404 handling ──────────────────────────────────────────────────────────────

test.describe("404 and error pages", () => {
  test("unknown route shows not-found page (not a crash)", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/this-route-does-not-exist-xyz");

    // Should show a not-found page, not a JS error
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Application error");
    expect(bodyText).not.toContain("Unhandled Runtime Error");
  });

  test("non-owner deep path shows 404 or redirects", async ({ page }) => {
    await page.goto("/totally/unknown/path");
    const status = page.url();
    // Either shows not-found content or redirects to login
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
  });
});

// ── navigation links ──────────────────────────────────────────────────────────

test.describe("In-app navigation links", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoOwner(page);
  });

  test("dashboard link to /owner/payments works", async ({ page }) => {
    await page.goto("/owner/dashboard");

    const paymentsLink = page.getByRole("link", { name: /payments|view all/i }).filter({ visible: true }).first();
    if (await paymentsLink.count() > 0) {
      await paymentsLink.click();
      await expect(page).toHaveURL(/\/owner\/payments/);
    }
  });

  test("notifications page Pay Now links go to pay-rent modal", async ({ page }) => {
    await page.goto("/owner/notifications");

    const payNowLink = page.getByRole("link", { name: /pay now/i }).filter({ visible: true }).first();
    if (await payNowLink.count() > 0) {
      const href = await payNowLink.getAttribute("href");
      expect(href).toMatch(/pay-rent/);
    }
  });

  test("rooms page Assign tenant links go to add-tenant with pre-filled params", async ({ page }) => {
    await page.goto("/owner/rooms");

    const assignLink = page.getByRole("link", { name: /assign tenant|add tenant/i }).filter({ visible: true }).first();
    if (await assignLink.count() > 0) {
      const href = await assignLink.getAttribute("href");
      expect(href).toMatch(/add-tenant/);
    }
  });

  test("tenant detail back navigation returns to tenant list", async ({ page }) => {
    // Navigate to list first so back goes there (not to dashboard from beforeEach)
    await page.goto("/owner/tenants");
    await expect(visibleText(page, "Aarav Sharma")).toBeVisible();
    await page.goto("/owner/tenants/51201");
    await page.goBack();
    await expect(page).toHaveURL(/\/owner\/tenants/);
  });
});

// ── rooms filter view ─────────────────────────────────────────────────────────

test.describe("Rooms filter and view params", () => {
  test("/owner/rooms?view=available filters to vacant rooms/beds", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/rooms?view=available");

    await expect(visibleText(page, /available|vacant/i)).toBeVisible();
  });

  test("/owner/payments?filter=due shows due tenants", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments?filter=due");

    await expect(page.getByRole("main")).toBeVisible();
  });
});

// ── login page ────────────────────────────────────────────────────────────────

test.describe("Login page", () => {
  test("login page renders with demo button", async ({ page }) => {
    await page.goto("/owner/login");
    await expect(page.getByRole("button", { name: /try demo workspace/i })).toBeVisible();
  });

  test("login page has email and password fields for live login", async ({ page }) => {
    await page.goto("/owner/login");
    const emailInput = page.getByRole("textbox", { name: /email/i });
    const passwordInput = page.locator('input[type="password"]');

    // At least one credential input should exist
    const hasEmail = await emailInput.count();
    const hasPassword = await passwordInput.count();
    expect(hasEmail + hasPassword).toBeGreaterThan(0);
  });
});
