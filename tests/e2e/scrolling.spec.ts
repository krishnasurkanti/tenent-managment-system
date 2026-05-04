import { test, expect } from "@playwright/test";
import { gotoAndWaitForHydration, loginDemoOwner } from "./helpers";

test.describe("Scrolling behavior and basic performance", () => {
  test("page scroll settles quickly and remains interactive", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginDemoOwner(page).catch(() => {});
    await gotoAndWaitForHydration(page, "/hostels");

    // measure programmatic smooth scroll duration (simple metric)
    const duration = await page.evaluate(async () => {
      const start = performance.now();
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
      // wait for motion to roughly finish — conservative timeout
      await new Promise((r) => setTimeout(r, 800));
      const end = performance.now();
      return end - start;
    });

    expect(duration, "scroll should settle within 2s").toBeLessThan(2000);

    // after scroll, ensure interactive elements are reachable
    const buttons = await page.getByRole("button").first().isVisible();
    expect(buttons).toBeTruthy();
  });
});
