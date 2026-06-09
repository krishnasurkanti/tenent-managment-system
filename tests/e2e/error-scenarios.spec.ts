/**
 * error-scenarios.spec.ts
 *
 * Comprehensive error handling test suite.
 * Tests every documented error path — validates correct HTTP status + error message shape.
 *
 * All tests run in demo mode (PLAYWRIGHT_TEST=true) against the in-memory store.
 * Rate-limit tests are NOT included because apiRateLimit is bypassed when
 * PLAYWRIGHT_TEST=true — see ERROR_CATALOG.md §10.
 *
 * Test suites:
 *   Suite 1  — Hostel creation errors
 *   Suite 2  — Tenant creation errors
 *   Suite 3  — Room assignment errors
 *   Suite 4  — Payment errors (JSON mode)
 *   Suite 5  — Payment proof upload errors (multipart mode)
 *   Suite 6  — Vacate / Remove errors
 *   Suite 7  — Auth / unauthenticated errors
 *   Suite 8  — Multi-hostel bed capacity scenarios
 */

import { expect, test, type Page } from "@playwright/test";
import { TINY_PNG_BYTES } from "./test-data";

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

async function loginAsDemoOwner(page: Page): Promise<void> {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/owner/login");
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
}

async function getCsrf(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const res = await fetch("/api/csrf");
    const data = (await res.json()) as { token?: string };
    return data.token ?? "";
  });
}

type ApiResult = { ok: boolean; status: number; body: Record<string, unknown> };

async function apiPost(
  page: Page,
  path: string,
  body: Record<string, unknown>,
): Promise<ApiResult> {
  const csrf = await getCsrf(page);
  return page.evaluate(
    async ({ path, body, csrf }) => {
      const res = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": decodeURIComponent(csrf),
        },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });
      return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
    },
    { path, body, csrf },
  );
}

async function apiGet(
  page: Page,
  path: string,
): Promise<ApiResult> {
  return page.evaluate(async (path) => {
    const res = await fetch(path, { credentials: "same-origin" });
    return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
  }, path);
}

async function apiPut(
  page: Page,
  path: string,
  body: Record<string, unknown>,
): Promise<ApiResult> {
  const csrf = await getCsrf(page);
  return page.evaluate(
    async ({ path, body, csrf }) => {
      const res = await fetch(path, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": decodeURIComponent(csrf),
        },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });
      return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
    },
    { path, body, csrf },
  );
}

async function apiDelete(
  page: Page,
  path: string,
): Promise<ApiResult> {
  const csrf = await getCsrf(page);
  return page.evaluate(
    async ({ path, csrf }) => {
      const res = await fetch(path, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": decodeURIComponent(csrf),
        },
        credentials: "same-origin",
      });
      return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
    },
    { path, csrf },
  );
}

// ── createTestHostel ──────────────────────────────────────────────────────────
// Creates a hostel with 2 rooms × 2 beds each.
// Returns hostelId and the first room's roomNumber + bed IDs for use in tests.
type TestHostelResult = {
  hostelId: string;
  room1Number: string;
  room2Number: string;
  room1BedIds: string[];
  room2BedIds: string[];
};

async function createTestHostel(page: Page): Promise<TestHostelResult> {
  const seed = String(Date.now()).slice(-6);
  const result = await apiPost(page, "/api/owner-hostels", {
    hostelName: `Error Test Hostel ${seed}`,
    address: `${seed} Error Road, Test City`,
    type: "PG",
    rooms: [
      { roomNumber: `E${seed}01`, bedCount: 2 },
      { roomNumber: `E${seed}02`, bedCount: 2 },
    ],
  });

  expect(result.ok).toBe(true);
  const hostel = result.body.hostel as {
    id: string;
    rooms: Array<{
      roomNumber: string;
      beds?: Array<{ id: string; label: string }>;
    }>;
  };
  expect(hostel.id).toBeTruthy();

  const room1 = hostel.rooms[0];
  const room2 = hostel.rooms[1];

  return {
    hostelId: hostel.id,
    room1Number: room1.roomNumber,
    room2Number: room2.roomNumber,
    room1BedIds: (room1.beds ?? []).map((b) => b.id),
    room2BedIds: (room2.beds ?? []).map((b) => b.id),
  };
}

// ── createTestTenant ─────────────────────────────────────────────────────────
// Creates a minimal valid tenant. Pass overrides to test specific fields.
async function createTestTenant(
  page: Page,
  hostelId: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const seed = String(Date.now()).slice(-6);
  const result = await apiPost(page, "/api/tenants", {
    fullName: `Error Test Tenant ${seed}`,
    phone: `98${seed}0`.slice(0, 10),
    monthlyRent: 5000,
    rentPaid: 5000,
    paidOnDate: "2026-05-01",
    billingCycle: "monthly",
    hostelId,
    ...overrides,
  });
  expect(result.ok, `createTestTenant failed: ${JSON.stringify(result.body)}`).toBe(true);
  const tenant = result.body.tenant as { tenantId?: string };
  expect(tenant.tenantId).toBeTruthy();
  return tenant.tenantId!;
}

