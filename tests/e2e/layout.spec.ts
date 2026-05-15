import { test, expect } from "@playwright/test";
import { gotoAndWaitForHydration, captureViewportState, runAxe, normalizeRoute, loginDemoOwner } from "./helpers";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 1024, height: 1366 },
  { name: "mobile", width: 375, height: 812 },
];

// Configure the routes you want to validate. Add or remove paths as needed.
const ROUTES = [
  "/",
  "/login",
  "/owner/login",
  "/admin",
  "/hostels",
];

test.describe("Layout & responsiveness checks", () => {
  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      test(`${route} — ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        // use demo owner where applicable to get past auth screens
        await loginDemoOwner(page).catch(() => {});
        await gotoAndWaitForHydration(page, route);

        const state = await captureViewportState(page);
        expect(state.hasHorizontalScrollbar, "page should not produce a horizontal scrollbar").toBe(false);

        // detect visible elements that render outside the right edge (simple heuristic)
        const offscreen = await page.evaluate(() =>
          Array.from(document.querySelectorAll("*"))
            .filter((el) => {
              if (!(el instanceof HTMLElement)) return false;
              const rect = el.getBoundingClientRect();
              if (rect.right <= window.innerWidth + 1) return false;
              if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
              const style = window.getComputedStyle(el);
              if (style.position === "fixed" || style.position === "sticky") return false;
              if (el.hasAttribute("data-ignore-offscreen")) return false;
              if (el.getAttribute("aria-hidden") === "true") return false;
              // skip elements that are not visually present
              if (style.visibility === "hidden" || style.opacity === "0" || style.display === "none") return false;
              // skip elements visually clipped by an overflow-hidden/clip ancestor that is itself within viewport
              let ancestor = el.parentElement;
              while (ancestor && ancestor !== document.documentElement) {
                const as = window.getComputedStyle(ancestor);
                if (as.overflowX === "hidden" || as.overflowX === "clip" || as.overflow === "hidden" || as.overflow === "clip") {
                  const ar = ancestor.getBoundingClientRect();
                  if (ar.right <= window.innerWidth + 1) return false;
                }
                ancestor = ancestor.parentElement;
              }
              return true;
            })
            .slice(0, 10)
            .map((el) => el.tagName)
        );
        expect(offscreen.length, `no unexpected elements rendered offscreen: ${offscreen.join(", ")}`).toBe(0);

        // accessibility — fail on serious/critical violations
        const axe = await runAxe(page);
        const critical = axe.violations.filter((v: { impact?: string }) => v.impact === "critical");
        // log serious issues but only fail for critical by default
        const serious = axe.violations.filter((v: { impact?: string }) => v.impact === "serious");
        if (serious.length) {
          console.warn(`axe found serious issues (logged, not failing): ${JSON.stringify(serious, null, 2)}`);
        }
        expect(critical.length, `axe found critical issues: ${JSON.stringify(critical, null, 2)}`).toBe(0);

        // visual snapshot (small tolerance configured via playwright config)
        const name = `${normalizeRoute(route)}-${vp.name}.png`;
        await expect(page).toHaveScreenshot(name, { fullPage: true });
      });
    }
  }
});
