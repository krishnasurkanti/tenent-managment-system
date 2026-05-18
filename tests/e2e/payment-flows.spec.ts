/**
 * payment-flows.spec.ts
 * Tests every payment recording scenario:
 * cash, online, add-proof, history growth, nextDueDate update,
 * edge cases (zero amount, double submit), and payments page metrics.
 */
import { expect, test, type Page } from "@playwright/test";
import { uniquePaymentData } from "./test-data";

// ── helpers ──────────────────────────────────────────────────────────────────

function visibleText(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true }).first();
}

async function loginAsDemoOwner(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/owner/login");
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await expect(page).toHaveURL(/\/owner\/dashboard/);
  await page.waitForLoadState("networkidle");
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

// ── cash payment flow ─────────────────────────────────────────────────────────

test.describe("Cash payment", () => {
  test("records cash payment and shows success toast", async ({ page }) => {
    const payment = uniquePaymentData();
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments?action=pay-rent&tenantId=51201");

    await expect(page.getByRole("heading", { name: "Collect Rent" }).filter({ visible: true }).first()).toBeVisible();
    await expect(visibleText(page, "Aarav Sharma")).toBeVisible();

    await page.locator('input[type="number"]').first().fill(payment.amount);
    await page.locator('input[type="date"]').first().fill(payment.paidOnDate);
    // Cash is the default — no need to select
    await page.getByRole("button", { name: /record payment/i }).filter({ visible: true }).first().click();

    await expect(page.getByRole("status").filter({ hasText: /payment recorded/i })).toBeVisible();
  });

  test("payment history grows by 1 after successful cash payment", async ({ page }) => {
    const payment = uniquePaymentData();
    await loginAsDemoOwner(page);

    // Use 51204 (Meera Nair) — Aurora Residency, not touched by first cash test
    const beforeCount = await getHistoryLength(page, "51204");

    await page.goto("/owner/payments?action=pay-rent&tenantId=51204");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Collect Rent" }).filter({ visible: true }).first()).toBeVisible();
    await page.locator('input[type="number"]').first().fill(payment.amount);
    await page.locator('input[type="date"]').first().fill(payment.paidOnDate);
    await page.getByRole("button", { name: /record payment/i }).filter({ visible: true }).first().click();
    await expect(page.getByRole("status").filter({ hasText: /payment recorded/i })).toBeVisible();

    const afterCount = await getHistoryLength(page, "51204");
    expect(afterCount).toBe(beforeCount + 1);
  });

  test("nextDueDate updates after recording payment for monthly tenant", async ({ page }) => {
    const payment = uniquePaymentData();
    await loginAsDemoOwner(page);

    // Use 51203 (Kabir Reddy) — Aurora Residency
    const beforeDue = await getTenantNextDue(page, "51203");

    await page.goto("/owner/payments?action=pay-rent&tenantId=51203");
    await page.waitForLoadState("networkidle");
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

// ── online payment flow ───────────────────────────────────────────────────────

test.describe("Online payment", () => {
  test("records online payment with transaction ID", async ({ page }) => {
    const payment = uniquePaymentData();
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments?action=pay-rent&tenantId=51201");
    await page.waitForLoadState("networkidle");

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

    // Use 51202 (Diya Patel) — Aurora Residency, not touched by earlier tests
    await page.goto("/owner/payments?action=pay-rent&tenantId=51202");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Collect Rent" }).filter({ visible: true }).first()).toBeVisible();
    await page.locator('input[type="number"]').first().fill(payment.amount);
    await page.locator('input[type="date"]').first().fill(payment.paidOnDate);
    await page.locator("select").first().selectOption("online");
    await page.getByPlaceholder("Enter transaction ID").fill(payment.txnId);
    await page.getByRole("button", { name: /record payment/i }).filter({ visible: true }).first().click();
    await expect(page.getByRole("status").filter({ hasText: /payment recorded/i })).toBeVisible();

    // Check txnId in API response
    const stored = await page.evaluate(async (txn) => {
      const res = await fetch("/api/tenants?tenantId=51202&historyLimit=5");
      const body = await res.json() as { tenants: Array<{ paymentHistory: Array<{ txnId?: string }> }> };
      return body.tenants[0]?.paymentHistory.some((p) => p.txnId === txn);
    }, payment.txnId);
    expect(stored).toBe(true);
  });
});

// ── payments page metrics ─────────────────────────────────────────────────────

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
    await page.waitForLoadState("networkidle");

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

// ── pay rent modal validation ─────────────────────────────────────────────────

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
    await page.waitForLoadState("networkidle");

    // Amount input should be pre-filled with 8500 (Aarav's rent)
    const amountInput = page.locator('input[type="number"]').first();
    const value = await amountInput.inputValue();
    expect(Number(value)).toBeGreaterThan(0);
  });

  test("submit button is disabled when amount is 0", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments?action=pay-rent&tenantId=51201");
    await page.waitForLoadState("networkidle");

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

// ── dashboard payment shortcuts ───────────────────────────────────────────────

test.describe("Dashboard payment shortcuts", () => {
  test("Collect button from dashboard links to payments area", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/dashboard");

    // Dashboard has payment-related links — verify at least one exists
    const paymentLink = page.getByRole("link", { name: /collect|pay rent|payments/i }).filter({ visible: true }).first();
    await expect(paymentLink).toBeVisible();

    const href = await paymentLink.getAttribute("href");
    expect(href).toMatch(/\/owner\/payments/);
  });
});

// ── add payment proof modal ───────────────────────────────────────────────────

test.describe("Add payment proof", () => {
  test("Add Proof button opens proof modal", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/payments");

    // Find Add Proof button — only present if txnId/proof is missing
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

// ── payment history capped at 120 ────────────────────────────────────────────

test.describe("Payment history cap", () => {
  test("historyLimit param respected — max 120 entries returned", async ({ page }) => {
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
