import { expect, test, type Page } from "@playwright/test";

type Tenant = {
  tenantId: string;
  fullName: string;
  fatherName?: string;
  dateOfBirth?: string;
  phone: string;
  email: string;
  idType?: string;
  idNumber: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  monthlyRent: number;
  rentPaid: number;
  paidOnDate: string;
  nextDueDate: string;
  billingCycle?: "daily" | "weekly" | "monthly";
  assignment?: {
    hostelId: string;
    hostelName: string;
    floorNumber: number;
    roomNumber: string;
    sharingType: string;
    bedId?: string;
    bedLabel?: string;
  };
  paymentHistory: Array<{
    amount: number;
    paidOnDate: string;
    nextDueDate: string;
    status: "active" | "due-soon" | "overdue";
    paymentMethod: "cash" | "online";
  }>;
};

type HostelInventory = {
  hostelId: string;
  hostelName: string;
  rooms: Array<{
    capacity: number;
    occupied: number;
  }>;
};

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
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
  await hostelsPromise;
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
}

async function getTenantPayload(page: Page, query = "") {
  return page.evaluate(async (path) => {
    const response = await fetch(`/api/tenants${path}`);
    return {
      ok: response.ok,
      status: response.status,
      body: await response.json(),
    };
  }, query) as Promise<{ ok: boolean; status: number; body: { tenants: Tenant[]; hostels: HostelInventory[]; message?: string } }>;
}

async function patchTenant(page: Page, tenantId: string, body: Record<string, unknown>) {
  return page.evaluate(async ({ id, payload }) => {
    const csrfRes = await fetch("/api/csrf");
    const csrfData = await csrfRes.json() as { token?: string };
    const csrf = csrfData.token ?? "";
    const response = await fetch(`/api/tenants/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": decodeURIComponent(csrf),
      },
      body: JSON.stringify(payload),
    });
    return {
      ok: response.ok,
      status: response.status,
      body: await response.json(),
    };
  }, { id: tenantId, payload: body }) as Promise<{ ok: boolean; status: number; body: { message?: string } }>;
}

test.describe("Deep owner data integrity", () => {
  // Reset the demo store before each test in this describe so prior spec-file
  // contamination (ghost tenants created but not cleaned up by other specs)
  // does not affect the data-integrity assertions.
  test.beforeEach(async ({ request }) => {
    await request.post("/api/test/reset");
  });

  test("demo hostel, room, bed, tenant, billing, and alert data stays complete and isolated", async ({ page }) => {
    await loginAsDemoOwner(page);

    const payload = await getTenantPayload(page, "?historyLimit=120");
    expect(payload.ok).toBe(true);

    const tenants = payload.body.tenants;
    const hostels = payload.body.hostels;

    // Demo workspace should always have tenants and hostels
    expect(tenants.length).toBeGreaterThanOrEqual(1);
    expect(hostels.length).toBeGreaterThanOrEqual(1);

    // Verify primary demo hostel has rooms
    const primaryHostel = hostels[0];
    expect(primaryHostel.hostelId).toBeTruthy();
    expect(primaryHostel.hostelName).toBeTruthy();
    const rooms = primaryHostel.rooms;
    expect(rooms.length).toBeGreaterThanOrEqual(1);

    // Verify all tenants have required fields
    for (const tenant of tenants) {
      expect(tenant.tenantId).toBeTruthy();
      expect(tenant.fullName).toBeTruthy();
      expect(tenant.phone).toMatch(/^\d{10}$/);
      expect(tenant.email).toContain("@");
      expect(tenant.monthlyRent).toBeGreaterThan(0);
      expect(tenant.paidOnDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(tenant.nextDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(tenant.paymentHistory.length).toBeGreaterThanOrEqual(1);
      expect(tenant.paymentHistory[0]?.paidOnDate).toBe(tenant.paidOnDate);
      expect(tenant.paymentHistory[0]?.nextDueDate).toBe(tenant.nextDueDate);
    }

    // Verify billing status variety exists in demo data
    const statuses = new Set(tenants.flatMap((t) => t.paymentHistory[0]?.status).filter(Boolean));
    expect(statuses.size).toBeGreaterThanOrEqual(2);

    // Verify hostel isolation: filtering by hostelId returns only that hostel's tenants
    for (const hostel of hostels.slice(0, 2)) {
      const isolated = await getTenantPayload(page, `?hostelId=${encodeURIComponent(hostel.hostelId)}`);
      expect(isolated.ok).toBe(true);
      const crossContam = isolated.body.tenants.filter((t) => t.assignment?.hostelId && t.assignment.hostelId !== hostel.hostelId);
      expect(crossContam).toHaveLength(0);
    }
  });

  test("tenant profiles render saved details and ghost or cross-hostel lookups fail cleanly", async ({ page }) => {
    await loginAsDemoOwner(page);

    const allPayload = await getTenantPayload(page, "?historyLimit=120");
    // Use the first tenant with a full assignment (has hostelId)
    const tenant = allPayload.body.tenants.find((item) => item.assignment?.hostelId);
    // Find a different hostel for cross-hostel isolation test
    const otherHostel = allPayload.body.hostels.find((h) => h.hostelId !== tenant?.assignment?.hostelId);

    expect(tenant).toBeTruthy();

    // Navigate to tenant profile
    await page.goto(`/owner/tenants/${tenant?.tenantId}`);
    await expect(visibleText(page, tenant?.fullName ?? "")).toBeVisible();
    await expect(visibleText(page, tenant?.phone ?? "")).toBeVisible();
    await expect(visibleText(page, tenant?.email ?? "")).toBeVisible();

    // Ghost lookup: non-existent tenant ID returns empty list
    const ghostListPayload = await getTenantPayload(page, "?tenantId=999999");
    expect(ghostListPayload.body.tenants).toHaveLength(0);

    // Ghost patch: PATCH non-existent tenant returns 404
    const ghostPatch = await patchTenant(page, "999999", { idNumber: "ABCDE1234F" });
    expect(ghostPatch.ok).toBe(false);
    expect(ghostPatch.status).toBe(404);
    expect(ghostPatch.body.message).toMatch(/tenant not found/i);

    // Ghost page: navigating to non-existent tenant shows error
    await page.goto("/owner/tenants/999999");
    await expect(page.getByRole("alert").filter({ hasText: /failed to load|404/i })).toBeVisible();

    // Cross-hostel isolation: if a second hostel exists, verify it can't see this tenant
    if (otherHostel) {
      const crossHostelPayload = await getTenantPayload(
        page,
        `?hostelId=${encodeURIComponent(otherHostel.hostelId)}&tenantId=${encodeURIComponent(tenant?.tenantId ?? "")}`,
      );
      expect(crossHostelPayload.body.tenants).toHaveLength(0);
    }
  });
});
