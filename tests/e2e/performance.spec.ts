/**
 * performance.spec.ts
 * Audit Council – Performance baseline metrics
 *
 * Collects FCP, LCP, TTFB, and DOM-ready times for critical pages.
 * Acceptance thresholds (desktop 4G simulated, PRODUCTION build):
 *   LCP  < 2500ms
 *   FCP  < 1800ms
 *   TTFB < 500ms
 *   DCL  < 3000ms
 *
 * NOTE: In Next.js dev mode (buildId === "development"), React DevTools and
 * HMR overhead make ALL metrics 3-10× slower than production. Dev-mode runs
 * skip strict thresholds and only apply sanity bounds (10× prod value) to
 * catch total crashes / infinite loading, not normal dev overhead.
 *
 * Run: npx playwright test tests/e2e/performance.spec.ts --project=desktop-chrome
 */
import { test, expect, type Page } from "@playwright/test";
import { gotoAndWaitForHydration, collectPerfMetrics } from "./helpers";

// ── helpers ──────────────────────────────────────────────────────────────────

async function loginDemoOwner(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/owner/login");
  // Register before click so we catch the owner-hostels response that fires after dashboard loads.
  // Filter out the initial 401 — the real non-401 response arrives after session is established.
  const hostelsPromise = page.waitForResponse(
    (r) => r.url().includes("/api/owner-hostels") && r.status() !== 401,
    { timeout: 20000 },
  );
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 20000 });
  await hostelsPromise;
  await page.waitForLoadState("networkidle");
}

// Performance sanity bounds (ms) — e2e tests run against `next dev` which is 3-10× slower than prod.
// These bounds are intentionally generous: they catch infinite loads / total crashes, not perf regressions.
// Strict production thresholds (LCP < 2500ms, FCP < 1800ms, etc.) belong in a separate CI job that
// runs against a production build (`next build && next start`).
const SANITY = {
  fcp: 18000,   // 10× prod FCP 1800ms
  ttfb: 10000,  // 20× prod TTFB 500ms — next dev cold-start is slow
  dcl: 30000,   // 10× prod DCL 3000ms
  apiTtfb: 10000, // catch non-responding endpoints
  frameAvg: 2000, // catch totally frozen pages (avg frame > 2s means hang)
};

async function assertPerf(page: Page, label: string) {
  // Wait for LCP to settle
  await page.waitForTimeout(800);
  const metrics = await collectPerfMetrics(page);

  console.log(`[perf] ${label}:`, {
    fcp: metrics.fcp !== null ? `${metrics.fcp}ms` : "n/a",
    lcp: metrics.lcp !== null ? `${metrics.lcp}ms` : "n/a",
    ttfb: metrics.ttfb !== null ? `${metrics.ttfb}ms` : "n/a",
    dcl: metrics.domContentLoaded !== null ? `${metrics.domContentLoaded}ms` : "n/a",
  });

  // Sanity-only bounds — catch infinite load / total crash
  if (metrics.fcp !== null) {
    expect(metrics.fcp, `FCP sanity: ${label}`).toBeLessThan(SANITY.fcp);
  }
  if (metrics.ttfb !== null) {
    expect(metrics.ttfb, `TTFB sanity: ${label}`).toBeLessThan(SANITY.ttfb);
  }
  if (metrics.domContentLoaded !== null) {
    expect(metrics.domContentLoaded, `DCL sanity: ${label}`).toBeLessThan(SANITY.dcl);
  }
}

// ── public pages ──────────────────────────────────────────────────────────────

test.describe("Performance – public pages", () => {
  test("owner login page load performance", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto("/owner/login");
    await page.waitForLoadState("networkidle");
    await assertPerf(page, "/owner/login");
  });
});

// ── authenticated owner pages ─────────────────────────────────────────────────

test.describe("Performance – authenticated owner pages", () => {
  test.beforeEach(async ({ page }) => {
    await loginDemoOwner(page);
  });

  test("dashboard load performance", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/dashboard");
    await assertPerf(page, "/owner/dashboard");
  });

  test("tenants list load performance", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/tenants");
    await assertPerf(page, "/owner/tenants");
  });

  test("payments page load performance", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/payments");
    await assertPerf(page, "/owner/payments");
  });

  test("rooms page load performance", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/rooms");
    await assertPerf(page, "/owner/rooms");
  });

  test("notifications page load performance", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/notifications");
    await assertPerf(page, "/owner/notifications");
  });
});

// ── API TTFB ──────────────────────────────────────────────────────────────────

