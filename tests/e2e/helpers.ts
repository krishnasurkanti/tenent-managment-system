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
