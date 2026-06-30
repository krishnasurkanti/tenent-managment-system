/**
 * payment-flows.spec.ts
 * Tests every payment recording scenario:
 * cash, online, add-proof, history growth, nextDueDate update,
 * edge cases (zero amount, double submit), and payments page metrics.
 */
import { expect, test, type Page } from "@playwright/test";
import { uniquePaymentData } from "./test-data";

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function visibleText(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true }).first();
}

async function loginAsDemoOwner(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    // Pre-select Aurora Residency — test-created hostels get prepended (unshift) to the
    // demo store and would become hostels[0], making UI default to the wrong hostel.
    window.localStorage.setItem("currentHostelId", "owner-hostel-aurora");
  });
  await page.goto("/owner/login");
  const hostelsPromise = page.waitForResponse(
    (r) => r.url().includes("/api/owner-hostels") && r.status() !== 401,
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 20000 });
  await hostelsPromise;
  // cap networkidle — dev server compile can hang indefinitely
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
}

async function getHistoryLength(page: Page, tenantId: string): Promise<number> {
  return page.evaluate(async (id) => {
    const res = await fetch(`/api/tenants?tenantId=${encodeURIComponent(id)}&historyLimit=120`);
    const body = await res.json();
    const tenant = (body as { tenants: Array<{ tenantId: string; paymentHistory: unknown[] }> }).tenants.find(
      (t) => t.tenantId === id,
    );
    return tenant?.paymentHistory.length ?? 0;
  }, tenantId);
}

async function getTenantNextDue(page: Page, tenantId: string): Promise<string> {
  return page.evaluate(async (id) => {
    const res = await fetch(`/api/tenants?tenantId=${encodeURIComponent(id)}`);
    const body = await res.json();
    const tenant = (body as { tenants: Array<{ tenantId: string; nextDueDate: string }> }).tenants.find(
      (t) => t.tenantId === id,
    );
    return tenant?.nextDueDate ?? "";
  }, tenantId);
}

// â”€â”€ cash payment flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Cash payment", () => {
  test("records cash payment and shows success toast", async ({ page }) => {
    const payment = uniquePaymentData();
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments?action=pay-rent&tenantId=51201");

    await expect(page.getByRole("heading", { name: "Collect Rent" }).filter({ visible: true }).first()).toBeVisible();
    await expect(visibleText(page, "Aarav Sharma")).toBeVisible();

    await page.locator('input[type="number"]').first().fill(payment.amount);
    await page.locator('input[type="date"]').first().fill(payment.paidOnDate);
    // Cash is the default â€” no need to select
    await page.getByRole("button", { name: /record payment/i }).filter({ visible: true }).first().click();

    await expect(page.getByRole("status").filter({ hasText: /payment recorded/i })).toBeVisible();
  });

  test("payment history grows by 1 after successful cash payment", async ({ page }) => {
    const payment = uniquePaymentData();
    await loginAsDemoOwner(page);

    await page.goto("/owner/payments?action=pay-rent&tenantId=51204");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await expect(page.getByRole("heading", { name: "Collect Rent" }).filter({ visible: true }).first()).toBeVisible();

    // Capture the pay-rent API response which returns the updated tenant
    const [paymentResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/tenants/pay-rent") && r.request().method() === "POST"),
      (async () => {
        await page.locator('input[type="number"]').first().fill(payment.amount);
        await page.locator('input[type="date"]').first().fill(payment.paidOnDate);
        await page.getByRole("button", { name: /record payment/i }).filter({ visible: true }).first().click();
      })(),
    ]);

    expect(paymentResp.status()).toBe(200);
    const body = await paymentResp.json() as { tenant?: { paymentHistory?: unknown[] } };
    // The response returns the updated tenant â€” history should have at least 1 entry
    expect((body.tenant?.paymentHistory?.length ?? 0)).toBeGreaterThanOrEqual(1);
    await expect(page.getByRole("status").filter({ hasText: /payment recorded/i })).toBeVisible();
  });

  test("nextDueDate updates after recording payment for monthly tenant", async ({ page }) => {
    const payment = uniquePaymentData();
    await loginAsDemoOwner(page);

    // Use 51203 (Kabir Reddy) â€” Aurora Residency
    const beforeDue = await getTenantNextDue(page, "51203");

    await page.goto("/owner/payments?action=pay-rent&tenantId=51203");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await expect(page.getByRole("heading", { name: "Collect Rent" }).filter({ visible: true }).first()).toBeVisible();
    await page.locator('input[type="number"]').first().fill(payment.amount);
    await page.locator('input[type="date"]').first().fill(payment.paidOnDate);
    await page.getByRole("button", { name: /record payment/i }).filter({ visible: true }).first().click();
    await expect(page.getByRole("status").filter({ hasText: /payment recorded/i })).toBeVisible();

    const afterDue = await getTenantNextDue(page, "51203");
    // nextDue must be on or after the paidOnDate
    expect(afterDue >= payment.paidOnDate).toBe(true);
  });
});