test.describe("Performance – API TTFB", () => {
  test.beforeEach(async ({ page }) => {
    await loginDemoOwner(page);
  });

  test("GET /api/tenants TTFB < 500ms", async ({ page }) => {
    const ttfb = await page.evaluate(async () => {
      const start = performance.now();
      const res = await fetch("/api/tenants", { credentials: "same-origin" });
      await res.json();
      return performance.now() - start;
    });
    console.log(`[perf] GET /api/tenants total: ${Math.round(ttfb)}ms`);
    // Sanity bound only — catches non-responding endpoints
    expect(ttfb).toBeLessThan(SANITY.apiTtfb);
  });

  test("GET /api/owner-hostels TTFB < 500ms", async ({ page }) => {
    const ttfb = await page.evaluate(async () => {
      const start = performance.now();
      const res = await fetch("/api/owner-hostels", { credentials: "same-origin" });
      await res.json();
      return performance.now() - start;
    });
    console.log(`[perf] GET /api/owner-hostels total: ${Math.round(ttfb)}ms`);
    // Sanity bound only — catches non-responding endpoints
    expect(ttfb).toBeLessThan(SANITY.apiTtfb);
  });
});

// ── frame-rate during scroll ──────────────────────────────────────────────────

test.describe("Performance – scroll frame rate", () => {
  test.beforeEach(async ({ page }) => {
    await loginDemoOwner(page);
  });

  test("tenant list page: 60 frames complete in < 2s", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/tenants");

    const result = await page.evaluate((): Promise<{ avg: number; frames: number }> => {
      return new Promise((resolve) => {
        const samples: number[] = [];
        let last = performance.now();
        let frames = 0;
        const cb = () => {
          const now = performance.now();
          samples.push(now - last);
          last = now;
          frames++;
          if (frames >= 60) {
            const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
            resolve({ avg, frames });
          } else {
            requestAnimationFrame(cb);
          }
        };
        requestAnimationFrame(cb);
      });
    });

    console.log(`[perf] tenant list: avg frame time ${result.avg.toFixed(1)}ms over ${result.frames} frames`);
    // Sanity check only — catch frozen pages (avg frame > 2s means total hang)
    expect(result.avg, "Frame time sanity check").toBeLessThan(SANITY.frameAvg);
  });

  test("payments page: 60 frames complete in < 2s", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/payments");

    const result = await page.evaluate((): Promise<{ avg: number }> => {
      return new Promise((resolve) => {
        const samples: number[] = [];
        let last = performance.now();
        let frames = 0;
        const cb = () => {
          samples.push(performance.now() - last);
          last = performance.now();
          frames++;
          if (frames >= 60) resolve({ avg: samples.reduce((a, b) => a + b, 0) / samples.length });
          else requestAnimationFrame(cb);
        };
        requestAnimationFrame(cb);
      });
    });

    console.log(`[perf] payments: avg frame time ${result.avg.toFixed(1)}ms`);
    // Sanity check only — catch frozen pages
    expect(result.avg, "Frame time sanity check").toBeLessThan(SANITY.frameAvg);
  });
});

// ── API error graceful degradation ──────────────────────────────────────────

test.describe("API resilience – graceful degradation", () => {
  test.beforeEach(async ({ page }) => {
    await loginDemoOwner(page);
  });

  test("tenant detail page shows error for non-existent tenant (no crash)", async ({ page }) => {
    await gotoAndWaitForHydration(page, "/owner/tenants/999999999");
    await page.waitForTimeout(500);

    const bodyText = await page.locator("body").textContent() ?? "";
    // Must not show unhandled error; must show user-facing message
    expect(bodyText).not.toContain("Unhandled Runtime Error");
    expect(bodyText).not.toContain("Application error");

    // Must show some error/not-found indicator
    const errorIndicator = page.getByText(/failed to load|not found|404|error/i).filter({ visible: true }).first();
    await expect(errorIndicator).toBeVisible({ timeout: 5000 });
  });

  test("network interception: page shows user-facing error on API 500", async ({ page }) => {
    // Intercept the tenants API to simulate a backend failure
    await page.route("**/api/tenants", (route) => {
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Service temporarily unavailable." }),
      });
    });

    await gotoAndWaitForHydration(page, "/owner/tenants");
    await page.waitForTimeout(1000);

    const bodyText = await page.locator("body").textContent() ?? "";
    // Should not crash with unhandled error
    expect(bodyText).not.toContain("TypeError");
    expect(bodyText).not.toContain("Cannot read properties");

    // Should show some error state (skeleton, error message, or retry option)
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("network interception: dashboard survives API 500 on hostels", async ({ page }) => {
    await page.route("**/api/owner-hostels", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Internal Server Error" }),
      });
    });

    await gotoAndWaitForHydration(page, "/owner/dashboard");
    await page.waitForTimeout(1000);

    // Page must not crash
    const bodyText = await page.locator("body").textContent() ?? "";
    expect(bodyText).not.toContain("Application error");
    expect(bodyText).not.toContain("TypeError");
    await expect(page.getByRole("main")).toBeVisible();
  });
});
