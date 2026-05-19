import { expect, type Page, test } from "@playwright/test";
import { superAdminCredentials, uniquePaymentData, uniqueTenantData } from "./test-data";

function visibleText(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true }).first();
}

async function loginAsDemoOwner(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/owner/login");
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await expect(page).toHaveURL(/\/owner\/dashboard/);
  await expect(visibleText(page, "Aurora Residency")).toBeVisible();
}

async function loginAsSuperAdmin(page: Page) {
  const credentials = superAdminCredentials();

  test.skip(!credentials.username || !credentials.password, "Super-admin credentials are not configured in .env.local.");

  await page.goto("/super-admin/login");
  await page.getByPlaceholder("Username").fill(credentials.username);
  await page.getByPlaceholder("Password").fill(credentials.password);
  await page.getByRole("button", { name: /^login$/i }).click();
  await expect(page).toHaveURL(/\/super-admin\/(dashboard|access-management)/);
  await expect(visibleText(page, "Super Admin")).toBeVisible();
}

test.describe("Hostel owner automation", () => {
  test("owner can open the main mobile and desktop workspaces", async ({ page }) => {
    await loginAsDemoOwner(page);

    await expect(visibleText(page, "Aurora Residency")).toBeVisible();
    await expect(visibleText(page, /Collected|Collection Rate|Live Snapshot/i)).toBeVisible();

    await page.goto("/owner/rooms");
    await expect(visibleText(page, /Room occupancy|Rooms/i)).toBeVisible();
    await expect(visibleText(page, /Floor 1/i)).toBeVisible();

    await page.goto("/owner/payments");
    await expect(visibleText(page, /Payment workspace|Payments/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /pay rent/i }).filter({ visible: true }).first()).toBeVisible();

    await page.goto("/owner/notifications");
    await expect(visibleText(page, "Owner alert centre")).toBeVisible();
    await expect(visibleText(page, /Urgent alerts|Alert state/i)).toBeVisible();
  });

  test("owner can add a tenant with generated data", async ({ page }, testInfo) => {
    const tenant = uniqueTenantData(testInfo.title, testInfo.project.name);

    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");
    await page.getByRole("button", { name: /add new tenant|^add$/i }).filter({ visible: true }).first().click();

    await expect(visibleText(page, "Add Tenant")).toBeVisible();
    await page.getByPlaceholder("Enter full name").fill(tenant.fullName);
    await page.getByPlaceholder("Parent name (optional)").fill(tenant.parentName);
    await page.locator('input[type="date"]').first().fill(tenant.dateOfBirth);
    await page.getByPlaceholder("98765 43210").first().fill(tenant.phone);
    await page.getByPlaceholder("email@example.com").fill(tenant.email);
    await page.locator("select").first().selectOption("pan");
    await page.getByPlaceholder("e.g. ABCDE1234F").fill(tenant.pan);
    await page.getByPlaceholder("Name of emergency contact").fill(tenant.emergencyName);
    await page.getByPlaceholder("98765 43210").last().fill(tenant.emergencyPhone);

    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: /continue to payment/i }).click();
    await page.getByPlaceholder("Enter amount").fill(tenant.monthlyRent);
    await page.getByPlaceholder("0 if not collected yet").fill(tenant.rentPaid);
    await page.locator('input[type="date"]').last().fill(tenant.paidOnDate);
    await page.getByRole("button", { name: /save tenant/i }).click();

    await expect(visibleText(page, "Room Assignment")).toBeVisible();
    await page.getByRole("button", { name: /later/i }).click();
    await expect(visibleText(page, tenant.fullName)).toBeVisible();
  });

  test("owner can record a rent payment and see success feedback", async ({ page }) => {
    const payment = uniquePaymentData();

    await loginAsDemoOwner(page);
    await page.goto("/owner/payments?action=pay-rent&tenantId=51201");

    await expect(page.getByRole("heading", { name: "Collect Rent" }).filter({ visible: true }).first()).toBeVisible();
    await expect(visibleText(page, "Aarav Sharma")).toBeVisible();
    await page.locator('input[type="number"]').first().fill(payment.amount);
    await page.locator('input[type="date"]').first().fill(payment.paidOnDate);
    await page.locator("select").first().selectOption("online");
    await page.getByPlaceholder("Enter transaction ID").fill(payment.txnId);
    await page.getByRole("button", { name: /record payment/i }).filter({ visible: true }).first().click();

    await expect(page.getByRole("status").filter({ hasText: /payment recorded/i })).toBeVisible();
  });
});

test.describe("Super-admin automation", () => {
  test("super admin can login and open access management", async ({ page }) => {
    await loginAsSuperAdmin(page);

    if (!page.url().includes("/super-admin/access-management")) {
      await page.getByRole("button", { name: /access management/i }).click();
    }
    await expect(page).toHaveURL(/\/super-admin\/access-management/);
    await expect(visibleText(page, "Owner Accounts")).toBeVisible();
    await expect(page.getByRole("button", { name: /invite owner/i }).filter({ visible: true }).first()).toBeVisible();
  });
});
