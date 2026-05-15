import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const BASE = "http://localhost:3000";
const OUT = path.join(process.cwd(), "tests", "screenshots");

async function shot(page: { waitForTimeout(ms: number): Promise<void>; screenshot(opts: { path: string; fullPage: boolean }): Promise<void> }, name: string) {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log(`✓ ${name}`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "en-US" });
  const page = await ctx.newPage();

  // --- LOGIN ---
  await page.goto(`${BASE}/owner/login`);
  await page.waitForLoadState("networkidle");
  await shot(page, "01-owner-login");

  // --- DEMO LOGIN ---
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await page.waitForURL(/\/owner\/dashboard/, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await shot(page, "02-dashboard");

  // --- ROOMS ---
  await page.goto(`${BASE}/owner/rooms`);
  await page.waitForLoadState("networkidle");
  await shot(page, "03-rooms");

  // --- TENANTS ---
  await page.goto(`${BASE}/owner/tenants`);
  await page.waitForLoadState("networkidle");
  await shot(page, "04-tenants-list");

  // --- TENANT DETAIL ---
  await page.goto(`${BASE}/owner/tenants/51201`);
  await page.waitForLoadState("networkidle");
  await shot(page, "05-tenant-detail");

  // --- PAYMENTS ---
  await page.goto(`${BASE}/owner/payments`);
  await page.waitForLoadState("networkidle");
  await shot(page, "06-payments");

  // --- NOTIFICATIONS ---
  await page.goto(`${BASE}/owner/notifications`);
  await page.waitForLoadState("networkidle");
  await shot(page, "07-notifications");

  // --- BILLING ---
  await page.goto(`${BASE}/owner/billing`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await shot(page, "08-billing");

  // --- SETTINGS ---
  await page.goto(`${BASE}/owner/settings`);
  await page.waitForLoadState("networkidle");
  await shot(page, "09-settings");

  // --- COMPLAINTS ---
  await page.goto(`${BASE}/owner/complaints`);
  await page.waitForLoadState("networkidle");
  await shot(page, "10-complaints");

  // --- REPORTS ---
  await page.goto(`${BASE}/owner/reports`);
  await page.waitForLoadState("networkidle");
  await shot(page, "11-reports");

  // Mobile viewport
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "en-US" });
  const mp = await mob.newPage();
  await mp.goto(`${BASE}/owner/login`);
  await mp.getByRole("button", { name: /try demo workspace/i }).click();
  await mp.waitForURL(/\/owner\/dashboard/, { timeout: 30000 });
  await mp.waitForLoadState("networkidle");
  await mp.waitForTimeout(1500);
  await mp.screenshot({ path: path.join(OUT, "M01-dashboard-mobile.png"), fullPage: true });
  console.log("✓ M01-dashboard-mobile");

  await mp.goto(`${BASE}/owner/tenants`);
  await mp.waitForLoadState("networkidle");
  await mp.waitForTimeout(1000);
  await mp.screenshot({ path: path.join(OUT, "M02-tenants-mobile.png"), fullPage: true });
  console.log("✓ M02-tenants-mobile");

  await mp.goto(`${BASE}/owner/rooms`);
  await mp.waitForLoadState("networkidle");
  await mp.waitForTimeout(1000);
  await mp.screenshot({ path: path.join(OUT, "M03-rooms-mobile.png"), fullPage: true });
  console.log("✓ M03-rooms-mobile");

  await mp.goto(`${BASE}/owner/payments`);
  await mp.waitForLoadState("networkidle");
  await mp.waitForTimeout(1000);
  await mp.screenshot({ path: path.join(OUT, "M04-payments-mobile.png"), fullPage: true });
  console.log("✓ M04-payments-mobile");

  await mp.goto(`${BASE}/owner/billing`);
  await mp.waitForLoadState("networkidle");
  await mp.waitForTimeout(2000);
  await mp.screenshot({ path: path.join(OUT, "M05-billing-mobile.png"), fullPage: true });
  console.log("✓ M05-billing-mobile");

  await browser.close();
  console.log("\nAll screenshots saved to tests/screenshots/");
})();