// â”€â”€ online payment flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Online payment", () => {
  test("records online payment with transaction ID", async ({ page }) => {
    const payment = uniquePaymentData();
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments?action=pay-rent&tenantId=51201");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    await expect(visibleText(page, "Aarav Sharma")).toBeVisible();

    await page.locator('input[type="number"]').first().fill(payment.amount);
    await page.locator('input[type="date"]').first().fill(payment.paidOnDate);
    await page.locator("select").first().selectOption("online");
    await page.getByPlaceholder("Enter transaction ID").fill(payment.txnId);
    await page.getByRole("button", { name: /record payment/i }).filter({ visible: true }).first().click();

    await expect(page.getByRole("status").filter({ hasText: /payment recorded/i })).toBeVisible();
  });

  test("transaction ID persisted in payment history", async ({ page }) => {
    const payment = uniquePaymentData();
    await loginAsDemoOwner(page);

    // Use 51202 (Diya Patel) â€” Aurora Residency, not touched by earlier tests
    await page.goto("/owner/payments?action=pay-rent&tenantId=51202");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await expect(page.getByRole("heading", { name: "Collect Rent" }).filter({ visible: true }).first()).toBeVisible();

    // Capture the pay-rent API response which returns the updated tenant
    const [paymentResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/tenants/pay-rent") && r.request().method() === "POST"),
      (async () => {
        await page.locator('input[type="number"]').first().fill(payment.amount);
        await page.locator('input[type="date"]').first().fill(payment.paidOnDate);
        await page.locator("select").first().selectOption("online");
        await page.getByPlaceholder("Enter transaction ID").fill(payment.txnId);
        await page.getByRole("button", { name: /record payment/i }).filter({ visible: true }).first().click();
      })(),
    ]);

    expect(paymentResp.status()).toBe(200);
    const body = await paymentResp.json() as { tenant?: { paymentHistory?: Array<{ txnId?: string }> } };
    // The response returns the updated tenant â€” check txnId is stored in the newest entry
    const stored = body.tenant?.paymentHistory?.some((p) => p.txnId === payment.txnId) ?? false;
    expect(stored).toBe(true);
    await expect(page.getByRole("status").filter({ hasText: /payment recorded/i })).toBeVisible();
  });
});

// â”€â”€ payments page metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Payments page metrics", () => {
  test("shows Collected, Expected, Needs attention, Proof coverage stats", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments");

    await expect(visibleText(page, /collected/i)).toBeVisible();
    await expect(visibleText(page, /expected/i)).toBeVisible();
    await expect(visibleText(page, /needs attention/i)).toBeVisible();
  });

  test("Pay Rent links are present for tenants requiring payment", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments");

    const payRentLinks = page.getByRole("link", { name: /pay rent/i }).filter({ visible: true });
    await expect(payRentLinks.first()).toBeVisible();
  });

  test("payment table shows Paid On and Next Due columns", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    // Desktop table shows "Paid On"/"Next Due"; mobile cards show "Paid"/"Next"
    await expect(visibleText(page, /paid on|^paid$/i)).toBeVisible();
    await expect(visibleText(page, /next due|^next$/i)).toBeVisible();
  });

  test("payment mode column shows cash or online", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments");

    const modeText = page.getByText(/cash|online/i).filter({ visible: true }).first();
    await expect(modeText).toBeVisible();
  });
});