// ── cleanupTenant ─────────────────────────────────────────────────────────────
async function cleanupTenant(page: Page, tenantId: string): Promise<void> {
  await apiPost(page, "/api/tenants/remove", { tenantId });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: assert standard error shape
// ─────────────────────────────────────────────────────────────────────────────
function assertErrorResponse(
  result: ApiResult,
  expectedStatus: number,
  messageSubstring?: string,
): void {
  expect(result.ok).toBe(false);
  expect(result.status).toBe(expectedStatus);
  expect(typeof result.body.message).toBe("string");
  expect((result.body.message as string).length).toBeGreaterThan(0);
  if (messageSubstring) {
    expect((result.body.message as string).toLowerCase()).toContain(
      messageSubstring.toLowerCase(),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: Hostel Creation Errors
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite 1: Hostel creation errors", () => {
  test("1.1 — missing hostelName returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/owner-hostels", {
      address: "123 Test Street",
      rooms: [{ roomNumber: "101", bedCount: 2 }],
    });
    assertErrorResponse(result, 400, "hostel name");
  });

  test("1.2 — empty hostelName string returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/owner-hostels", {
      hostelName: "",
      address: "123 Test Street",
      rooms: [{ roomNumber: "101", bedCount: 2 }],
    });
    assertErrorResponse(result, 400, "hostel name");
  });

  test("1.3 — missing address returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/owner-hostels", {
      hostelName: "No Address Hostel",
      rooms: [{ roomNumber: "101", bedCount: 2 }],
    });
    assertErrorResponse(result, 400, "address");
  });

  test("1.4 — empty address string returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/owner-hostels", {
      hostelName: "Empty Address Hostel",
      address: "",
      rooms: [{ roomNumber: "101", bedCount: 2 }],
    });
    assertErrorResponse(result, 400, "address");
  });

  test("1.5 — empty rooms array returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/owner-hostels", {
      hostelName: "No Rooms Hostel",
      address: "123 Test Street",
      rooms: [],
    });
    assertErrorResponse(result, 400);
    // Message covers both missing rooms and hostelName/address check
    expect(result.status).toBe(400);
  });

  test("1.6 — rooms array absent returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/owner-hostels", {
      hostelName: "Absent Rooms Hostel",
      address: "123 Test Street",
    });
    assertErrorResponse(result, 400);
  });

  test("1.7 — room with bedCount=0 returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/owner-hostels", {
      hostelName: "Zero Bed Hostel",
      address: "123 Test Street",
      rooms: [{ roomNumber: "101", bedCount: 0 }],
    });
    assertErrorResponse(result, 400, "room number and capacity");
  });

  test("1.8 — room with missing roomNumber returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/owner-hostels", {
      hostelName: "Missing RoomNum Hostel",
      address: "123 Test Street",
      rooms: [{ roomNumber: "", bedCount: 2 }],
    });
    assertErrorResponse(result, 400, "room number");
  });

  test("1.9 — valid hostel creation succeeds (sanity check)", async ({ page }) => {
    await loginAsDemoOwner(page);
    const seed = String(Date.now()).slice(-6);
    const result = await apiPost(page, "/api/owner-hostels", {
      hostelName: `Sanity Hostel ${seed}`,
      address: "456 Valid Street",
      rooms: [
        { roomNumber: "101", bedCount: 2 },
        { roomNumber: "102", bedCount: 3 },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(201);
    const hostel = result.body.hostel as { id?: string; hostelName?: string };
    expect(hostel.id).toBeTruthy();
    expect(hostel.hostelName).toContain(`Sanity Hostel ${seed}`);
  });

  test("1.10 — GET non-existent hostel by id returns 404", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiGet(page, "/api/owner-hostels/nonexistent-hostel-99999");
    assertErrorResponse(result, 404, "not found");
  });

  test("1.11 — invalid JSON body returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const csrf = await getCsrf(page);
    const result = await page.evaluate(
      async ({ csrf }) => {
        const res = await fetch("/api/owner-hostels", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": decodeURIComponent(csrf),
          },
          body: "{ this is not valid json !!!",
          credentials: "same-origin",
        });
        return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
      },
      { csrf },
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: Tenant Creation Errors
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite 2: Tenant creation errors", () => {
  test("2.1 — missing fullName returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      phone: "9876543210",
      monthlyRent: 5000,
      rentPaid: 5000,
      paidOnDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "required");
  });

  test("2.2 — empty fullName string returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "",
      phone: "9876543210",
      monthlyRent: 5000,
      rentPaid: 5000,
      paidOnDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "required");
  });

  test("2.3 — whitespace-only fullName returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "   ",
      phone: "9876543210",
      monthlyRent: 5000,
      rentPaid: 5000,
      paidOnDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "required");
  });

  test("2.4 — invalid email format returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "Email Test Tenant",
      email: "not-an-email",
      phone: "9876543210",
      monthlyRent: 5000,
      rentPaid: 5000,
      paidOnDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "email");
  });

  test("2.5 — email missing @ symbol returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "Bad Email Tenant",
      email: "invalidemail.com",
      phone: "9876543210",
      monthlyRent: 5000,
      rentPaid: 5000,
      paidOnDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "email");
  });

  test("2.6 — negative monthlyRent returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "Negative Rent Tenant",
      phone: "9876543210",
      monthlyRent: -100,
      rentPaid: 5000,
      paidOnDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "required");
  });

  test("2.7 — negative rentPaid returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "Negative RentPaid Tenant",
      phone: "9876543210",
      monthlyRent: 5000,
      rentPaid: -500,
      paidOnDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "required");
  });

  test("2.8 — negative advanceAmount returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "Negative Advance Tenant",
      phone: "9876543210",
      monthlyRent: 5000,
      rentPaid: 5000,
      advanceAmount: -2000,
      paidOnDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "advance");
  });

  test("2.9 — negative serviceFeeAmount returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "Negative Fee Tenant",
      phone: "9876543210",
      monthlyRent: 5000,
      rentPaid: 5000,
      serviceFeeAmount: -500,
      paidOnDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "advance");
  });

  test("2.10 — monthlyRent > 10,000,000 returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "Huge Rent Tenant",
      phone: "9876543210",
      monthlyRent: 10_000_001,
      rentPaid: 5000,
      paidOnDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "10,000,000");
  });

  test("2.11 — advanceAmount > 10,000,000 returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "Huge Advance Tenant",
      phone: "9876543210",
      monthlyRent: 5000,
      rentPaid: 5000,
      advanceAmount: 10_000_001,
      paidOnDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "10,000,000");
  });

  test("2.12 — missing paidOnDate returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "No Date Tenant",
      phone: "9876543210",
      monthlyRent: 5000,
      rentPaid: 5000,
    });
    assertErrorResponse(result, 400, "required");
  });

  test("2.13 — invalid paidOnDate format (MM-DD-YYYY) returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "Bad Date Format Tenant",
      phone: "9876543210",
      monthlyRent: 5000,
      rentPaid: 5000,
      paidOnDate: "05-01-2026",
    });
    assertErrorResponse(result, 400, "YYYY-MM-DD");
  });

  test("2.14 — invalid paidOnDate format (text) returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "Text Date Tenant",
      phone: "9876543210",
      monthlyRent: 5000,
      rentPaid: 5000,
      paidOnDate: "May 1 2026",
    });
    assertErrorResponse(result, 400, "YYYY-MM-DD");
  });

  test("2.15 — invalid dateOfBirth format returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "Bad DOB Tenant",
      phone: "9876543210",
      monthlyRent: 5000,
      rentPaid: 5000,
      paidOnDate: "2026-05-01",
      dateOfBirth: "15-06-1998",
    });
    assertErrorResponse(result, 400, "YYYY-MM-DD");
  });

  test("2.16 — billingCycle 'yearly' silently defaults to monthly (no error)", async ({ page }) => {
    // Per source: any value that is not 'daily' or 'weekly' defaults to 'monthly'
    // The Next.js handler does NOT reject invalid billingCycle values
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "Yearly Cycle Tenant",
      phone: "9191919191",
      monthlyRent: 5000,
      rentPaid: 5000,
      paidOnDate: "2026-05-01",
      billingCycle: "yearly",
    });
    // Should succeed — 'yearly' silently coerces to 'monthly'
    expect(result.ok).toBe(true);
    const tenant = result.body.tenant as { tenantId?: string; billingCycle?: string };
    expect(tenant.tenantId).toBeTruthy();
    expect(tenant.billingCycle).toBe("monthly");
    // Cleanup
    await cleanupTenant(page, tenant.tenantId!);
  });

  test("2.17 — valid tenant created (sanity check)", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants", {
      fullName: "Valid Sanity Tenant",
      phone: "9876543210",
      monthlyRent: 6000,
      rentPaid: 6000,
      paidOnDate: "2026-05-01",
      billingCycle: "monthly",
    });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(201);
    const tenant = result.body.tenant as { tenantId?: string };
    expect(tenant.tenantId).toBeTruthy();
    // Cleanup
    await cleanupTenant(page, tenant.tenantId!);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: Room Assignment Errors
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite 3: Room assignment errors", () => {
  test("3.1 — missing tenantId returns 400 with hostel/room message", async ({ page }) => {
    await loginAsDemoOwner(page);
    const { hostelId, room1Number } = await createTestHostel(page);
    const result = await apiPost(page, "/api/tenants/assign-room", {
      hostelId,
      roomNumber: room1Number,
      moveInDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "hostel");
  });

  test("3.2 — missing hostelId returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const { hostelId, room1Number } = await createTestHostel(page);
    const tenantId = await createTestTenant(page, hostelId);
    const result = await apiPost(page, "/api/tenants/assign-room", {
      tenantId,
      roomNumber: room1Number,
      moveInDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "hostel");
    await cleanupTenant(page, tenantId);
  });

  test("3.3 — missing roomNumber returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const { hostelId } = await createTestHostel(page);
    const tenantId = await createTestTenant(page, hostelId);
    const result = await apiPost(page, "/api/tenants/assign-room", {
      tenantId,
      hostelId,
      moveInDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "room");
    await cleanupTenant(page, tenantId);
  });

  test("3.4 — missing moveInDate returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const { hostelId, room1Number } = await createTestHostel(page);
    const tenantId = await createTestTenant(page, hostelId);
    const result = await apiPost(page, "/api/tenants/assign-room", {
      tenantId,
      hostelId,
      roomNumber: room1Number,
    });
    assertErrorResponse(result, 400, "date");
    await cleanupTenant(page, tenantId);
  });

  test("3.5 — non-existent tenantId returns error", async ({ page }) => {
    await loginAsDemoOwner(page);
    const { hostelId, room1Number } = await createTestHostel(page);
    const result = await apiPost(page, "/api/tenants/assign-room", {
      tenantId: "99999999",
      hostelId,
      roomNumber: room1Number,
      moveInDate: "2026-05-01",
    });
    // Demo store throws "Tenant not found." → route returns 400
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(typeof result.body.message).toBe("string");
    expect((result.body.message as string).toLowerCase()).toContain("tenant");
  });

  test("3.6 — non-existent hostelId returns error", async ({ page }) => {
    await loginAsDemoOwner(page);
    const { hostelId } = await createTestHostel(page);
    const tenantId = await createTestTenant(page, hostelId);
    const result = await apiPost(page, "/api/tenants/assign-room", {
      tenantId,
      hostelId: "nonexistent-hostel-xyz",
      roomNumber: "101",
      moveInDate: "2026-05-01",
    });
    // Store throws "Hostel room inventory not found." → 400
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(typeof result.body.message).toBe("string");
    await cleanupTenant(page, tenantId);
  });

  test("3.7 — non-existent roomNumber returns error", async ({ page }) => {
    await loginAsDemoOwner(page);
    const { hostelId } = await createTestHostel(page);
    const tenantId = await createTestTenant(page, hostelId);
    const result = await apiPost(page, "/api/tenants/assign-room", {
      tenantId,
      hostelId,
      roomNumber: "ROOM_DOES_NOT_EXIST_9999",
      moveInDate: "2026-05-01",
    });
    // Store throws "Selected room was not found." → 400
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect((result.body.message as string).toLowerCase()).toContain("room");
    await cleanupTenant(page, tenantId);
  });

  test("3.8 — double-bed booking: second tenant on same bed returns 400", async ({ page }) => {
    // DOCUMENTED BEHAVIOUR (see ERROR_CATALOG.md §3):
    // Demo mode: assignTenantRoom checks occupiedBedIds before assigning.
    // If bedId is already taken, it throws "Selected bed is not available." → 400.
    // This test creates 2 tenants and attempts to assign both to the SAME bedId.
    await loginAsDemoOwner(page);
    const { hostelId, room1Number, room1BedIds } = await createTestHostel(page);
    expect(room1BedIds.length).toBeGreaterThanOrEqual(1);
    const bedId = room1BedIds[0];

    // Tenant A — assign to room1, bed0
    const tenantAId = await createTestTenant(page, hostelId);
    const assignA = await apiPost(page, "/api/tenants/assign-room", {
      tenantId: tenantAId,
      hostelId,
      roomNumber: room1Number,
      moveInDate: "2026-05-01",
      bedId,
    });
    expect(assignA.ok).toBe(true);

    // Tenant B — try to assign to the SAME bedId
    const tenantBId = await createTestTenant(page, hostelId);
    const assignB = await apiPost(page, "/api/tenants/assign-room", {
      tenantId: tenantBId,
      hostelId,
      roomNumber: room1Number,
      moveInDate: "2026-05-01",
      bedId,
    });

    // The demo store PREVENTS double-booking at bed level → should be 400
    expect(assignB.ok).toBe(false);
    expect(assignB.status).toBe(400);
    expect(typeof assignB.body.message).toBe("string");
    expect((assignB.body.message as string).toLowerCase()).toContain("bed");

    // Cleanup
    await cleanupTenant(page, tenantAId);
    await cleanupTenant(page, tenantBId);
  });

  test("3.9 — assigning same tenant to its current room is idempotent (no error)", async ({ page }) => {
    // The store allows re-assigning to the same hostel/room/bed without error
    await loginAsDemoOwner(page);
    const { hostelId, room1Number, room1BedIds } = await createTestHostel(page);
    const bedId = room1BedIds[0];
    const tenantId = await createTestTenant(page, hostelId);

    const assign1 = await apiPost(page, "/api/tenants/assign-room", {
      tenantId,
      hostelId,
      roomNumber: room1Number,
      moveInDate: "2026-05-01",
      bedId,
    });
    expect(assign1.ok).toBe(true);

    const assign2 = await apiPost(page, "/api/tenants/assign-room", {
      tenantId,
      hostelId,
      roomNumber: room1Number,
      moveInDate: "2026-05-01",
      bedId,
    });
    // Same hostel/room/bed — no error (store equality check passes)
    expect(assign2.ok).toBe(true);

    await cleanupTenant(page, tenantId);
  });

  test("3.10 — reassigning to a DIFFERENT room without clearing first returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const { hostelId, room1Number, room2Number, room1BedIds, room2BedIds } = await createTestHostel(page);
    const tenantId = await createTestTenant(page, hostelId);

    const assign1 = await apiPost(page, "/api/tenants/assign-room", {
      tenantId,
      hostelId,
      roomNumber: room1Number,
      moveInDate: "2026-05-01",
      bedId: room1BedIds[0],
    });
    expect(assign1.ok).toBe(true);

    // Try to move to different room without removing first assignment
    const assign2 = await apiPost(page, "/api/tenants/assign-room", {
      tenantId,
      hostelId,
      roomNumber: room2Number,
      moveInDate: "2026-05-02",
      bedId: room2BedIds[0],
    });
    // Store throws "Tenant already has an active allocation. Clear the existing assignment before reassigning."
    expect(assign2.ok).toBe(false);
    expect(assign2.status).toBe(400);
    expect((assign2.body.message as string).toLowerCase()).toContain("allocation");

    await cleanupTenant(page, tenantId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4: Payment Errors (JSON mode)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite 4: Payment errors", () => {
  test("4.1 — missing tenantId returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/pay-rent", {
      amount: 5000,
      paidOnDate: "2026-05-01",
      paymentMethod: "cash",
    });
    assertErrorResponse(result, 400, "required");
  });

  test("4.2 — empty tenantId returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/pay-rent", {
      tenantId: "",
      amount: 5000,
      paidOnDate: "2026-05-01",
      paymentMethod: "cash",
    });
    assertErrorResponse(result, 400, "required");
  });

  test("4.3 — negative amount returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/pay-rent", {
      tenantId: "51201",
      amount: -500,
      paidOnDate: "2026-05-01",
      paymentMethod: "cash",
    });
    assertErrorResponse(result, 400, "required");
  });

  test("4.4 — amount > 10,000,000 returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/pay-rent", {
      tenantId: "51201",
      amount: 10_000_001,
      paidOnDate: "2026-05-01",
      paymentMethod: "cash",
    });
    assertErrorResponse(result, 400, "10,000,000");
  });

  test("4.5 — amount = 10,000,000 exactly is allowed (boundary)", async ({ page }) => {
    // The check is amount > 10_000_000, so exactly 10M should succeed
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/pay-rent", {
      tenantId: "51201",
      amount: 10_000_000,
      paidOnDate: "2026-05-01",
      paymentMethod: "cash",
    });
    // This may succeed or fail depending on tenant validity, but should not be 400 for amount
    if (!result.ok) {
      // If it fails, it should not be because of the amount limit
      expect(result.body.message).not.toContain("10,000,000");
    }
  });

  test("4.6 — amount = 0 is allowed (zero payment edge case)", async ({ page }) => {
    // nonnegative() accepts 0; route check is `amount < 0`
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/pay-rent", {
      tenantId: "51201",
      amount: 0,
      paidOnDate: "2026-05-01",
      paymentMethod: "cash",
    });
    // Should not fail for the amount itself
    if (!result.ok) {
      // If it fails, it's not because of amount=0
      expect((result.body.message as string).toLowerCase()).not.toContain("amount");
    }
  });

  test("4.7 — missing paidOnDate returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/pay-rent", {
      tenantId: "51201",
      amount: 5000,
      paymentMethod: "cash",
    });
    assertErrorResponse(result, 400, "required");
  });

  test("4.8 — invalid paidOnDate format (DD/MM/YYYY) returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/pay-rent", {
      tenantId: "51201",
      amount: 5000,
      paidOnDate: "01/05/2026",
      paymentMethod: "cash",
    });
    assertErrorResponse(result, 400, "YYYY-MM-DD");
  });

  test("4.9 — invalid paidOnDate format (MM-DD-YYYY) returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/pay-rent", {
      tenantId: "51201",
      amount: 5000,
      paidOnDate: "06-09-2026",
      paymentMethod: "cash",
    });
    assertErrorResponse(result, 400, "YYYY-MM-DD");
  });

  test("4.10 — missing paymentMethod returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/pay-rent", {
      tenantId: "51201",
      amount: 5000,
      paidOnDate: "2026-05-01",
    });
    assertErrorResponse(result, 400, "required");
  });

  test("4.11 — empty paymentMethod returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/pay-rent", {
      tenantId: "51201",
      amount: 5000,
      paidOnDate: "2026-05-01",
      paymentMethod: "",
    });
    assertErrorResponse(result, 400, "required");
  });

  test("4.12 — non-existent tenantId returns 400 from demo store", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/pay-rent", {
      tenantId: "00001",
      amount: 5000,
      paidOnDate: "2026-05-01",
      paymentMethod: "cash",
    });
    // Store throws "Tenant not found." → 400 (catch block in route)
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect((result.body.message as string).toLowerCase()).toContain("tenant");
  });

  test("4.13 — valid payment on demo tenant succeeds (sanity check)", async ({ page }) => {
    await loginAsDemoOwner(page);
    // 51201 is the known demo tenant Aarav Sharma
    const result = await apiPost(page, "/api/tenants/pay-rent", {
      tenantId: "51201",
      amount: 8500,
      paidOnDate: "2026-06-01",
      paymentMethod: "cash",
    });
    expect(result.ok).toBe(true);
    const tenant = result.body.tenant as { tenantId?: string };
    expect(tenant.tenantId).toBe("51201");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5: Payment Proof Upload Errors (multipart/form-data)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite 5: Payment proof upload errors", () => {
  // ── Synthetic file helpers (defined inside page.evaluate via data passing) ──
  //
  // TINY_PNG_BYTES: 68-byte valid PNG from test-data.ts
  // oversized: repeat TINY_PNG_BYTES to exceed 5 MB
  // fakePng: null bytes with image/png MIME
  // textFile: ASCII text with text/plain MIME

  test("5.1 — oversized proof file (>5MB) returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const csrf = await getCsrf(page);
    const tinyPngBase64 = TINY_PNG_BYTES.toString("base64");

    const result = await page.evaluate(
      async ({ csrf, tinyPngBase64 }) => {
        // Build ~5.1 MB by repeating the tiny PNG bytes
        const tinyBytes = Uint8Array.from(atob(tinyPngBase64), (c) => c.charCodeAt(0));
        const targetSize = 5 * 1024 * 1024 + 100; // 5 MB + 100 bytes
        const repeated = new Uint8Array(targetSize);
        for (let offset = 0; offset < targetSize; offset += tinyBytes.length) {
          repeated.set(tinyBytes.slice(0, Math.min(tinyBytes.length, targetSize - offset)), offset);
        }
        const oversizedFile = new File([repeated], "oversized.png", { type: "image/png" });

        const fd = new FormData();
        fd.append("tenantId", "51201");
        fd.append("amount", "5000");
        fd.append("paidOnDate", "2026-06-01");
        fd.append("paymentMethod", "cash");
        fd.append("proofImage", oversizedFile);

        const res = await fetch("/api/tenants/pay-rent", {
          method: "POST",
          headers: { "x-csrf-token": decodeURIComponent(csrf) },
          body: fd,
          credentials: "same-origin",
        });
        return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
      },
      { csrf, tinyPngBase64 },
    );

    assertErrorResponse(result, 400, "too large");
  });

  test("5.2 — text/plain MIME type returns 400 with invalid file type message", async ({ page }) => {
    await loginAsDemoOwner(page);
    const csrf = await getCsrf(page);

    const result = await page.evaluate(
      async ({ csrf }) => {
        const textContent = new TextEncoder().encode("Hello World - this is a text file");
        const textFile = new File([textContent], "receipt.txt", { type: "text/plain" });

        const fd = new FormData();
        fd.append("tenantId", "51201");
        fd.append("amount", "5000");
        fd.append("paidOnDate", "2026-06-01");
        fd.append("paymentMethod", "cash");
        fd.append("proofImage", textFile);

        const res = await fetch("/api/tenants/pay-rent", {
          method: "POST",
          headers: { "x-csrf-token": decodeURIComponent(csrf) },
          body: fd,
          credentials: "same-origin",
        });
        return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
      },
      { csrf },
    );

    assertErrorResponse(result, 400, "Invalid file type");
  });

  test("5.3 — fake PNG (null bytes, image/png MIME) returns 400 for magic bytes mismatch", async ({ page }) => {
    await loginAsDemoOwner(page);
    const csrf = await getCsrf(page);

    const result = await page.evaluate(
      async ({ csrf }) => {
        // 100 null bytes with image/png declared — magic bytes won't match PNG
        const fakeBytes = new Uint8Array(100); // all zeros
        const fakeFile = new File([fakeBytes], "fake.png", { type: "image/png" });

        const fd = new FormData();
        fd.append("tenantId", "51201");
        fd.append("amount", "5000");
        fd.append("paidOnDate", "2026-06-01");
        fd.append("paymentMethod", "cash");
        fd.append("proofImage", fakeFile);

        const res = await fetch("/api/tenants/pay-rent", {
          method: "POST",
          headers: { "x-csrf-token": decodeURIComponent(csrf) },
          body: fd,
          credentials: "same-origin",
        });
        return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
      },
      { csrf },
    );

    // detectMimeFromBytes returns null for null bytes → "File content does not match an allowed format."
    assertErrorResponse(result, 400);
    const msg = (result.body.message as string).toLowerCase();
    expect(msg.includes("content") || msg.includes("match") || msg.includes("format")).toBe(true);
  });

  test("5.4 — JPEG bytes declared as image/png returns 400 for extension mismatch", async ({ page }) => {
    await loginAsDemoOwner(page);
    const csrf = await getCsrf(page);

    const result = await page.evaluate(
      async ({ csrf }) => {
        // JPEG magic bytes: FF D8 FF E0 (JFIF JPEG header)
        const jpegMagic = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
        const mismatchFile = new File([jpegMagic], "tricky.png", { type: "image/png" });

        const fd = new FormData();
        fd.append("tenantId", "51201");
        fd.append("amount", "5000");
        fd.append("paidOnDate", "2026-06-01");
        fd.append("paymentMethod", "cash");
        fd.append("proofImage", mismatchFile);

        const res = await fetch("/api/tenants/pay-rent", {
          method: "POST",
          headers: { "x-csrf-token": decodeURIComponent(csrf) },
          body: fd,
          credentials: "same-origin",
        });
        return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
      },
      { csrf },
    );

    // detectMimeFromBytes returns "image/jpeg" but file.type is "image/png" → mismatch
    assertErrorResponse(result, 400);
    const msg = (result.body.message as string).toLowerCase();
    expect(msg.includes("extension") || msg.includes("match") || msg.includes("content")).toBe(true);
  });

  test("5.5 — valid tiny PNG proof uploads successfully (sanity check)", async ({ page }) => {
    await loginAsDemoOwner(page);
    const csrf = await getCsrf(page);
    const tinyPngBase64 = TINY_PNG_BYTES.toString("base64");

    const result = await page.evaluate(
      async ({ csrf, tinyPngBase64 }) => {
        const bytes = Uint8Array.from(atob(tinyPngBase64), (c) => c.charCodeAt(0));
        const validFile = new File([bytes], "proof.png", { type: "image/png" });

        const fd = new FormData();
        fd.append("tenantId", "51201");
        fd.append("amount", "5000");
        fd.append("paidOnDate", "2026-06-01");
        fd.append("paymentMethod", "cash");
        fd.append("proofImage", validFile);

        const res = await fetch("/api/tenants/pay-rent", {
          method: "POST",
          headers: { "x-csrf-token": decodeURIComponent(csrf) },
          body: fd,
          credentials: "same-origin",
        });
        return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
      },
      { csrf, tinyPngBase64 },
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  test("5.6 — application/pdf with PDF magic bytes succeeds (allowed type)", async ({ page }) => {
    await loginAsDemoOwner(page);
    const csrf = await getCsrf(page);

    const result = await page.evaluate(
      async ({ csrf }) => {
        // Minimal PDF magic bytes: %PDF
        const pdfMagic = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
        const pdfFile = new File([pdfMagic], "receipt.pdf", { type: "application/pdf" });

        const fd = new FormData();
        fd.append("tenantId", "51201");
        fd.append("amount", "5000");
        fd.append("paidOnDate", "2026-06-02");
        fd.append("paymentMethod", "online");
        fd.append("proofImage", pdfFile);

        const res = await fetch("/api/tenants/pay-rent", {
          method: "POST",
          headers: { "x-csrf-token": decodeURIComponent(csrf) },
          body: fd,
          credentials: "same-origin",
        });
        return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
      },
      { csrf },
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 6: Vacate / Remove Errors
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite 6: Vacate/Remove tenant errors", () => {
  test("6.1 — missing tenantId returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/remove", {
      refundAmount: 0,
    });
    assertErrorResponse(result, 400, "Tenant ID is required");
  });

  test("6.2 — empty tenantId string returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/remove", {
      tenantId: "",
      refundAmount: 0,
    });
    assertErrorResponse(result, 400, "Tenant ID is required");
  });

  test("6.3 — negative refundAmount returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/remove", {
      tenantId: "51201",
      refundAmount: -500,
    });
    assertErrorResponse(result, 400, "valid amount");
  });

  test("6.4 — refundAmount > 10,000,000 returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/remove", {
      tenantId: "51201",
      refundAmount: 10_000_001,
    });
    assertErrorResponse(result, 400, "valid amount");
  });

  test("6.5 — non-existent tenantId returns 400 from demo store", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiPost(page, "/api/tenants/remove", {
      tenantId: "00000",
      refundAmount: 0,
    });
    // removeTenantRecord throws "Tenant not found." → catch block → 400
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect((result.body.message as string).toLowerCase()).toContain("tenant");
  });

  test("6.6 — double-vacate same tenant returns 400 on second call", async ({ page }) => {
    await loginAsDemoOwner(page);
    // Create and then vacate a tenant
    const tenantId = await createTestTenant(page, "owner-hostel-aurora");

    const first = await apiPost(page, "/api/tenants/remove", {
      tenantId,
      refundAmount: 0,
      settlementDate: "2026-06-01",
    });
    expect(first.ok).toBe(true);

    // Second vacate of the same already-removed tenantId
    const second = await apiPost(page, "/api/tenants/remove", {
      tenantId,
      refundAmount: 0,
      settlementDate: "2026-06-01",
    });
    // The record is already gone → "Tenant not found." → 400
    expect(second.ok).toBe(false);
    expect(second.status).toBe(400);
    expect((second.body.message as string).toLowerCase()).toContain("tenant");
  });

  test("6.7 — valid vacate succeeds and returns tenant in response", async ({ page }) => {
    await loginAsDemoOwner(page);
    const tenantId = await createTestTenant(page, "owner-hostel-aurora");

    const result = await apiPost(page, "/api/tenants/remove", {
      tenantId,
      advanceRefundEligible: true,
      refundAdvance: true,
      refundAmount: 1000,
      settlementNote: "E2E test vacate",
      settlementDate: "2026-06-01",
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    const tenant = result.body.tenant as { tenantId?: string };
    expect(tenant).toBeTruthy();
  });

  test("6.8 — invalid JSON body returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);
    const csrf = await getCsrf(page);
    const result = await page.evaluate(
      async ({ csrf }) => {
        const res = await fetch("/api/tenants/remove", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": decodeURIComponent(csrf),
          },
          body: "{ broken json",
          credentials: "same-origin",
        });
        return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
      },
      { csrf },
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 7: Auth / Unauthenticated Errors
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite 7: Auth errors — unauthenticated requests", () => {
  // All auth tests use `credentials: "omit"` to exclude the session cookie.
  // In PLAYWRIGHT_TEST=true mode, requireOwnerSession returns a demo session
  // when the session cookie IS present. By omitting credentials, we bypass that.

  test("7.1 — GET /api/tenants without session returns 401", async ({ page }) => {
    await page.goto("/owner/login");
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/tenants", { credentials: "omit" });
      return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
    });
    assertErrorResponse(result, 401, "Unauthorized");
  });

  test("7.2 — POST /api/tenants without session returns 401", async ({ page }) => {
    await page.goto("/owner/login");
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: "Unauth Tenant" }),
        credentials: "omit",
      });
      return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
    });
    assertErrorResponse(result, 401, "Unauthorized");
  });

  test("7.3 — POST /api/tenants/remove without session returns 401", async ({ page }) => {
    await page.goto("/owner/login");
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/tenants/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: "51201" }),
        credentials: "omit",
      });
      return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
    });
    assertErrorResponse(result, 401, "Unauthorized");
  });

  test("7.4 — POST /api/tenants/assign-room without session returns 401", async ({ page }) => {
    await page.goto("/owner/login");
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/tenants/assign-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: "51201", hostelId: "x", roomNumber: "101", moveInDate: "2026-05-01" }),
        credentials: "omit",
      });
      return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
    });
    assertErrorResponse(result, 401, "Unauthorized");
  });

  test("7.5 — POST /api/tenants/pay-rent without session returns 401", async ({ page }) => {
    await page.goto("/owner/login");
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/tenants/pay-rent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: "51201", amount: 5000, paidOnDate: "2026-05-01", paymentMethod: "cash" }),
        credentials: "omit",
      });
      return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
    });
    assertErrorResponse(result, 401, "Unauthorized");
  });

  test("7.6 — GET /api/owner-hostels without session returns 401", async ({ page }) => {
    await page.goto("/owner/login");
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/owner-hostels", { credentials: "omit" });
      return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
    });
    assertErrorResponse(result, 401, "Unauthorized");
  });

  test("7.7 — POST /api/owner-hostels without session returns 401", async ({ page }) => {
    await page.goto("/owner/login");
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/owner-hostels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostelName: "Test", address: "Test", rooms: [{ roomNumber: "101", bedCount: 2 }] }),
        credentials: "omit",
      });
      return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
    });
    assertErrorResponse(result, 401, "Unauthorized");
  });

  test("7.8 — GET /api/owner-hostels/[id] without session returns 401", async ({ page }) => {
    await page.goto("/owner/login");
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/owner-hostels/owner-hostel-aurora", { credentials: "omit" });
      return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
    });
    assertErrorResponse(result, 401, "Unauthorized");
  });

  test("7.9 — PUT /api/owner-hostels/[id] without session returns 401", async ({ page }) => {
    await page.goto("/owner/login");
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/owner-hostels/owner-hostel-aurora", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostelName: "Updated", address: "Addr", rooms: [{ roomNumber: "101", bedCount: 2 }] }),
        credentials: "omit",
      });
      return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
    });
    assertErrorResponse(result, 401, "Unauthorized");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 8: Multi-hostel Bed Capacity Scenarios
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite 8: Multi-hostel bed capacity scenarios", () => {
  test("8.1 — fill all beds in one hostel, then assign to a different hostel succeeds", async ({ page }) => {
    await loginAsDemoOwner(page);

    // Create hostel A with 2 rooms × 2 beds = 4 beds total
    const seedA = `A${String(Date.now()).slice(-5)}`;
    const hostelAResult = await apiPost(page, "/api/owner-hostels", {
      hostelName: `Cap Test Hostel A ${seedA}`,
      address: `${seedA} Capacity Road`,
      type: "PG",
      rooms: [
        { roomNumber: `${seedA}R1`, bedCount: 2 },
        { roomNumber: `${seedA}R2`, bedCount: 2 },
      ],
    });
    expect(hostelAResult.ok).toBe(true);
    const hostelA = hostelAResult.body.hostel as {
      id: string;
      rooms: Array<{
        roomNumber: string;
        beds?: Array<{ id: string }>;
      }>;
    };
    expect(hostelA.id).toBeTruthy();

    // Create hostel B with 1 room × 2 beds = 2 beds total
    const seedB = `B${String(Date.now()).slice(-5)}`;
    const hostelBResult = await apiPost(page, "/api/owner-hostels", {
      hostelName: `Cap Test Hostel B ${seedB}`,
      address: `${seedB} Capacity Road`,
      type: "PG",
      rooms: [{ roomNumber: `${seedB}R1`, bedCount: 2 }],
    });
    expect(hostelBResult.ok).toBe(true);
    const hostelB = hostelBResult.body.hostel as {
      id: string;
      rooms: Array<{
        roomNumber: string;
        beds?: Array<{ id: string }>;
      }>;
    };
    expect(hostelB.id).toBeTruthy();

    // Collect all beds in hostel A
    const hostelABeds: Array<{ roomNumber: string; bedId: string }> = [];
    for (const room of hostelA.rooms) {
      for (const bed of room.beds ?? []) {
        hostelABeds.push({ roomNumber: room.roomNumber, bedId: bed.id });
      }
    }
    expect(hostelABeds.length).toBe(4); // 2 rooms × 2 beds

    // Fill all 4 beds in hostel A
    const hostelATenantIds: string[] = [];
    for (const slot of hostelABeds) {
      const tenantId = await createTestTenant(page, hostelA.id);
      const assignResult = await apiPost(page, "/api/tenants/assign-room", {
        tenantId,
        hostelId: hostelA.id,
        roomNumber: slot.roomNumber,
        moveInDate: "2026-05-01",
        bedId: slot.bedId,
      });
      expect(
        assignResult.ok,
        `Failed to assign tenant to bed ${slot.bedId}: ${JSON.stringify(assignResult.body)}`,
      ).toBe(true);
      hostelATenantIds.push(tenantId);
    }

    // Verify hostel A is full — all beds should show as occupied
    const hostelAGet = await apiGet(page, `/api/owner-hostels/${hostelA.id}`);
    expect(hostelAGet.ok).toBe(true);
    const hostelAData = hostelAGet.body.hostel as {
      rooms: Array<{
        roomNumber: string;
        beds?: Array<{ id: string; occupied: boolean }>;
      }>;
    };
    // In the GET response for owner-hostels/[id], demo mode filters OUT occupied beds
    // (route returns only unoccupied beds in .data.rooms). So all beds should be filtered away.
    const totalBedsInResponse = hostelAData.rooms.reduce(
      (sum, room) => sum + (room.beds?.length ?? 0),
      0,
    );
    // All 4 beds are occupied → no free beds remain in the response
    expect(totalBedsInResponse).toBe(0);

    // Assign one tenant to hostel B — should succeed (separate hostel)
    const hostelBRoom = hostelB.rooms[0];
    const hostelBBedId = hostelBRoom.beds?.[0]?.id;
    expect(hostelBBedId).toBeTruthy();
    const hostelBTenantId = await createTestTenant(page, hostelB.id);
    const hostelBAssign = await apiPost(page, "/api/tenants/assign-room", {
      tenantId: hostelBTenantId,
      hostelId: hostelB.id,
      roomNumber: hostelBRoom.roomNumber,
      moveInDate: "2026-05-01",
      bedId: hostelBBedId,
    });
    expect(hostelBAssign.ok).toBe(true);

    // Try to assign a 5th tenant to hostel A (all beds full) — should fail
    const overflow = await createTestTenant(page, hostelA.id);
    const overflowRoom = hostelA.rooms[0];
    const overflowBed = overflowRoom.beds?.[0]?.id;
    const overflowAssign = await apiPost(page, "/api/tenants/assign-room", {
      tenantId: overflow,
      hostelId: hostelA.id,
      roomNumber: overflowRoom.roomNumber,
      moveInDate: "2026-05-01",
      bedId: overflowBed,
    });
    expect(overflowAssign.ok).toBe(false);
    expect(overflowAssign.status).toBe(400);
    expect((overflowAssign.body.message as string).toLowerCase()).toContain("bed");

    // Cleanup all created tenants
    for (const id of hostelATenantIds) {
      await cleanupTenant(page, id);
    }
    await cleanupTenant(page, hostelBTenantId);
    await cleanupTenant(page, overflow);
  });

  test("8.2 — filling one room does not block beds in another room of same hostel", async ({ page }) => {
    await loginAsDemoOwner(page);

    const seed = `C${String(Date.now()).slice(-5)}`;
    const hostelResult = await apiPost(page, "/api/owner-hostels", {
      hostelName: `Two Room Hostel ${seed}`,
      address: `${seed} Two Room Road`,
      type: "PG",
      rooms: [
        { roomNumber: `${seed}R1`, bedCount: 2 },
        { roomNumber: `${seed}R2`, bedCount: 2 },
      ],
    });
    expect(hostelResult.ok).toBe(true);
    const hostel = hostelResult.body.hostel as {
      id: string;
      rooms: Array<{
        roomNumber: string;
        beds?: Array<{ id: string }>;
      }>;
    };

    const room1 = hostel.rooms[0];
    const room2 = hostel.rooms[1];

    // Fill all beds in room 1
    const room1TenantIds: string[] = [];
    for (const bed of room1.beds ?? []) {
      const tid = await createTestTenant(page, hostel.id);
      const r = await apiPost(page, "/api/tenants/assign-room", {
        tenantId: tid,
        hostelId: hostel.id,
        roomNumber: room1.roomNumber,
        moveInDate: "2026-05-01",
        bedId: bed.id,
      });
      expect(r.ok).toBe(true);
      room1TenantIds.push(tid);
    }

    // Room 2 should still accept tenants
    const room2Tenant = await createTestTenant(page, hostel.id);
    const room2Assign = await apiPost(page, "/api/tenants/assign-room", {
      tenantId: room2Tenant,
      hostelId: hostel.id,
      roomNumber: room2.roomNumber,
      moveInDate: "2026-05-01",
      bedId: room2.beds?.[0]?.id,
    });
    expect(room2Assign.ok).toBe(true);

    // Room 1 overflow should still fail
    const overflow = await createTestTenant(page, hostel.id);
    const overflowAssign = await apiPost(page, "/api/tenants/assign-room", {
      tenantId: overflow,
      hostelId: hostel.id,
      roomNumber: room1.roomNumber,
      moveInDate: "2026-05-01",
      bedId: room1.beds?.[0]?.id,
    });
    expect(overflowAssign.ok).toBe(false);
    expect(overflowAssign.status).toBe(400);

    // Cleanup
    for (const id of room1TenantIds) await cleanupTenant(page, id);
    await cleanupTenant(page, room2Tenant);
    await cleanupTenant(page, overflow);
  });

  test("8.3 — hostel GET after filling all beds shows zero available beds", async ({ page }) => {
    await loginAsDemoOwner(page);

    const seed = `D${String(Date.now()).slice(-5)}`;
    const hostelResult = await apiPost(page, "/api/owner-hostels", {
      hostelName: `Full Hostel ${seed}`,
      address: `${seed} Full St`,
      type: "PG",
      rooms: [{ roomNumber: `${seed}R1`, bedCount: 2 }],
    });
    expect(hostelResult.ok).toBe(true);
    const hostel = hostelResult.body.hostel as {
      id: string;
      rooms: Array<{ roomNumber: string; beds?: Array<{ id: string }> }>;
    };

    const room = hostel.rooms[0];
    const tenantIds: string[] = [];

    for (const bed of room.beds ?? []) {
      const tid = await createTestTenant(page, hostel.id);
      const r = await apiPost(page, "/api/tenants/assign-room", {
        tenantId: tid,
        hostelId: hostel.id,
        roomNumber: room.roomNumber,
        moveInDate: "2026-05-01",
        bedId: bed.id,
      });
      expect(r.ok).toBe(true);
      tenantIds.push(tid);
    }

    // GET the hostel — verify no available beds are returned
    const getResult = await apiGet(page, `/api/owner-hostels/${hostel.id}`);
    expect(getResult.ok).toBe(true);
    const hostelData = getResult.body.hostel as {
      rooms: Array<{ roomNumber: string; beds?: Array<unknown> }>;
    };
    const availableBeds = hostelData.rooms.reduce(
      (sum, r) => sum + (r.beds?.length ?? 0),
      0,
    );
    // All beds occupied → filter removes them from /api/owner-hostels/[id] response
    expect(availableBeds).toBe(0);

    for (const id of tenantIds) await cleanupTenant(page, id);
  });

  test("8.4 — idempotency key prevents duplicate tenant creation", async ({ page }) => {
    await loginAsDemoOwner(page);
    const csrf = await getCsrf(page);
    const idempotencyKey = `idem-test-${Date.now()}`;

    // First request with idempotency key
    const first = await page.evaluate(
      async ({ csrf, idempotencyKey }) => {
        const res = await fetch("/api/tenants", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": decodeURIComponent(csrf),
            "X-Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            fullName: "Idem Test Tenant",
            phone: "9988776655",
            monthlyRent: 5000,
            rentPaid: 5000,
            paidOnDate: "2026-05-01",
          }),
          credentials: "same-origin",
        });
        return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
      },
      { csrf, idempotencyKey },
    );

    expect(first.ok).toBe(true);
    expect(first.status).toBe(201);
    const tenantId = (first.body.tenant as { tenantId?: string }).tenantId;
    expect(tenantId).toBeTruthy();

    // Second request with same key and same payload — should return cached 201
    const second = await page.evaluate(
      async ({ csrf, idempotencyKey }) => {
        const res = await fetch("/api/tenants", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": decodeURIComponent(csrf),
            "X-Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            fullName: "Idem Test Tenant",
            phone: "9988776655",
            monthlyRent: 5000,
            rentPaid: 5000,
            paidOnDate: "2026-05-01",
          }),
          credentials: "same-origin",
        });
        return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
      },
      { csrf, idempotencyKey },
    );

    // Should replay the same response (201) without creating a duplicate
    expect(second.ok).toBe(true);
    expect(second.status).toBe(201);
    const replayedTenantId = (second.body.tenant as { tenantId?: string }).tenantId;
    expect(replayedTenantId).toBe(tenantId);

    await cleanupTenant(page, tenantId!);
  });

  test("8.5 — idempotency key reused with different payload returns 409", async ({ page }) => {
    await loginAsDemoOwner(page);
    const csrf = await getCsrf(page);
    const idempotencyKey = `idem-conflict-${Date.now()}`;

    const first = await page.evaluate(
      async ({ csrf, idempotencyKey }) => {
        const res = await fetch("/api/tenants", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": decodeURIComponent(csrf),
            "X-Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            fullName: "Idem Conflict A",
            phone: "9977665544",
            monthlyRent: 5000,
            rentPaid: 5000,
            paidOnDate: "2026-05-01",
          }),
          credentials: "same-origin",
        });
        return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
      },
      { csrf, idempotencyKey },
    );
    expect(first.ok).toBe(true);
    const tenantId = (first.body.tenant as { tenantId?: string }).tenantId!;

    // Same key, DIFFERENT payload (different fullName)
    const conflict = await page.evaluate(
      async ({ csrf, idempotencyKey }) => {
        const res = await fetch("/api/tenants", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": decodeURIComponent(csrf),
            "X-Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            fullName: "Idem Conflict B — DIFFERENT",
            phone: "9977665544",
            monthlyRent: 6000,
            rentPaid: 6000,
            paidOnDate: "2026-05-02",
          }),
          credentials: "same-origin",
        });
        return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
      },
      { csrf, idempotencyKey },
    );

    assertErrorResponse(conflict, 409, "Idempotency key reused");

    await cleanupTenant(page, tenantId);
  });
});
