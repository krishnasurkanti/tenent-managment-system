import { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export async function gotoAndWaitForHydration(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  // wait for main content to appear as a lightweight hydration signal
  await page.waitForSelector("main, [data-testid=app-root]", { timeout: 10000 }).catch(() => {});
}

export async function loginDemoOwner(page: Page) {
  await gotoAndWaitForHydration(page, "/owner/login");
  const demoBtn = page.getByRole("button", { name: /try demo workspace/i });
  if (await demoBtn.count()) {
    await demoBtn.click();
    await page.waitForLoadState("networkidle");
  }
}

export async function captureViewportState(page: Page) {
  return await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: doc.scrollWidth,
      scrollHeight: doc.scrollHeight,
      hasHorizontalScrollbar: doc.scrollWidth > window.innerWidth + 1,
    };
  });
}

export async function runAxe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results;
}

export function normalizeRoute(route: string) {
  return route.replace(/[^a-z0-9-]/gi, "_").replace(/^_+|_+$/g, "");
}

/**
 * Override `Date` in the browser context so `new Date()` and `Date.now()`
 * return the given ISO timestamp. Must be called before `page.goto()`.
 *
 * Usage:
 *   await mockDate(page, "2026-08-07T12:00:00Z"); // +3 months
 *   await page.goto("/owner/payments");
 */
export async function mockDate(page: Page, isoString: string): Promise<void> {
  await page.addInitScript((d: string) => {
    const RealDate = globalThis.Date;
    const fakeMs = new RealDate(d).getTime();
    globalThis.Date = new Proxy(RealDate, {
      construct(Target, args) {
        if (args.length === 0) return Reflect.construct(Target, [fakeMs]);
        return Reflect.construct(Target, args as ConstructorParameters<typeof Date>);
      },
      get(target, prop) {
        if (prop === "now") return () => fakeMs;
        const val = Reflect.get(target, prop) as unknown;
        return typeof val === "function" ? (val as (...args: unknown[]) => unknown).bind(target) : val;
      },
    }) as typeof Date;
  }, isoString);
}

/** Convenience: advance date by N days from today. */
export async function mockDatePlusDays(page: Page, days: number): Promise<void> {
  const d = new Date();
  d.setDate(d.getDate() + days);
  await mockDate(page, d.toISOString());
}

/** Read and return response headers for a given URL (via page.evaluate fetch). */
export async function fetchHeaders(page: Page, url: string): Promise<Record<string, string>> {
  return page.evaluate(async (u: string) => {
    const res = await fetch(u, { method: "GET", credentials: "same-origin" });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    return headers;
  }, url);
}

/** Collect basic Web Vitals via PerformanceObserver + Navigation Timing. */
export async function collectPerfMetrics(page: Page): Promise<{
  fcp: number | null;
  lcp: number | null;
  ttfb: number | null;
  domContentLoaded: number | null;
}> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const paint = performance.getEntriesByName("first-contentful-paint")[0];
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    return {
      fcp: paint ? Math.round(paint.startTime) : null,
      lcp: lcpEntries.length ? Math.round((lcpEntries[lcpEntries.length - 1] as PerformanceEntry).startTime) : null,
      ttfb: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
    };
  });
}
