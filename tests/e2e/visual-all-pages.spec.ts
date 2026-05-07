/**
 * visual-all-pages.spec.ts
 * Visual regression snapshots for every owner route at desktop and mobile.
 * Run once to establish baselines, then on every PR to catch regressions.
 *
 * To update baselines: npx playwright test visual-all-pages --update-snapshots
 */
import { expect, test, type Page } from "@playwright/test";
import { gotoAndWaitForHydration } from "./helpers";

// ── helpers ──────────────────────────────────────────────────────────────────

async function loginAsDemoOwner(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
  await gotoAndWaitForHydration(page, "/owner/login");
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await expect(page).toHaveURL(/\/owner\/dashboard/);
  await page.waitForLoadState("networkidle");
}

async function snapshotPage(page: Page, name: string) {
  await page.waitForLoadState("networkidle");
  // Brief settle for animations / skeleton loaders
  await page.waitForTimeout(300);
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    maxDiffPixelRatio: 0.04,
    // Mask dynamic data that changes every run
    mask: [
      page.locator("time"),
      page.getByText(/\d{1,2} \w+ \d{4}/), // date strings
    ],
  });
}

// ── authenticated page snapshots ──────────────────────────────────────────────

test.describe("Visual snapshots – authenticated owner pages", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemoOwner(page);
  });

  test("dashboard page snapshot", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/dashboard");
    await snapshotPage(page, "owner-dashboard");
  });

  test("tenants list page snapshot", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/tenants");
    await snapshotPage(page, "owner-tenants");
  });

  test("tenant detail page snapshot (Aarav Sharma)", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/tenants/51201");
    await snapshotPage(page, "owner-tenant-detail");
  });

  test("payments page snapshot", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/payments");
    await snapshotPage(page, "owner-payments");
  });

  test("pay-rent modal snapshot", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/payments?action=pay-rent&tenantId=51201");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("owner-pay-rent-modal.png", {
      maxDiffPixelRatio: 0.04,
    });
  });

  test("rooms page snapshot", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/rooms");
    await snapshotPage(page, "owner-rooms");
  });

  test("rooms available filter snapshot", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/rooms?view=available");
    await snapshotPage(page, "owner-rooms-available");
  });

  test("notifications page snapshot", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/notifications");
    await snapshotPage(page, "owner-notifications");
  });

  test("billing page snapshot", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/billing");
    await snapshotPage(page, "owner-billing");
  });

  test("settings page snapshot", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/settings");
    await snapshotPage(page, "owner-settings");
  });

  test("reports page snapshot", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/reports");
    await snapshotPage(page, "owner-reports");
  });

  test("create hostel page snapshot", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/create-hostel");
    await snapshotPage(page, "owner-create-hostel");
  });
});

// ── public / auth page snapshots ──────────────────────────────────────────────

test.describe("Visual snapshots – public pages", () => {
  test("login page snapshot", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await gotoAndWaitForHydration(page, "/owner/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("owner-login.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.04,
    });
  });

  test("404 not-found page snapshot", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto("/this-page-does-not-exist-xyz");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("not-found.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.04,
    });
  });
});

// ── add-tenant modal snapshot ─────────────────────────────────────────────────

test.describe("Visual snapshots – modals", () => {
  test("add tenant modal step 1 snapshot", async ({ page }) => {
    await loginAsDemoOwner(page);
    await gotoAndWaitForHydration(page, "/owner/tenants");

    await page.getByRole("button", { name: /add new tenant|^add$/i }).filter({ visible: true }).first().click();
    await expect(page.getByText("Add Tenant").filter({ visible: true }).first()).toBeVisible();

    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("modal-add-tenant-step1.png", {
      maxDiffPixelRatio: 0.04,
    });
  });

  test("add tenant modal step 2 (payment) snapshot", async ({ page }) => {
    await loginAsDemoOwner(page);
    await gotoAndWaitForHydration(page, "/owner/tenants");

    await page.getByRole("button", { name: /add new tenant|^add$/i }).filter({ visible: true }).first().click();
    await page.getByPlaceholder("Enter full name").fill("Visual Test Tenant");
    await page.getByRole("button", { name: /continue to payment/i }).click();

    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("modal-add-tenant-step2.png", {
      maxDiffPixelRatio: 0.04,
    });
  });
});
