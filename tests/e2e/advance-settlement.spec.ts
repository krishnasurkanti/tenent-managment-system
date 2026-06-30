import { expect, test, type Page } from "@playwright/test";

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
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
  await hostelsPromise;
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
}

async function getCsrf(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const res = await fetch("/api/csrf");
    const data = await res.json() as { token?: string };
    return data.token ?? "";
  });
}

async function apiPost(page: Page, path: string, body: Record<string, unknown>) {
  const csrf = await getCsrf(page);
  return page.evaluate(
    async ({ path, body, csrf }) => {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": decodeURIComponent(csrf) },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });
      return { ok: res.ok, status: res.status, body: await res.json() };
    },
    { path, body, csrf },
  );
}

test.describe("Advance and service fee settlement", () => {
  test("records advance, service fee, and owner-confirmed refund in ledger", async ({ page }) => {
    await loginAsDemoOwner(page);

    const created = await apiPost(page, "/api/tenants", {
      fullName: "Advance Ledger Tenant",
      phone: "9898989898",
      monthlyRent: 5000,
      rentPaid: 5000,
      advanceAmount: 2000,
      serviceFeeAmount: 2000,
      paidOnDate: "2026-05-01",
      billingCycle: "monthly",
    });

    expect(created.ok).toBe(true);
    const tenant = (created.body as { tenant?: { tenantId?: string; advanceAmount?: number; serviceFeeAmount?: number } }).tenant;
    expect(tenant?.tenantId).toBeTruthy();
    expect(tenant?.advanceAmount).toBe(2000);
    expect(tenant?.serviceFeeAmount).toBe(2000);

    const ledgerBeforeRefund = await page.evaluate(async () => {
      const res = await fetch("/api/finance-ledger");
      return res.json() as Promise<{ entries: Array<{ tenantName: string; type: string; amount: number }> }>;
    });
    expect(ledgerBeforeRefund.entries.some((entry) =>
      entry.tenantName === "Advance Ledger Tenant" && entry.type === "advance_collected" && entry.amount === 2000
    )).toBe(true);
    expect(ledgerBeforeRefund.entries.some((entry) =>
      entry.tenantName === "Advance Ledger Tenant" && entry.type === "service_fee_collected" && entry.amount === 2000
    )).toBe(true);

    const removed = await apiPost(page, "/api/tenants/remove", {
      tenantId: tenant?.tenantId,
      advanceRefundEligible: true,
      refundAdvance: true,
      refundAmount: 2000,
      settlementNote: "Notice accepted by owner",
      settlementDate: "2026-05-25",
    });
    expect(removed.ok).toBe(true);

    const ledgerAfterRefund = await page.evaluate(async () => {
      const res = await fetch("/api/finance-ledger");
      return res.json() as Promise<{ entries: Array<{ tenantName: string; type: string; amount: number; direction: string }> }>;
    });
    expect(ledgerAfterRefund.entries.some((entry) =>
      entry.tenantName === "Advance Ledger Tenant" &&
      entry.type === "advance_refund" &&
      entry.direction === "debit" &&
      entry.amount === 2000
    )).toBe(true);
  });

  test("tenant form and vacating modal show the owner-controlled advance wording", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");

    await page.getByRole("button", { name: /add new tenant|^add$/i }).filter({ visible: true }).first().click();
    await page.getByPlaceholder("Enter full name").fill("Advance UI Tenant");
    await page.getByRole("button", { name: /continue/i }).first().click();
    await page.getByRole("button", { name: /continue to payment/i }).first().click();

    await expect(page.getByText("Refundable Advance").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("One-time Service Fee").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("First Payment Total").filter({ visible: true }).first()).toBeVisible();

    // Close the form by navigating away (asPage mode has no Close button)
    await page.goto("/owner/tenants");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    await page.getByRole("button", { name: /remove tenant/i }).filter({ visible: true }).first().click();
    await page.getByPlaceholder(/tenant name/i).fill("Aarav");
    await page.getByRole("button", { name: /Aarav Sharma/i }).filter({ visible: true }).first().click();

    await expect(page.getByText("Advance refund eligible?").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Refund advance?").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/Suggested refundable advance/i).filter({ visible: true }).first()).toBeVisible();
  });

  test("reports show advance and refund debit totals", async ({ page }) => {
    await loginAsDemoOwner(page);

    const created = await apiPost(page, "/api/tenants", {
      fullName: "Reports Advance Tenant",
      phone: "9870004444",
      monthlyRent: 5000,
      rentPaid: 5000,
      advanceAmount: 1500,
      serviceFeeAmount: 700,
      paidOnDate: "2026-05-01",
      billingCycle: "monthly",
    });
    const tenantId = (created.body as { tenant?: { tenantId?: string } }).tenant?.tenantId;
    expect(tenantId).toBeTruthy();

    const removed = await apiPost(page, "/api/tenants/remove", {
      tenantId,
      advanceRefundEligible: true,
      refundAdvance: true,
      refundAmount: 1500,
      settlementDate: "2026-05-25",
    });
    expect(removed.ok).toBe(true);

    // Verify the ledger API recorded the specific refund entry for this tenant
    const ledger = await page.evaluate(async () => {
      const res = await fetch("/api/finance-ledger");
      return res.json() as Promise<{ entries: Array<{ tenantName: string; type: string; amount: number; direction: string }> }>;
    });
    expect(ledger.entries.some((e) =>
      e.tenantName === "Reports Advance Tenant" &&
      e.type === "advance_refund" &&
      e.direction === "debit" &&
      e.amount === 1500
    )).toBe(true);

    // Also verify reports page renders the ledger section
    await page.goto("/owner/reports");
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await expect(page.getByText("Advance & Service Ledger").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Advance refund debit").filter({ visible: true }).first()).toBeVisible();
  });
});
