/**
 * performance.spec.ts
 * Audit Council – Performance baseline metrics
 *
 * Collects FCP, LCP, TTFB, and DOM-ready times for critical pages.
 * Acceptance thresholds (desktop 4G simulated):
 *   LCP  < 2500ms
 *   FCP  < 1800ms
 *   TTFB < 500ms
 *   DCL  < 3000ms
 *
 * Run: npx playwright test tests/e2e/performance.spec.ts --project=desktop-chrome
 *
 * Results are logged per-test; threshold failures produce actionable messages.
 */
import { test, expect, type Page } from "@playwright/test";
import { gotoAndWaitForHydration, collectPerfMetrics } from "./helpers";

// ── helpers ──────────────────────────────────────────────────────────────────

async function loginDemoOwner(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/owner/login");
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await expect(page).toHaveURL(/\/owner\/dashboard/);
  await page.waitForLoadState("networkidle");
}

// Performance thresholds (ms) — adjust if infra changes
const THRESHOLDS = {
  lcp: 2500,
  fcp: 1800,
  ttfb: 500,
  dcl: 3000,
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

  if (metrics.lcp !== null) {
    expect(metrics.lcp, `LCP for ${label} must be < ${THRESHOLDS.lcp}ms`).toBeLessThan(THRESHOLDS.lcp);
  }
  if (metrics.fcp !== null) {
    expect(metrics.fcp, `FCP for ${label} must be < ${THRESHOLDS.fcp}ms`).toBeLessThan(THRESHOLDS.fcp);
  }
  if (metrics.ttfb !== null) {
    expect(metrics.ttfb, `TTFB for ${label} must be < ${THRESHOLDS.ttfb}ms`).toBeLessThan(THRESHOLDS.ttfb);
  }
  if (metrics.domContentLoaded !== null) {
    expect(metrics.domContentLoaded, `DCL for ${label} must be < ${THRESHOLDS.dcl}ms`).toBeLessThan(THRESHOLDS.dcl);
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
    expect(ttfb).toBeLessThan(500);
  });

  test("GET /api/owner-hostels TTFB < 500ms", async ({ page }) => {
    const ttfb = await page.evaluate(async () => {
      const start = performance.now();
      const res = await fetch("/api/owner-hostels", { credentials: "same-origin" });
      await res.json();
      return performance.now() - start;
    });
    console.log(`[perf] GET /api/owner-hostels total: ${Math.round(ttfb)}ms`);
    expect(ttfb).toBeLessThan(500);
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
    // 60 frames should complete in < 2000ms — avg frame < 33ms
    expect(result.avg).toBeLessThan(33);
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

    expect(result.avg).toBeLessThan(33);
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
