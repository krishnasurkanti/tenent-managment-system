import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

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
  floors: Array<{
    floorNumber: number;
    rooms: Array<{
      roomNumber: string;
      capacity: number;
      occupied: number;
      beds?: Array<{ id: string; occupied: boolean; tenantId?: string; tenantName?: string }>;
    }>;
  }>;
};

const DEEP_HOSTEL_PREFIX = "owner-hostel-deep-owner-";
const DEEP_TENANT_PREFIX = "72";

test.beforeAll(() => {
  execFileSync("node", ["scripts/seed-fake-data.mjs"], { stdio: "inherit" });
});

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
  test("seeded hostel, room, bed, tenant, billing, and alert data stays complete and isolated", async ({ page }) => {
    await loginAsDemoOwner(page);

    const payload = await getTenantPayload(page, "?historyLimit=120");
    expect(payload.ok).toBe(true);

    const deepTenants = payload.body.tenants.filter((tenant) => tenant.tenantId.startsWith(DEEP_TENANT_PREFIX));
    const deepHostels = payload.body.hostels.filter((hostel) => hostel.hostelId.startsWith(DEEP_HOSTEL_PREFIX));

    expect(deepHostels).toHaveLength(10);
    expect(deepTenants).toHaveLength(25);

    for (const hostel of deepHostels) {
      const expectedTenantCount = Number(hostel.hostelId.slice(-2)) % 2 === 1 ? 2 : 3;
      const tenantsForHostel = deepTenants.filter((tenant) => tenant.assignment?.hostelId === hostel.hostelId);
      const rooms = hostel.floors.flatMap((floor) => floor.rooms);
      const totalBeds = rooms.reduce((sum, room) => sum + room.capacity, 0);
      const occupiedBeds = rooms.reduce((sum, room) => sum + room.occupied, 0);

      expect(rooms).toHaveLength(10);
      expect(Math.min(...rooms.map((room) => room.capacity))).toBeGreaterThanOrEqual(2);
      expect(totalBeds).toBeGreaterThanOrEqual(20);
      expect(tenantsForHostel).toHaveLength(expectedTenantCount);
      expect(occupiedBeds).toBe(expectedTenantCount);
      expect(totalBeds - occupiedBeds).toBeGreaterThanOrEqual(17);

      for (const tenant of tenantsForHostel) {
        expect(tenant.fullName).toMatch(/Deep Tenant/);
        expect(tenant.fatherName).toBeTruthy();
        expect(tenant.dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(tenant.phone).toMatch(/^\d{10}$/);
        expect(tenant.email).toContain("@example.test");
        expect(tenant.idType).toMatch(/aadhar|pan|driving_licence/);
        expect(tenant.idNumber).not.toBe("PENDING-ID");
        expect(tenant.emergencyContactName).toBeTruthy();
        expect(tenant.emergencyContactRelation).toBeTruthy();
        expect(tenant.emergencyContactPhone).toMatch(/^\d{10}$/);
        expect(tenant.monthlyRent).toBeGreaterThan(0);
        expect(tenant.rentPaid).toBeGreaterThanOrEqual(0);
        expect(tenant.paidOnDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(tenant.nextDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(tenant.billingCycle).toMatch(/daily|weekly|monthly/);
        expect(tenant.assignment?.hostelName).toBe(hostel.hostelName);
        expect(tenant.assignment?.floorNumber).toBe(1);
        expect(tenant.assignment?.roomNumber).toBeTruthy();
        expect(tenant.assignment?.bedId).toBeTruthy();
        expect(tenant.assignment?.bedLabel).toBeTruthy();
        expect(tenant.paymentHistory[0]?.paidOnDate).toBe(tenant.paidOnDate);
        expect(tenant.paymentHistory[0]?.nextDueDate).toBe(tenant.nextDueDate);
      }

      const isolatedPayload = await getTenantPayload(page, `?hostelId=${encodeURIComponent(hostel.hostelId)}`);
      expect(isolatedPayload.body.tenants).toHaveLength(expectedTenantCount);
      expect(isolatedPayload.body.tenants.every((tenant) => tenant.assignment?.hostelId === hostel.hostelId)).toBe(true);
    }

    expect(deepTenants.some((tenant) => tenant.paymentHistory[0]?.status === "overdue")).toBe(true);
    expect(deepTenants.some((tenant) => tenant.paymentHistory[0]?.status === "due-soon")).toBe(true);
    expect(deepTenants.some((tenant) => tenant.paymentHistory[0]?.status === "active")).toBe(true);
    expect(deepTenants.some((tenant) => tenant.billingCycle === "weekly")).toBe(true);
    expect(deepTenants.some((tenant) => tenant.billingCycle === "daily")).toBe(true);
  });

  test("tenant profiles render saved details and ghost or cross-hostel lookups fail cleanly", async ({ page }) => {
    await loginAsDemoOwner(page);

    const allPayload = await getTenantPayload(page, "?historyLimit=120");
    const tenant = allPayload.body.tenants.find((item) => item.tenantId === "72001");
    const wrongHostel = allPayload.body.hostels.find((hostel) => hostel.hostelId.startsWith(DEEP_HOSTEL_PREFIX) && hostel.hostelId !== tenant?.assignment?.hostelId);

    expect(tenant).toBeTruthy();
    expect(wrongHostel).toBeTruthy();

    await page.goto(`/owner/tenants/${tenant?.tenantId}`);
    await expect(visibleText(page, tenant?.fullName ?? "")).toBeVisible();
    await expect(visibleText(page, tenant?.phone ?? "")).toBeVisible();
    await expect(visibleText(page, tenant?.email ?? "")).toBeVisible();
    await expect(visibleText(page, tenant?.idNumber ?? "")).toBeVisible();
    await expect(visibleText(page, tenant?.fatherName ?? "")).toBeVisible();
    await expect(visibleText(page, tenant?.dateOfBirth ?? "")).toBeVisible();
    await expect(visibleText(page, tenant?.emergencyContactName ?? "")).toBeVisible();
    await expect(visibleText(page, tenant?.assignment?.hostelName ?? "")).toBeVisible();
    await expect(visibleText(page, tenant?.assignment?.roomNumber ?? "")).toBeVisible();
    await expect(visibleText(page, tenant?.paymentHistory[0]?.paymentId ?? "")).toBeVisible();

    const crossHostelPayload = await getTenantPayload(
      page,
      `?hostelId=${encodeURIComponent(wrongHostel?.hostelId ?? "")}&tenantId=${encodeURIComponent(tenant?.tenantId ?? "")}`,
    );
    expect(crossHostelPayload.body.tenants).toHaveLength(0);

    const ghostListPayload = await getTenantPayload(page, "?tenantId=999999");
    expect(ghostListPayload.body.tenants).toHaveLength(0);

    const ghostPatch = await patchTenant(page, "999999", { idNumber: "ABCDE1234F" });
    expect(ghostPatch.ok).toBe(false);
    expect(ghostPatch.status).toBe(404);
    expect(ghostPatch.body.message).toMatch(/tenant not found/i);

    await page.goto("/owner/tenants/999999");
    await expect(page.getByRole("alert").filter({ hasText: /failed to load|404/i })).toBeVisible();
  });
});