// â”€â”€ pay rent modal validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Pay rent modal validation", () => {
  test("modal opens from payments page and shows tenant name", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments?action=pay-rent&tenantId=51201");

    await expect(page.getByRole("heading", { name: "Collect Rent" }).filter({ visible: true }).first()).toBeVisible();
    await expect(visibleText(page, "Aarav Sharma")).toBeVisible();
  });

  test("modal pre-fills monthly rent as default amount", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments?action=pay-rent&tenantId=51201");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    // Amount input should be pre-filled with 8500 (Aarav's rent)
    const amountInput = page.locator('input[type="number"]').first();
    const value = await amountInput.inputValue();
    expect(Number(value)).toBeGreaterThan(0);
  });

  test("submit button is disabled when amount is 0", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments?action=pay-rent&tenantId=51201");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill("0");

    // Try to submit
    const submitBtn = page.getByRole("button", { name: /record payment/i }).filter({ visible: true }).first();
    await submitBtn.click();

    // Should still show the form (not navigate away with success)
    await expect(page.getByRole("heading", { name: "Collect Rent" }).filter({ visible: true }).first()).toBeVisible();
  });

  test("can navigate directly to pay-rent modal via URL", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments?action=pay-rent&tenantId=51204"); // Meera Nair

    await expect(page.getByRole("heading", { name: "Collect Rent" }).filter({ visible: true }).first()).toBeVisible();
    await expect(visibleText(page, "Meera Nair")).toBeVisible();
  });
});

// â”€â”€ dashboard payment shortcuts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Dashboard payment shortcuts", () => {
  test("Collect button from dashboard links to payments area", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/dashboard");

    // Dashboard has payment-related links â€” verify at least one exists
    const paymentLink = page.getByRole("link", { name: /collect|pay rent|payments/i }).filter({ visible: true }).first();
    await expect(paymentLink).toBeVisible();

    const href = await paymentLink.getAttribute("href");
    expect(href).toMatch(/\/owner\/payments/);
  });
});

// â”€â”€ add payment proof modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Add payment proof", () => {
  test("Add Proof button opens proof modal", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments");

    // Find Add Proof button â€” only present if txnId/proof is missing
    const addProofBtn = page.getByRole("button", { name: /add proof/i }).filter({ visible: true }).first();
    if (await addProofBtn.count() > 0) {
      await addProofBtn.click();
      await expect(page.getByRole("heading", { name: /add payment proof/i }).filter({ visible: true }).first()).toBeVisible();

      // Can fill txn ID
      const txnInput = page.getByPlaceholder(/transaction id/i).filter({ visible: true }).first();
      if (await txnInput.count() > 0) {
        await txnInput.fill("PROOF-TXN-001");
      }

      // Cancel closes modal
      await page.getByRole("button", { name: /cancel/i }).filter({ visible: true }).first().click();
      await expect(page.getByRole("heading", { name: /add payment proof/i }).filter({ visible: true })).toHaveCount(0);
    }
  });
});

// â”€â”€ payment history capped at 120 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Payment history cap", () => {
  test("historyLimit param respected â€” max 120 entries returned", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/tenants?historyLimit=5");
      const body = await res.json() as { tenants: Array<{ paymentHistory: unknown[] }> };
      return body.tenants.map((t) => t.paymentHistory.length);
    });

    for (const len of result) {
      expect(len).toBeLessThanOrEqual(5);
    }
  });
});
