/**
 * a11y-all-routes.spec.ts
 * Audit Council – Accessibility (axe) for ALL authenticated owner routes
 *
 * Runs @axe-core/playwright on every owner page at desktop and mobile.
 * Fails on critical violations; logs serious violations as warnings.
 *
 * Coverage gap filled:
 *   layout.spec.ts only covers 5 of 31 routes.
 *   This file adds axe checks for all 12+ owner authenticated pages.
 */
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { gotoAndWaitForHydration } from "./helpers";

// ── helpers ──────────────────────────────────────────────────────────────────

async function loginDemoOwner(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
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

async function runAxeAndAssert(page: Page, route: string) {
  await gotoAndWaitForHydration(page, route);
  // Wait for React deferred state updates to settle (prevents false positives
  // from critical violations in loading skeletons before data arrives).
  // 2000ms covers slow report/ledger fetches that fire in useEffect after mount.
  await page.waitForTimeout(2000);

  const results = await new AxeBuilder({ page })
    .disableRules(["color-contrast"]) // design-token colors vary per theme; separate audit
    .analyze();

  const critical = results.violations.filter((v) => v.impact === "critical");
  const serious = results.violations.filter((v) => v.impact === "serious");
  const moderate = results.violations.filter((v) => v.impact === "moderate");

  if (serious.length) {
    console.warn(
      `[axe] ${route} – ${serious.length} serious violation(s):\n` +
      serious.map((v) => `  • ${v.id}: ${v.description} (${v.nodes.length} node(s))`).join("\n")
    );
  }
  if (moderate.length) {
    console.info(
      `[axe] ${route} – ${moderate.length} moderate violation(s):\n` +
      moderate.map((v) => `  • ${v.id}: ${v.description}`).join("\n")
    );
  }

  expect(critical, `[axe] ${route} – critical violations:\n${JSON.stringify(critical, null, 2)}`).toHaveLength(0);
}

// ── authenticated owner routes ─────────────────────────────────────────────

const OWNER_ROUTES = [
  "/owner/dashboard",
  "/owner/tenants",
  "/owner/payments",
  "/owner/rooms",
  "/owner/notifications",
  "/owner/billing",
  "/owner/settings",
  "/owner/reports",
  "/owner/create-hostel",
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

test.describe("Accessibility – authenticated owner pages", () => {
  test.beforeEach(async ({ page }) => {
    await loginDemoOwner(page);
  });

  for (const vp of VIEWPORTS) {
    for (const route of OWNER_ROUTES) {
      test(`axe: ${route} @ ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await runAxeAndAssert(page, route);
      });
    }
  }
});

// ── tenant detail page (dynamic route) ────────────────────────────────────

test.describe("Accessibility – tenant detail page", () => {
  test.beforeEach(async ({ page }) => {
    await loginDemoOwner(page);
  });

  test("axe: /owner/tenants/51201 @ desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await runAxeAndAssert(page, "/owner/tenants/51201");
  });

  test("axe: /owner/tenants/51201 @ mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await runAxeAndAssert(page, "/owner/tenants/51201");
  });
});

// ── public / auth pages ──────────────────────────────────────────────────────

test.describe("Accessibility – public pages", () => {
  test("axe: /owner/login @ desktop", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.setViewportSize({ width: 1440, height: 900 });
    await runAxeAndAssert(page, "/owner/login");
  });

  test("axe: /owner/login @ mobile", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.setViewportSize({ width: 375, height: 812 });
    await runAxeAndAssert(page, "/owner/login");
  });

  test("axe: /owner/signup @ desktop", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.setViewportSize({ width: 1440, height: 900 });
    await runAxeAndAssert(page, "/owner/signup");
  });

  test("axe: 404 page @ desktop", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/this-page-does-not-exist-xyz");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toHaveLength(0);
  });
});

// ── modal accessibility ───────────────────────────────────────────────────────

test.describe("Accessibility – modals", () => {
  test.beforeEach(async ({ page }) => {
    await loginDemoOwner(page);
  });

  test("axe: add tenant modal step 1", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/tenants");
    await page.getByRole("button", { name: /add new tenant|^add$/i }).filter({ visible: true }).first().click();
    await expect(page.getByText("Add Tenant").filter({ visible: true }).first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");

    if (critical.length) {
      console.error("[axe] Add Tenant modal – critical violations:", JSON.stringify(critical, null, 2));
    }
    expect(critical).toHaveLength(0);
  });

  test("axe: pay-rent modal", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/payments?action=pay-rent&tenantId=51201");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toHaveLength(0);
  });
});

// ── layout & no horizontal scroll (supplement to layout.spec.ts) ─────────────

test.describe("Layout – routes missing from layout.spec.ts", () => {
  const MISSING_ROUTES = [
    "/owner/dashboard",
    "/owner/tenants",
    "/owner/payments",
    "/owner/rooms",
    "/owner/notifications",
    "/owner/billing",
    "/owner/settings",
    "/owner/reports",
  ];

  const TABLET = { width: 1024, height: 1366 };

  test.beforeEach(async ({ page }) => {
    await loginDemoOwner(page);
  });

  for (const route of MISSING_ROUTES) {
    test(`no horizontal scroll: ${route} @ tablet`, async ({ page }) => {
      await page.setViewportSize(TABLET);
      await gotoAndWaitForHydration(page, route);

      const hasHScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      );
      expect(hasHScroll, `${route} must not produce horizontal scrollbar at tablet`).toBe(false);
    });
  }
});
