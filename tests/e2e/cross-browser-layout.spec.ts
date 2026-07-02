/**
 * Cross-browser layout tests — runs on Chromium, Firefox, WebKit (Safari engine).
 * Checks for overflow, clipping, and content visibility on mobile + desktop + landscape.
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const VIEWPORTS = [
  { name: "mobile-portrait",  width: 390,  height: 844  },
  { name: "mobile-landscape", width: 844,  height: 390  },
  { name: "tablet-portrait",  width: 768,  height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768  },
  { name: "desktop",          width: 1440, height: 900  },
];

async function loginDemo(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("currentHostelId", "owner-hostel-aurora");
  });
  await page.goto(BASE + "/owner/login");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(600);
}

for (const vp of VIEWPORTS) {
  test(`layout: no horizontal overflow @ ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await loginDemo(page);

    const result = await page.evaluate((vpWidth) => {
      // The only user-visible horizontal scroll bug is scrollWidth > viewport width.
      // Individual element getBoundingClientRect() ignores clip-path/overflow:hidden clipping,
      // producing false positives for intentionally-clipped glows, drawers, etc.
      // So: measure scrollWidth. If it overflows, also collect unclipped offenders for debugging.
      const docScrollWidth = document.documentElement.scrollWidth;
      const hasHScroll = docScrollWidth > vpWidth + 1;

      // Collect suspects only when there IS a real overflow (for diagnosis)
      const suspects: string[] = [];
      if (hasHScroll) {
        // Walk up — skip el if any ancestor clips it (overflow:hidden/clip, clip-path, position:fixed)
        function isClippedOrFixed(el: Element): boolean {
          let cur: Element | null = el.parentElement;
          while (cur && cur !== document.documentElement) {
            const s = window.getComputedStyle(cur);
            if (s.position === "fixed") return true;
            if (s.clipPath && s.clipPath !== "none") return true;
            const ov = s.overflowX;
            if (ov === "hidden" || ov === "clip") return true;
            cur = cur.parentElement;
          }
          return false;
        }
        document.querySelectorAll("*").forEach((el) => {
          const s = window.getComputedStyle(el);
          if (s.position === "fixed" || s.position === "sticky") return;
          if (s.display === "none" || s.visibility === "hidden") return;
          if (isClippedOrFixed(el)) return;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          if (rect.right > vpWidth + 1) {
            suspects.push(`<${el.tagName.toLowerCase()}> right=${Math.round(rect.right)} class="${el.className?.toString().slice(0,60)}"`);
          }
        });
      }

      return { docScrollWidth, vpWidth, hasHScroll, suspects: suspects.slice(0, 8) };
    }, vp.width);

    await page.screenshot({
      path: `C:/Users/surka/AppData/Local/Temp/layout-${vp.name}.png`,
      fullPage: false,
    });

    expect(
      result.hasHScroll,
      `Horizontal scroll at ${vp.name}: scrollWidth=${result.docScrollWidth} > viewport=${result.vpWidth}. Suspects: ${result.suspects.join(" | ")}`
    ).toBe(false);
  });

  test(`layout: key content visible @ ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await loginDemo(page);

    // Topbar always visible
    const topbar = page.locator("header").first();
    await expect(topbar).toBeVisible();

    // Dashboard content visible (not behind topbar or cut)
    if (vp.width < 1024) {
      // Mobile: check snapshot card header text is not clipped
      await expect(page.getByText(/today.s snapshot/i).first()).toBeVisible();
      // Action tiles
      await expect(page.getByText("Pay Rent").first()).toBeVisible();
      await expect(page.getByText("Overdue").first()).toBeVisible();
    } else {
      // Desktop: dashboard header
      await expect(page.getByText(/owner dashboard/i).first()).toBeVisible();
    }
  });
}

// Tenants page — the table has min-w-[520px] which can overflow on mobile
test("layout: tenants page no overflow @ mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginDemo(page);
  await page.goto(BASE + "/owner/tenants");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    vpWidth: window.innerWidth,
  }));

  await page.screenshot({ path: "C:/Users/surka/AppData/Local/Temp/layout-tenants-mobile.png", fullPage: false });

  expect(result.docScrollWidth, `Tenants page scrollWidth=${result.docScrollWidth} > ${result.vpWidth}`).toBeLessThanOrEqual(result.vpWidth);
});
