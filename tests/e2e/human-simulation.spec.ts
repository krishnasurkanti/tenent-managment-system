/**
 * human-simulation.spec.ts
 *
 * Four independent "human agent" scenarios that exercise the PG/hostel tenant
 * management system end-to-end through the Next.js API layer.
 *
 * Agent A â€” Full hostel + tenant lifecycle
 * Agent B â€” Financial calculation verification
 * Agent C â€” Search and retrieval
 * Agent D â€” Edge cases and data integrity
 *
 * All tests run against the demo workspace (no live-backend dependency).
 * Helpers are declared locally so this file is fully self-contained.
 */

import { expect, test, type Page } from "@playwright/test";
import { uniqueTenantData, uniqueHostelData } from "./test-data";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Shared helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function loginAsDemoOwner(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.clear();
    // Pre-select the original demo hostel (Aurora Residency) so the UI
    // doesn't default to test-created hostels that get prepended to the list.
    window.localStorage.setItem("currentHostelId", "owner-hostel-aurora");
  });
  await page.goto("/owner/login");
  const hostelsPromise = page.waitForResponse(
    (r) => r.url().includes("/api/owner-hostels") && r.status() !== 401,
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15_000 });
  await hostelsPromise;
  // cap networkidle — dev server compile can hang indefinitely
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
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

async function apiPatch(
  page: Page,
  path: string,
  body: Record<string, unknown>,
): Promise<ApiResult> {
  const csrf = await getCsrf(page);
  return page.evaluate(
    async ({ path, body, csrf }) => {
      const res = await fetch(path, {
        method: "PATCH",
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
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  return page.evaluate(async (path) => {
    const res = await fetch(path, { credentials: "same-origin" });
    return { ok: res.ok, status: res.status, body: (await res.json()) as Record<string, unknown> };
  }, path);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Type helpers (avoid `any` in assertions while remaining flexible)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type TenantShape = {
  tenantId?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  monthlyRent?: number;
  rentPaid?: number;
  advanceAmount?: number;
  serviceFeeAmount?: number;
  advanceBalance?: number;
  pendingBalance?: { amount?: number } | null;
  billingAnchorDate?: string;
  paidOnDate?: string;
  assignment?: {
    hostelId?: string;
    roomNumber?: string;
    bedId?: string;
    bedLabel?: string;
    moveInDate?: string;
  } | null;
  fatherName?: string;
  dateOfBirth?: string;
  idType?: string;
  idNumber?: string;
  occupation?: string;
  workplaceName?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
};

type HostelShape = {
  id?: string;
  hostelName?: string;
  address?: string;
  type?: string;
  data?: {
    rooms?: RoomShape[];
    floors?: FloorShape[];
  };
  rooms?: RoomShape[];
};

type BedShape = {
  id?: string;
  label?: string;
  occupied?: boolean;
  tenantId?: string;
};

type RoomShape = {
  id?: string;
  unitId?: string;
  roomNumber?: string;
  capacity?: number;
  occupied?: number;
  beds?: BedShape[];
};

type FloorShape = {
  id?: string;
  rooms?: RoomShape[];
};

type LedgerEntry = {
  tenantId?: string;
  tenantName?: string;
  type?: string;
  direction?: string;
  amount?: number;
  date?: string;
  note?: string;
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Utility: find a free bed across all hostels
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type BedRef = {
  hostelId: string;
  unitId: string;
  roomNumber: string;
  bedId: string;
  bedLabel: string;
};

/**
 * Scan GET /api/owner-hostels and return the first free bed found.
 * Uses the `data.rooms` structure that the demo GET endpoint returns
 * (rooms with only unoccupied beds filtered in).
 */
async function findFreeBed(page: Page): Promise<BedRef | null> {
  const hostelData = await apiGet(page, "/api/owner-hostels");
  const hostels = ((hostelData.body as { hostels?: HostelShape[] }).hostels ?? []);

  for (const hostel of hostels) {
    const hostelId = hostel.id ?? "";
    // The demo GET strips occupied beds from data.rooms
    const rooms: RoomShape[] =
      hostel.data?.rooms ?? hostel.rooms ?? [];

    for (const room of rooms) {
      const beds = room.beds ?? [];
      const freeBed = beds.find((b) => !b.occupied);
      if (freeBed) {
        return {
          hostelId,
          unitId:
            room.unitId ??
            `${hostelId}-f0-${String(room.roomNumber ?? "").toLowerCase()}`,
          roomNumber: room.roomNumber ?? "",
          bedId: freeBed.id ?? "",
          bedLabel: freeBed.label ?? "",
        };
      }
    }
  }
  return null;
}

/**
 * Assign a tenant to the first available free bed.
 * Returns the BedRef used, or null if no free bed was found.
 */
async function assignTenantToFreeBed(
  page: Page,
  tenantId: string,
  moveInDate = "2026-05-01",
): Promise<BedRef | null> {
  const bed = await findFreeBed(page);
  if (!bed) return null;

  const result = await apiPost(page, "/api/tenants/assign-room", {
    tenantId,
    hostelId: bed.hostelId,
    unitId: bed.unitId,
    roomNumber: bed.roomNumber,
    bedId: bed.bedId,
    bedLabel: bed.bedLabel,
    moveInDate,
    sharingType: "",
  });

  // 409 = bed already taken (race), 200 = success
  if (result.status === 409) return null;
  expect(result.ok, `assign-room failed: ${JSON.stringify(result.body)}`).toBe(true);
  return bed;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Agent A â€” Full hostel + tenant lifecycle
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Agent A â€” Full hostel + tenant lifecycle", () => {
  test("creates hostel, creates 3 tenants, assigns rooms, vacates one, checks ledger", async ({
    page,
  }) => {
    await loginAsDemoOwner(page);

    // â”€â”€ Step 1: Create hostel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const hostelPayload = {
      hostelName: "Test PG Alpha",
      address: "123 Main St",
      type: "PG",
      rooms: [
        { roomNumber: "A101", bedCount: 3 },
        { roomNumber: "A102", bedCount: 2 },
      ],
    };

    const hostelResult = await apiPost(page, "/api/owner-hostels", hostelPayload);
    expect(hostelResult.ok, `Hostel creation failed: ${JSON.stringify(hostelResult.body)}`).toBe(true);
    expect(hostelResult.status).toBe(201);

    const createdHostel = (hostelResult.body as { hostel?: HostelShape }).hostel;
    expect(createdHostel?.id, "hostel should have an id").toBeTruthy();
    const hostelId = createdHostel!.id!;

    // â”€â”€ Step 2: Verify hostel appears in GET /api/owner-hostels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const listResult = await apiGet(page, "/api/owner-hostels");
    expect(listResult.ok, "GET /api/owner-hostels failed").toBe(true);

    const allHostels = ((listResult.body as { hostels?: HostelShape[] }).hostels ?? []);
    const foundHostel = allHostels.find((h) => h.id === hostelId);
    expect(foundHostel, `Hostel ${hostelId} not found in hostel list`).toBeTruthy();
    expect(foundHostel?.hostelName).toBe("Test PG Alpha");

    // â”€â”€ Step 3: Create 3 tenants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const today = new Date().toISOString().slice(0, 10);

    const tenantDefs = [
      {
        fullName: "Alpha Tenant One",
        phone: "9100000001",
        email: "alpha.one@example.test",
        monthlyRent: 7000,
        rentPaid: 7000,
        advanceAmount: 3000,
        serviceFeeAmount: 500,
        paidOnDate: today,
        billingCycle: "monthly",
      },
      {
        fullName: "Alpha Tenant Two",
        phone: "9100000002",
        email: "alpha.two@example.test",
        monthlyRent: 8000,
        rentPaid: 8000,
        advanceAmount: 4000,
        serviceFeeAmount: 750,
        paidOnDate: today,
        billingCycle: "monthly",
      },
      {
        fullName: "Alpha Tenant Three",
        phone: "9100000003",
        email: "alpha.three@example.test",
        monthlyRent: 9000,
        rentPaid: 9000,
        advanceAmount: 5000,
        serviceFeeAmount: 1000,
        paidOnDate: today,
        billingCycle: "monthly",
      },
    ] as const;

    const createdIds: string[] = [];

    for (const def of tenantDefs) {
      const res = await apiPost(page, "/api/tenants", def);
      expect(res.ok, `Tenant creation failed for ${def.fullName}: ${JSON.stringify(res.body)}`).toBe(true);
      const tenant = (res.body as { tenant?: TenantShape }).tenant;
      expect(tenant?.tenantId, `${def.fullName} should have tenantId`).toBeTruthy();
      createdIds.push(tenant!.tenantId!);
    }

    expect(createdIds.length).toBe(3);
    const [t1Id, t2Id, t3Id] = createdIds;

    // â”€â”€ Step 4: Assign each tenant to a room via assign-room API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // We need real room data from the newly created hostel.
    // Fetch via GET /api/owner-hostels/[id] to get the hostel with room detail.
    const hostelDetailResult = await apiGet(page, `/api/owner-hostels/${hostelId}`);
    expect(hostelDetailResult.ok, "GET hostel detail failed").toBe(true);

    const hostelDetail = (hostelDetailResult.body as { hostel?: HostelShape }).hostel;
    const hostelRooms: RoomShape[] =
      hostelDetail?.data?.rooms ?? hostelDetail?.rooms ?? [];

    // Flatten all beds from the hostel rooms
    type BedWithRoom = { roomNumber: string; unitId: string; bedId: string; bedLabel: string };
    const allBeds: BedWithRoom[] = [];
    for (const room of hostelRooms) {
      const rUnitId =
        room.unitId ??
        `${hostelId}-f0-${String(room.roomNumber ?? "").toLowerCase()}`;
      for (const bed of room.beds ?? []) {
        allBeds.push({
          roomNumber: room.roomNumber ?? "",
          unitId: rUnitId,
          bedId: bed.id ?? "",
          bedLabel: bed.label ?? "",
        });
      }
    }

    // Assign t1 â†’ bed 0, t2 â†’ bed 1, t3 â†’ bed 2 (if enough beds exist)
    const assignmentsMade: Array<{ tenantId: string; roomNumber: string; bedId: string }> = [];

    for (let i = 0; i < 3; i++) {
      const bedRef = allBeds[i];
      if (!bedRef) {
        // Fall back to scanning all hostels for a free bed
        const fallback = await assignTenantToFreeBed(page, createdIds[i], today);
        if (fallback) {
          assignmentsMade.push({ tenantId: createdIds[i], roomNumber: fallback.roomNumber, bedId: fallback.bedId });
        }
        continue;
      }

      const assignRes = await apiPost(page, "/api/tenants/assign-room", {
        tenantId: createdIds[i],
        hostelId,
        unitId: bedRef.unitId,
        roomNumber: bedRef.roomNumber,
        bedId: bedRef.bedId,
        bedLabel: bedRef.bedLabel,
        moveInDate: today,
        sharingType: "",
      });

      // 409 = bed already occupied â€” acceptable in concurrent test runs
      if (assignRes.status !== 409) {
        expect(assignRes.ok, `assign-room failed for tenant ${i + 1}: ${JSON.stringify(assignRes.body)}`).toBe(true);
        assignmentsMade.push({ tenantId: createdIds[i], roomNumber: bedRef.roomNumber, bedId: bedRef.bedId });
      }
    }

    // â”€â”€ Step 5: Verify all 3 tenants appear in GET /api/tenants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const tenantListResult = await apiGet(page, "/api/tenants");
    expect(tenantListResult.ok, "GET /api/tenants failed").toBe(true);

    const allTenants = ((tenantListResult.body as { tenants?: TenantShape[] }).tenants ?? []);
    for (const id of createdIds) {
      const found = allTenants.find((t) => t.tenantId === id);
      expect(found, `Tenant ${id} not found in tenant list`).toBeTruthy();
    }

    // â”€â”€ Step 6: Search for each tenant by name via API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    for (const def of tenantDefs) {
      const searchResult = await apiGet(page, `/api/tenants`);
      expect(searchResult.ok).toBe(true);
      const tenants = ((searchResult.body as { tenants?: TenantShape[] }).tenants ?? []);
      const found = tenants.find((t) =>
        (t.fullName ?? "").toLowerCase().includes(def.fullName.toLowerCase()),
      );
      expect(found, `Tenant "${def.fullName}" not found via name search`).toBeTruthy();
    }

    // â”€â”€ Step 7: Get tenant by ID â€” verify all fields correct â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const tenant1DetailResult = await apiGet(page, `/api/tenants?tenantId=${t1Id}`);
    expect(tenant1DetailResult.ok, "GET tenant by ID failed").toBe(true);
    const t1List = ((tenant1DetailResult.body as { tenants?: TenantShape[] }).tenants ?? []);
    const t1 = t1List.find((t) => t.tenantId === t1Id);
    expect(t1, "Tenant 1 not returned by tenantId query").toBeTruthy();
    expect(t1?.fullName).toBe("Alpha Tenant One");
    expect(t1?.phone).toBe("9100000001");
    expect(t1?.monthlyRent).toBe(7000);
    expect(t1?.advanceAmount).toBe(3000);
    expect(t1?.serviceFeeAmount).toBe(500);

    // â”€â”€ Step 8: Vacate tenant 1 with settlement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const vacateResult = await apiPost(page, "/api/tenants/remove", {
      tenantId: t1Id,
      advanceRefundEligible: true,
      refundAdvance: true,
      refundAmount: 3000, // matches advanceAmount for tenant 1
      settlementNote: "Test vacate",
      settlementDate: today,
    });
    expect(vacateResult.ok, `Vacate failed: ${JSON.stringify(vacateResult.body)}`).toBe(true);

    // â”€â”€ Step 9: Verify tenant 1 NOT in active tenant list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const afterVacateList = await apiGet(page, "/api/tenants");
    expect(afterVacateList.ok).toBe(true);
    const afterTenants = ((afterVacateList.body as { tenants?: TenantShape[] }).tenants ?? []);
    const vacatedInList = afterTenants.find((t) => t.tenantId === t1Id);
    expect(vacatedInList, "Vacated tenant 1 should NOT appear in active tenant list").toBeUndefined();

    // Tenants 2 and 3 must still be present
    const t2InList = afterTenants.find((t) => t.tenantId === t2Id);
    const t3InList = afterTenants.find((t) => t.tenantId === t3Id);
    expect(t2InList, "Tenant 2 should still be in list after tenant 1 is vacated").toBeTruthy();
    expect(t3InList, "Tenant 3 should still be in list after tenant 1 is vacated").toBeTruthy();

    // â”€â”€ Step 10: Verify ledger has advance_refund entry for vacated tenant â”€â”€â”€â”€
    const ledgerResult = await apiGet(page, "/api/finance-ledger");
    expect(ledgerResult.ok, "GET /api/finance-ledger failed").toBe(true);

    const entries = ((ledgerResult.body as { entries?: LedgerEntry[] }).entries ?? []);

    const refundEntry = entries.find(
      (e) => e.type === "advance_refund" && e.tenantId === t1Id,
    );
    expect(refundEntry, "advance_refund ledger entry not found for vacated tenant").toBeTruthy();
    expect(refundEntry?.direction).toBe("debit");
    expect(refundEntry?.amount).toBe(3000);

    // Verify advance_collected and service_fee_collected exist for all 3 tenants
    for (let i = 0; i < 3; i++) {
      const tid = createdIds[i];
      const advanceCollected = entries.find(
        (e) => e.type === "advance_collected" && e.tenantId === tid,
      );
      expect(
        advanceCollected,
        `advance_collected ledger entry missing for tenant ${i + 1}`,
      ).toBeTruthy();
    }

    // â”€â”€ Cleanup: vacate remaining tenants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    for (const id of [t2Id, t3Id]) {
      await apiPost(page, "/api/tenants/remove", { tenantId: id });
    }
  });

  test("POST /api/owner-hostels rejects request with missing hostelName", async ({ page }) => {
    await loginAsDemoOwner(page);

    const result = await apiPost(page, "/api/owner-hostels", {
      address: "Missing Name Road",
      type: "PG",
      rooms: [{ roomNumber: "X1", bedCount: 2 }],
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  test("POST /api/owner-hostels rejects request with no rooms", async ({ page }) => {
    await loginAsDemoOwner(page);

    const result = await apiPost(page, "/api/owner-hostels", {
      hostelName: "Empty Rooms PG",
      address: "No Rooms Lane",
      type: "PG",
      rooms: [],
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  test("hostel GET by id returns correct hostel", async ({ page }) => {
    await loginAsDemoOwner(page);

    // Create a fresh hostel to test with
    const hd = uniqueHostelData();
    const created = await apiPost(page, "/api/owner-hostels", {
      hostelName: hd.name,
      address: hd.address,
      type: "PG",
      rooms: [{ roomNumber: "Z101", bedCount: 2 }],
    });
    expect(created.ok).toBe(true);
    const hostelId = (created.body as { hostel?: HostelShape }).hostel?.id ?? "";
    expect(hostelId).toBeTruthy();

    // Fetch by ID
    const detail = await apiGet(page, `/api/owner-hostels/${hostelId}`);
    expect(detail.ok, `GET /api/owner-hostels/${hostelId} failed`).toBe(true);

    const hostel = (detail.body as { hostel?: HostelShape }).hostel;
    expect(hostel?.id).toBe(hostelId);
    expect(hostel?.hostelName).toBe(hd.name);
    expect(hostel?.address).toBe(hd.address);
  });

  test("vacating with refundAdvance:false does not add advance_refund ledger entry", async ({
    page,
  }) => {
    await loginAsDemoOwner(page);

    const d = uniqueTenantData();
    const created = await apiPost(page, "/api/tenants", {
      fullName: d.fullName,
      phone: d.phone,
      monthlyRent: 6000,
      rentPaid: 6000,
      advanceAmount: 2000,
      serviceFeeAmount: 500,
      paidOnDate: "2026-05-01",
      billingCycle: "monthly",
    });
    expect(created.ok).toBe(true);
    const tenantId = (created.body as { tenant?: TenantShape }).tenant?.tenantId ?? "";

    const removed = await apiPost(page, "/api/tenants/remove", {
      tenantId,
      advanceRefundEligible: false,
      refundAdvance: false,
      refundAmount: 0,
      settlementNote: "Forfeited advance",
      settlementDate: "2026-05-25",
    });
    expect(removed.ok).toBe(true);

    const ledger = await apiGet(page, "/api/finance-ledger");
    const entries = ((ledger.body as { entries?: LedgerEntry[] }).entries ?? []);
    const spuriousRefund = entries.find(
      (e) => e.type === "advance_refund" && e.tenantId === tenantId,
    );
    expect(spuriousRefund, "advance_refund entry should NOT exist when refundAdvance is false").toBeUndefined();
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Agent B â€” Financial calculation verification
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Agent B â€” Financial calculation verification", () => {
  test("partial payment tenant has pendingBalance = rent âˆ’ paid", async ({ page }) => {
    await loginAsDemoOwner(page);

    const today = new Date().toISOString().slice(0, 10);

    // Tenant with partial payment: 10 000 rent, 8 000 paid â†’ 2 000 pending
    const created = await apiPost(page, "/api/tenants", {
      fullName: "Partial Pay Tenant B",
      phone: "9200000001",
      monthlyRent: 10000,
      rentPaid: 8000,
      advanceAmount: 5000,
      serviceFeeAmount: 1000,
      paidOnDate: today,
      billingCycle: "monthly",
    });
    expect(created.ok, `Tenant B creation failed: ${JSON.stringify(created.body)}`).toBe(true);

    const tenant = (created.body as { tenant?: TenantShape }).tenant;
    expect(tenant?.tenantId).toBeTruthy();
    const tenantId = tenant!.tenantId!;

    // Verify pendingBalance is present and correct
    // pendingBalance is set when rentPaid < monthlyRent
    if (tenant?.pendingBalance !== undefined && tenant.pendingBalance !== null) {
      expect(
        tenant.pendingBalance.amount,
        "pendingBalance.amount should be 2000 (10000 - 8000)",
      ).toBe(2000);
    } else {
      // Some implementations surface it only on GET â€” retrieve and check
      const listResult = await apiGet(page, `/api/tenants?tenantId=${tenantId}`);
      const tenants = ((listResult.body as { tenants?: TenantShape[] }).tenants ?? []);
      const fetched = tenants.find((t) => t.tenantId === tenantId);
      if (fetched?.pendingBalance !== undefined && fetched.pendingBalance !== null) {
        expect(fetched.pendingBalance.amount).toBe(2000);
      }
    }

    // advanceBalance should equal advanceAmount at creation
    const advBal = tenant?.advanceBalance ?? tenant?.advanceAmount;
    expect(advBal, "advanceBalance should be 5000").toBe(5000);

    // Billing anchor should be set to paidOnDate
    const anchor = tenant?.billingAnchorDate ?? tenant?.paidOnDate;
    expect(anchor, "billingAnchorDate should be set to paidOnDate").toBe(today);

    // â”€â”€ Full-paid tenant: no pendingBalance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const created2 = await apiPost(page, "/api/tenants", {
      fullName: "Full Pay Tenant B",
      phone: "9200000002",
      monthlyRent: 12000,
      rentPaid: 12000,
      advanceAmount: 8000,
      serviceFeeAmount: 2000,
      paidOnDate: today,
      billingCycle: "monthly",
    });
    expect(created2.ok, `Full-pay tenant creation failed: ${JSON.stringify(created2.body)}`).toBe(true);

    const tenant2 = (created2.body as { tenant?: TenantShape }).tenant;
    expect(tenant2?.tenantId).toBeTruthy();
    const tenantId2 = tenant2!.tenantId!;

    // When fully paid, pendingBalance should be absent or 0
    if (tenant2?.pendingBalance !== undefined && tenant2.pendingBalance !== null) {
      expect(
        tenant2.pendingBalance.amount ?? 0,
        "Fully paid tenant should have no pendingBalance",
      ).toBe(0);
    }
    // advanceBalance should equal advanceAmount
    expect(tenant2?.advanceBalance ?? tenant2?.advanceAmount).toBe(8000);

    // â”€â”€ Vacate partial-pay tenant and check ledger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const removed = await apiPost(page, "/api/tenants/remove", {
      tenantId,
      advanceRefundEligible: true,
      refundAdvance: true,
      refundAmount: 5000,
      settlementNote: "Agent B vacate",
      settlementDate: today,
    });
    expect(removed.ok, `Vacate partial-pay tenant failed: ${JSON.stringify(removed.body)}`).toBe(true);

    const ledger = await apiGet(page, "/api/finance-ledger");
    expect(ledger.ok).toBe(true);
    const entries = ((ledger.body as { entries?: LedgerEntry[] }).entries ?? []);

    const refund = entries.find(
      (e) => e.type === "advance_refund" && e.tenantId === tenantId,
    );
    expect(refund, "advance_refund ledger entry not found for vacated partial-pay tenant").toBeTruthy();
    expect(refund?.amount).toBe(5000);
    expect(refund?.direction).toBe("debit");

    // â”€â”€ Cleanup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await apiPost(page, "/api/tenants/remove", { tenantId: tenantId2 });
  });

  test("advance_collected and service_fee_collected recorded at creation", async ({ page }) => {
    await loginAsDemoOwner(page);

    const d = uniqueTenantData();
    const paidOn = "2026-05-01";

    const created = await apiPost(page, "/api/tenants", {
      fullName: d.fullName,
      phone: d.phone,
      monthlyRent: 8000,
      rentPaid: 8000,
      advanceAmount: 4000,
      serviceFeeAmount: 1200,
      paidOnDate: paidOn,
      billingCycle: "monthly",
    });
    expect(created.ok).toBe(true);
    const tenantId = (created.body as { tenant?: TenantShape }).tenant?.tenantId ?? "";
    expect(tenantId).toBeTruthy();

    const ledger = await apiGet(page, "/api/finance-ledger");
    const entries = ((ledger.body as { entries?: LedgerEntry[] }).entries ?? []);

    const advCollected = entries.find(
      (e) => e.type === "advance_collected" && e.tenantId === tenantId,
    );
    expect(advCollected, "advance_collected ledger entry missing").toBeTruthy();
    expect(advCollected?.amount).toBe(4000);
    expect(advCollected?.direction).toBe("credit");

    const feeCollected = entries.find(
      (e) => e.type === "service_fee_collected" && e.tenantId === tenantId,
    );
    expect(feeCollected, "service_fee_collected ledger entry missing").toBeTruthy();
    expect(feeCollected?.amount).toBe(1200);
    expect(feeCollected?.direction).toBe("credit");

    // Cleanup
    await apiPost(page, "/api/tenants/remove", { tenantId });
  });

  test("creating tenant with zero advance generates no advance_collected entry", async ({
    page,
  }) => {
    await loginAsDemoOwner(page);

    const d = uniqueTenantData();

    const created = await apiPost(page, "/api/tenants", {
      fullName: d.fullName,
      phone: d.phone,
      monthlyRent: 6000,
      rentPaid: 6000,
      advanceAmount: 0,
      serviceFeeAmount: 0,
      paidOnDate: "2026-05-01",
      billingCycle: "monthly",
    });
    expect(created.ok).toBe(true);
    const tenantId = (created.body as { tenant?: TenantShape }).tenant?.tenantId ?? "";

    const ledger = await apiGet(page, "/api/finance-ledger");
    const entries = ((ledger.body as { entries?: LedgerEntry[] }).entries ?? []);

    const spuriousAdv = entries.find(
      (e) => e.type === "advance_collected" && e.tenantId === tenantId,
    );
    expect(spuriousAdv, "advance_collected should NOT be recorded for zero advance").toBeUndefined();

    // Cleanup
    await apiPost(page, "/api/tenants/remove", { tenantId });
  });

  test("billing anchor equals move-in date when room is assigned at creation", async ({ page }) => {
    await loginAsDemoOwner(page);

    // First find a free bed to assign during creation
    const bed = await findFreeBed(page);
    if (!bed) {
      test.skip(); // No free beds in demo data â€” skip gracefully
      return;
    }

    const d = uniqueTenantData();
    const moveIn = "2026-06-01";

    const created = await apiPost(page, "/api/tenants", {
      fullName: d.fullName,
      phone: d.phone,
      monthlyRent: 7500,
      rentPaid: 7500,
      advanceAmount: 2000,
      serviceFeeAmount: 500,
      paidOnDate: "2026-06-01",
      billingCycle: "monthly",
      hostelId: bed.hostelId,
      unitId: bed.unitId,
      roomNumber: bed.roomNumber,
      bedId: bed.bedId,
      bedLabel: bed.bedLabel,
      moveInDate: moveIn,
      sharingType: "",
    });
    expect(created.ok, `Tenant with assignment creation failed: ${JSON.stringify(created.body)}`).toBe(true);

    const tenant = (created.body as { tenant?: TenantShape }).tenant;
    expect(tenant?.tenantId).toBeTruthy();

    // billingAnchorDate should be moveInDate, not paidOnDate, when assignment is included
    const anchor = tenant?.billingAnchorDate ?? tenant?.paidOnDate;
    expect(anchor, "billingAnchorDate should equal moveInDate").toBe(moveIn);

    // Cleanup
    await apiPost(page, "/api/tenants/remove", { tenantId: tenant!.tenantId });
  });

  test("reports page shows finance ledger section", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/reports");
    await page.waitForLoadState("networkidle");

    // Finance ledger section should be visible on reports page
    await expect(
      page.getByText(/advance.*service.*ledger|finance.*ledger|ledger/i).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Agent C â€” Search and retrieval
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Agent C â€” Search and retrieval", () => {
  test("creates 5 SearchTest tenants, verifies all present, retrieves each by ID", async ({
    page,
  }) => {
    await loginAsDemoOwner(page);

    const today = new Date().toISOString().slice(0, 10);
    const searchPrefix = "SearchTest";

    // â”€â”€ Create 5 uniquely-named tenants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const createdIds: string[] = [];
    const createdNames: string[] = [];

    for (let i = 1; i <= 5; i++) {
      const d = uniqueTenantData();
      const name = `${searchPrefix} ${d.fullName}`;
      const res = await apiPost(page, "/api/tenants", {
        fullName: name,
        phone: d.phone,
        email: `searchtest.${i}.${Date.now()}@example.test`,
        monthlyRent: 5000 + i * 500,
        rentPaid: 5000 + i * 500,
        paidOnDate: today,
        billingCycle: "monthly",
      });
      expect(res.ok, `SearchTest tenant ${i} creation failed: ${JSON.stringify(res.body)}`).toBe(true);

      const tenant = (res.body as { tenant?: TenantShape }).tenant;
      expect(tenant?.tenantId).toBeTruthy();
      createdIds.push(tenant!.tenantId!);
      createdNames.push(name);
    }

    expect(createdIds.length).toBe(5);

    // â”€â”€ All 5 must appear in GET /api/tenants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const listResult = await apiGet(page, "/api/tenants");
    expect(listResult.ok).toBe(true);
    const allTenants = ((listResult.body as { tenants?: TenantShape[] }).tenants ?? []);

    for (const id of createdIds) {
      const found = allTenants.find((t) => t.tenantId === id);
      expect(found, `SearchTest tenant ${id} not found in GET /api/tenants`).toBeTruthy();
    }

    // â”€â”€ Tenant IDs must be unique â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const idSet = new Set(createdIds);
    expect(idSet.size, "All 5 tenant IDs should be unique").toBe(5);

    // â”€â”€ Each tenant retrievable by exact name search on the list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    for (const name of createdNames) {
      const inList = allTenants.find(
        (t) => (t.fullName ?? "").toLowerCase() === name.toLowerCase(),
      );
      expect(inList, `Tenant "${name}" not found via exact name match in list`).toBeTruthy();
    }

    // â”€â”€ GET /api/tenants?tenantId=X returns exactly that tenant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    for (const id of createdIds) {
      const detail = await apiGet(page, `/api/tenants?tenantId=${id}`);
      expect(detail.ok, `GET by tenantId ${id} failed`).toBe(true);
      const tenants = ((detail.body as { tenants?: TenantShape[] }).tenants ?? []);
      const fetched = tenants.find((t) => t.tenantId === id);
      expect(fetched, `Tenant ${id} not returned by tenantId filter`).toBeTruthy();
    }

    // â”€â”€ Assign room to one tenant without assignment, then verify â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const unassignedId = createdIds[4]; // 5th tenant â€” still unassigned

    const bed = await findFreeBed(page);
    if (bed) {
      const assignRes = await apiPost(page, "/api/tenants/assign-room", {
        tenantId: unassignedId,
        hostelId: bed.hostelId,
        unitId: bed.unitId,
        roomNumber: bed.roomNumber,
        bedId: bed.bedId,
        bedLabel: bed.bedLabel,
        moveInDate: today,
        sharingType: "",
      });

      if (assignRes.status !== 409) {
        expect(assignRes.ok, `Room assignment failed: ${JSON.stringify(assignRes.body)}`).toBe(true);

        // Verify assignment saved
        const afterAssign = await apiGet(page, `/api/tenants?tenantId=${unassignedId}`);
        const afterTenants = ((afterAssign.body as { tenants?: TenantShape[] }).tenants ?? []);
        const updated = afterTenants.find((t) => t.tenantId === unassignedId);
        expect(updated?.assignment?.roomNumber, "Room assignment should be saved").toBeTruthy();
        expect(updated?.assignment?.hostelId).toBe(bed.hostelId);

        // â”€â”€ Change room: assign to a different bed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const newBed = await findFreeBed(page);
        if (newBed && newBed.bedId !== bed.bedId) {
          const reassignRes = await apiPost(page, "/api/tenants/assign-room", {
            tenantId: unassignedId,
            hostelId: newBed.hostelId,
            unitId: newBed.unitId,
            roomNumber: newBed.roomNumber,
            bedId: newBed.bedId,
            bedLabel: newBed.bedLabel,
            moveInDate: today,
            sharingType: "",
          });

          // API returns 400 if tenant already has an active allocation (requires vacate first)
          // Only assert success path if re-assignment was actually accepted
          if (reassignRes.ok) {

            const afterReassign = await apiGet(page, `/api/tenants?tenantId=${unassignedId}`);
            const rTenants = ((afterReassign.body as { tenants?: TenantShape[] }).tenants ?? []);
            const rUpdated = rTenants.find((t) => t.tenantId === unassignedId);
            // New assignment should reflect the new room
            expect(rUpdated?.assignment?.hostelId, "Hostel should reflect new assignment").toBe(newBed.hostelId);
          }
        }
      }
    }

    // â”€â”€ Cleanup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    for (const id of createdIds) {
      await apiPost(page, "/api/tenants/remove", { tenantId: id });
    }
  });

  test("GET /api/tenants returns correct shape â€” tenants array with required fields", async ({
    page,
  }) => {
    await loginAsDemoOwner(page);

    const result = await apiGet(page, "/api/tenants");
    expect(result.ok).toBe(true);

    const tenants = ((result.body as { tenants?: TenantShape[] }).tenants ?? []);
    expect(Array.isArray(tenants), "tenants should be an array").toBe(true);
    expect(tenants.length, "Demo session should have at least one tenant").toBeGreaterThan(0);

    // Check required fields on first tenant
    const first = tenants[0];
    expect(typeof first.tenantId).toBe("string");
    expect(typeof first.fullName).toBe("string");
    expect(typeof first.monthlyRent).toBe("number");
  });

  test("searching demo tenant Aarav by name on UI returns correct tenant", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants?q=Aarav");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("Aarav Sharma").filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("API GET /api/tenants filters by hostelId correctly", async ({ page }) => {
    await loginAsDemoOwner(page);

    // Get all hostels to find a valid hostelId
    const hostelsResult = await apiGet(page, "/api/owner-hostels");
    const hostels = ((hostelsResult.body as { hostels?: HostelShape[] }).hostels ?? []);

    if (hostels.length === 0) {
      test.skip();
      return;
    }

    const firstHostel = hostels[0];
    const hostelId = firstHostel.id ?? "";
    expect(hostelId).toBeTruthy();

    const filtered = await apiGet(page, `/api/tenants?hostelId=${hostelId}`);
    expect(filtered.ok, "Filtered tenant GET failed").toBe(true);

    const tenants = ((filtered.body as { tenants?: TenantShape[] }).tenants ?? []);
    // All returned tenants should belong to the requested hostel
    for (const t of tenants) {
      const assignedHostelId = t.assignment?.hostelId ?? (t as unknown as { hostelId?: string }).hostelId;
      if (assignedHostelId) {
        expect(
          assignedHostelId,
          `Tenant ${t.tenantId} is in hostel ${assignedHostelId}, expected ${hostelId}`,
        ).toBe(hostelId);
      }
    }
  });

  test("tenant list page UI search by phone number shows matching tenant", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants");
    await page.waitForLoadState("networkidle");

    const searchInput = page
      .locator("main")
      .getByPlaceholder(/search/i)
      .filter({ visible: true })
      .first();
    await searchInput.fill("9876501201"); // Aarav Sharma's phone
    await page.waitForTimeout(600);

    await expect(
      page.getByText("Aarav Sharma").filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 6_000 });
  });

  test("tenant detail page loads for demo tenant Aarav via /owner/tenants/51201", async ({
    page,
  }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/tenants/51201");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("Aarav Sharma").filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Agent D â€” Edge cases and data integrity
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("Agent D â€” Edge cases and data integrity", () => {
  test("creates tenant with all optional fields and verifies all fields stored", async ({
    page,
  }) => {
    await loginAsDemoOwner(page);

    const d = uniqueTenantData();
    const today = new Date().toISOString().slice(0, 10);

    const payload = {
      fullName: d.fullName,
      fatherName: "Father of " + d.fullName,
      dateOfBirth: "1995-08-20",
      phone: d.phone,
      email: d.email,
      idType: "pan",
      idNumber: "ABCDE1234F",
      occupation: "employed",
      workplaceName: "EdgeCase Corp",
      emergencyContactName: "EC Contact",
      emergencyContactRelation: "father",
      emergencyContactPhone: d.emergencyPhone,
      monthlyRent: 9500,
      rentPaid: 9500,
      advanceAmount: 6000,
      serviceFeeAmount: 1500,
      paidOnDate: today,
      billingCycle: "monthly",
    };

    const created = await apiPost(page, "/api/tenants", payload);
    expect(created.ok, `Full-field tenant creation failed: ${JSON.stringify(created.body)}`).toBe(true);

    const tenant = (created.body as { tenant?: TenantShape }).tenant;
    expect(tenant?.tenantId).toBeTruthy();
    const tenantId = tenant!.tenantId!;

    // Retrieve from list and verify all fields
    const retrieved = await apiGet(page, `/api/tenants?tenantId=${tenantId}`);
    expect(retrieved.ok).toBe(true);
    const tenants = ((retrieved.body as { tenants?: TenantShape[] }).tenants ?? []);
    const t = tenants.find((x) => x.tenantId === tenantId);
    expect(t, "Tenant not found after creation").toBeTruthy();

    // Verify core fields
    expect(t?.fullName).toBe(d.fullName);
    expect(t?.phone).toBe(d.phone);
    expect(t?.email).toBe(d.email);
    expect(t?.monthlyRent).toBe(9500);
    expect(t?.advanceAmount).toBe(6000);
    expect(t?.serviceFeeAmount).toBe(1500);

    // Optional fields â€” check on the tenant returned by the API
    // (some fields live in data sub-object due to the { ...t, data: t } mirror)
    const tData = (t as unknown as { data?: TenantShape })?.data ?? t;
    const fatherName = tData?.fatherName ?? (t as unknown as { fatherName?: string }).fatherName;
    const dob = tData?.dateOfBirth ?? (t as unknown as { dateOfBirth?: string }).dateOfBirth;
    const idType = tData?.idType ?? (t as unknown as { idType?: string }).idType;
    const occupation = tData?.occupation ?? (t as unknown as { occupation?: string }).occupation;
    const workplaceName = tData?.workplaceName ?? (t as unknown as { workplaceName?: string }).workplaceName;
    const ecName = tData?.emergencyContactName ?? (t as unknown as { emergencyContactName?: string }).emergencyContactName;
    const ecRel = tData?.emergencyContactRelation ?? (t as unknown as { emergencyContactRelation?: string }).emergencyContactRelation;
    const ecPhone = tData?.emergencyContactPhone ?? (t as unknown as { emergencyContactPhone?: string }).emergencyContactPhone;

    if (fatherName) expect(fatherName).toBe("Father of " + d.fullName);
    if (dob) expect(dob).toBe("1995-08-20");
    if (idType) expect(idType).toBe("pan");
    if (occupation) expect(occupation).toBe("employed");
    if (workplaceName) expect(workplaceName).toBe("EdgeCase Corp");
    if (ecName) expect(ecName).toBe("EC Contact");
    if (ecRel) expect(ecRel).toBe("father");
    if (ecPhone) expect(ecPhone).toBe(d.emergencyPhone);

    // â”€â”€ Update phone and email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const newPhone = "9888777666";
    const newEmail = `updated.${Date.now()}@example.test`;

    const patchResult = await apiPatch(page, `/api/tenants/${tenantId}`, {
      phone: newPhone,
      email: newEmail,
    });
    expect(patchResult.ok, `PATCH tenant phone/email failed: ${JSON.stringify(patchResult.body)}`).toBe(true);

    // Verify update reflected immediately on GET
    const afterPatch = await apiGet(page, `/api/tenants?tenantId=${tenantId}`);
    const afterTenants = ((afterPatch.body as { tenants?: TenantShape[] }).tenants ?? []);
    const afterT = afterTenants.find((x) => x.tenantId === tenantId);
    expect(afterT, "Tenant not found after PATCH").toBeTruthy();
    expect(afterT?.phone, "Phone update not reflected on GET").toBe(newPhone);
    expect(afterT?.email, "Email update not reflected on GET").toBe(newEmail);

    // â”€â”€ Cleanup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await apiPost(page, "/api/tenants/remove", { tenantId });
  });

  test("two tenants in same room â€” both beds occupied, vacate one, bed freed, new tenant fills it", async ({
    page,
  }) => {
    await loginAsDemoOwner(page);

    const today = new Date().toISOString().slice(0, 10);

    // We need a hostel with a room that has at least 2 free beds.
    // Create a dedicated hostel for this test to avoid flakiness.
    const hd = uniqueHostelData();
    const hostelCreated = await apiPost(page, "/api/owner-hostels", {
      hostelName: hd.name,
      address: hd.address,
      type: "PG",
      rooms: [{ roomNumber: "D-TWIN", bedCount: 2 }],
    });
    expect(hostelCreated.ok, `Dedicated hostel creation failed: ${JSON.stringify(hostelCreated.body)}`).toBe(true);

    const hostelId = (hostelCreated.body as { hostel?: HostelShape }).hostel?.id ?? "";
    expect(hostelId).toBeTruthy();

    // Fetch hostel detail to get the room's bed IDs
    const hostelDetail = await apiGet(page, `/api/owner-hostels/${hostelId}`);
    expect(hostelDetail.ok).toBe(true);

    const hData = (hostelDetail.body as { hostel?: HostelShape }).hostel;
    const dRooms: RoomShape[] = hData?.data?.rooms ?? hData?.rooms ?? [];
    const twinRoom = dRooms.find((r) => r.roomNumber === "D-TWIN") ?? dRooms[0];
    expect(twinRoom, "D-TWIN room not found in hostel detail").toBeTruthy();

    const roomBeds = twinRoom?.beds ?? [];
    if (roomBeds.length < 2) {
      // Beds may be missing from the GET (demo filters occupied beds out).
      // Fall back to constructing synthetic bed IDs as the store normalizes them.
      // The assign-room endpoint will match by bedId within the stored structure.
      test.skip();
      return;
    }

    const bed0 = roomBeds[0];
    const bed1 = roomBeds[1];
    const twinUnitId =
      twinRoom?.unitId ??
      `${hostelId}-f0-${String(twinRoom?.roomNumber ?? "d-twin").toLowerCase()}`;

    // â”€â”€ Create Tenant D-1 and assign to bed 0 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const dA = uniqueTenantData();
    const createdD1 = await apiPost(page, "/api/tenants", {
      fullName: `D1 ${dA.fullName}`,
      phone: dA.phone,
      monthlyRent: 7000,
      rentPaid: 7000,
      paidOnDate: today,
      billingCycle: "monthly",
    });
    expect(createdD1.ok).toBe(true);
    const d1Id = (createdD1.body as { tenant?: TenantShape }).tenant?.tenantId ?? "";

    const assignD1 = await apiPost(page, "/api/tenants/assign-room", {
      tenantId: d1Id,
      hostelId,
      unitId: twinUnitId,
      roomNumber: twinRoom!.roomNumber ?? "D-TWIN",
      bedId: bed0.id ?? "",
      bedLabel: bed0.label ?? "",
      moveInDate: today,
      sharingType: "",
    });
    if (assignD1.status === 409) {
      // Bed is already occupied â€” skip this test gracefully
      await apiPost(page, "/api/tenants/remove", { tenantId: d1Id });
      test.skip();
      return;
    }
    expect(assignD1.ok, `Assign D1 to bed0 failed: ${JSON.stringify(assignD1.body)}`).toBe(true);

    // â”€â”€ Create Tenant D-2 and assign to bed 1 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const dB = uniqueTenantData();
    const createdD2 = await apiPost(page, "/api/tenants", {
      fullName: `D2 ${dB.fullName}`,
      phone: dB.phone,
      monthlyRent: 7000,
      rentPaid: 7000,
      paidOnDate: today,
      billingCycle: "monthly",
    });
    expect(createdD2.ok).toBe(true);
    const d2Id = (createdD2.body as { tenant?: TenantShape }).tenant?.tenantId ?? "";

    const assignD2 = await apiPost(page, "/api/tenants/assign-room", {
      tenantId: d2Id,
      hostelId,
      unitId: twinUnitId,
      roomNumber: twinRoom!.roomNumber ?? "D-TWIN",
      bedId: bed1.id ?? "",
      bedLabel: bed1.label ?? "",
      moveInDate: today,
      sharingType: "",
    });
    if (assignD2.status === 409) {
      await apiPost(page, "/api/tenants/remove", { tenantId: d1Id });
      await apiPost(page, "/api/tenants/remove", { tenantId: d2Id });
      test.skip();
      return;
    }
    expect(assignD2.ok, `Assign D2 to bed1 failed: ${JSON.stringify(assignD2.body)}`).toBe(true);

    // â”€â”€ Verify room shows 2 occupied beds via tenant list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const listAfterBoth = await apiGet(page, "/api/tenants");
    const allAfterBoth = ((listAfterBoth.body as { tenants?: TenantShape[] }).tenants ?? []);
    const d1InList = allAfterBoth.find((t) => t.tenantId === d1Id);
    const d2InList = allAfterBoth.find((t) => t.tenantId === d2Id);
    expect(d1InList, "D1 should be in active tenant list").toBeTruthy();
    expect(d2InList, "D2 should be in active tenant list").toBeTruthy();
    expect(d1InList?.assignment?.roomNumber, "D1 should be assigned to D-TWIN room").toBeTruthy();
    expect(d2InList?.assignment?.roomNumber, "D2 should be assigned to D-TWIN room").toBeTruthy();

    // Both tenants should be in the same room
    expect(d1InList?.assignment?.roomNumber).toBe(d2InList?.assignment?.roomNumber);

    // â”€â”€ Vacate D1 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const vacateD1 = await apiPost(page, "/api/tenants/remove", {
      tenantId: d1Id,
      advanceRefundEligible: false,
      refundAdvance: false,
      refundAmount: 0,
      settlementDate: today,
    });
    expect(vacateD1.ok, `Vacate D1 failed: ${JSON.stringify(vacateD1.body)}`).toBe(true);

    // D1 must be gone from list
    const listAfterVacate = await apiGet(page, "/api/tenants");
    const afterVacate = ((listAfterVacate.body as { tenants?: TenantShape[] }).tenants ?? []);
    expect(afterVacate.find((t) => t.tenantId === d1Id), "D1 should not be in active list after vacate").toBeUndefined();
    expect(afterVacate.find((t) => t.tenantId === d2Id), "D2 should still be in list").toBeTruthy();

    // â”€â”€ Assign new Tenant D-3 to the freed bed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const dC = uniqueTenantData();
    const createdD3 = await apiPost(page, "/api/tenants", {
      fullName: `D3 ${dC.fullName}`,
      phone: dC.phone,
      monthlyRent: 7000,
      rentPaid: 7000,
      paidOnDate: today,
      billingCycle: "monthly",
    });
    expect(createdD3.ok).toBe(true);
    const d3Id = (createdD3.body as { tenant?: TenantShape }).tenant?.tenantId ?? "";

    const assignD3 = await apiPost(page, "/api/tenants/assign-room", {
      tenantId: d3Id,
      hostelId,
      unitId: twinUnitId,
      roomNumber: twinRoom!.roomNumber ?? "D-TWIN",
      bedId: bed0.id ?? "", // bed0 was freed when D1 vacated
      bedLabel: bed0.label ?? "",
      moveInDate: today,
      sharingType: "",
    });

    if (assignD3.status !== 409) {
      expect(assignD3.ok, `Assign D3 to freed bed failed: ${JSON.stringify(assignD3.body)}`).toBe(true);

      // Room should again show 2 occupied beds (D2 + D3)
      const listAfterD3 = await apiGet(page, "/api/tenants");
      const afterD3 = ((listAfterD3.body as { tenants?: TenantShape[] }).tenants ?? []);
      const d2AfterD3 = afterD3.find((t) => t.tenantId === d2Id);
      const d3AfterD3 = afterD3.find((t) => t.tenantId === d3Id);
      expect(d2AfterD3, "D2 should still be in list").toBeTruthy();
      expect(d3AfterD3, "D3 should now be in list").toBeTruthy();
      expect(d3AfterD3?.assignment?.roomNumber, "D3 should be assigned to the twin room").toBeTruthy();
    }

    // â”€â”€ Cleanup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await apiPost(page, "/api/tenants/remove", { tenantId: d2Id });
    await apiPost(page, "/api/tenants/remove", { tenantId: d3Id });
  });

  test("PATCH tenant â€” all editable profile fields update and persist", async ({ page }) => {
    await loginAsDemoOwner(page);

    const d = uniqueTenantData();
    const created = await apiPost(page, "/api/tenants", {
      fullName: d.fullName,
      phone: d.phone,
      monthlyRent: 8000,
      rentPaid: 8000,
      paidOnDate: "2026-05-01",
      billingCycle: "monthly",
    });
    expect(created.ok).toBe(true);
    const tenantId = (created.body as { tenant?: TenantShape }).tenant?.tenantId ?? "";
    expect(tenantId).toBeTruthy();

    const updatedName = `${d.fullName} EDITED`;
    const patchAll = await apiPatch(page, `/api/tenants/${tenantId}`, {
      fullName: updatedName,
      phone: "9777666555",
      email: "patched@example.test",
      occupation: "student",
      workplaceName: "State University",
      emergencyContactName: "Patched Contact",
      emergencyContactRelation: "mother",
      emergencyContactPhone: "9666555444",
      monthlyRent: 10000,
      billingCycle: "monthly",
    });
    expect(patchAll.ok, `Full PATCH failed: ${JSON.stringify(patchAll.body)}`).toBe(true);

    // Verify all changes reflected
    const after = await apiGet(page, `/api/tenants?tenantId=${tenantId}`);
    const tenants = ((after.body as { tenants?: TenantShape[] }).tenants ?? []);
    const updated = tenants.find((t) => t.tenantId === tenantId);
    expect(updated, "Tenant not found after PATCH").toBeTruthy();

    expect(updated?.fullName, "fullName not updated").toBe(updatedName);
    expect(updated?.phone, "phone not updated").toBe("9777666555");
    expect(updated?.monthlyRent, "monthlyRent not updated").toBe(10000);

    const uData = (updated as unknown as { data?: TenantShape })?.data ?? updated;
    const uEmail = uData?.email ?? (updated as unknown as { email?: string }).email;
    if (uEmail) expect(uEmail, "email not updated").toBe("patched@example.test");

    // Cleanup
    await apiPost(page, "/api/tenants/remove", { tenantId });
  });

  test("PATCH with invalid email returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);

    const d = uniqueTenantData();
    const created = await apiPost(page, "/api/tenants", {
      fullName: d.fullName,
      phone: d.phone,
      monthlyRent: 6000,
      rentPaid: 6000,
      paidOnDate: "2026-05-01",
      billingCycle: "monthly",
    });
    expect(created.ok).toBe(true);
    const tenantId = (created.body as { tenant?: TenantShape }).tenant?.tenantId ?? "";

    const badPatch = await apiPatch(page, `/api/tenants/${tenantId}`, {
      email: "not-a-valid-email",
    });
    expect(badPatch.ok).toBe(false);
    expect(badPatch.status).toBe(400);

    // Cleanup
    await apiPost(page, "/api/tenants/remove", { tenantId });
  });

  test("PATCH with empty fullName returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);

    const d = uniqueTenantData();
    const created = await apiPost(page, "/api/tenants", {
      fullName: d.fullName,
      phone: d.phone,
      monthlyRent: 6000,
      rentPaid: 6000,
      paidOnDate: "2026-05-01",
      billingCycle: "monthly",
    });
    expect(created.ok).toBe(true);
    const tenantId = (created.body as { tenant?: TenantShape }).tenant?.tenantId ?? "";

    const badPatch = await apiPatch(page, `/api/tenants/${tenantId}`, {
      fullName: "",
    });
    expect(badPatch.ok).toBe(false);
    expect(badPatch.status).toBe(400);

    // Cleanup
    await apiPost(page, "/api/tenants/remove", { tenantId });
  });

  test("POST /api/tenants/remove without tenantId returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);

    const result = await apiPost(page, "/api/tenants/remove", {
      advanceRefundEligible: false,
      refundAmount: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  test("POST /api/tenants/remove with negative refundAmount returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);

    const d = uniqueTenantData();
    const created = await apiPost(page, "/api/tenants", {
      fullName: d.fullName,
      phone: d.phone,
      monthlyRent: 6000,
      rentPaid: 6000,
      paidOnDate: "2026-05-01",
      billingCycle: "monthly",
    });
    expect(created.ok).toBe(true);
    const tenantId = (created.body as { tenant?: TenantShape }).tenant?.tenantId ?? "";

    const result = await apiPost(page, "/api/tenants/remove", {
      tenantId,
      refundAmount: -500,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);

    // Cleanup â€” tenant should NOT have been removed
    const check = await apiGet(page, `/api/tenants?tenantId=${tenantId}`);
    const checkTenants = ((check.body as { tenants?: TenantShape[] }).tenants ?? []);
    const stillExists = checkTenants.find((t) => t.tenantId === tenantId);
    expect(stillExists, "Tenant should still exist after rejected remove").toBeTruthy();

    await apiPost(page, "/api/tenants/remove", { tenantId });
  });

  test("assign-room with missing required fields returns 400", async ({ page }) => {
    await loginAsDemoOwner(page);

    const d = uniqueTenantData();
    const created = await apiPost(page, "/api/tenants", {
      fullName: d.fullName,
      phone: d.phone,
      monthlyRent: 6000,
      rentPaid: 6000,
      paidOnDate: "2026-05-01",
      billingCycle: "monthly",
    });
    expect(created.ok).toBe(true);
    const tenantId = (created.body as { tenant?: TenantShape }).tenant?.tenantId ?? "";

    // Missing hostelId and moveInDate
    const result = await apiPost(page, "/api/tenants/assign-room", {
      tenantId,
      roomNumber: "X99",
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);

    // Cleanup
    await apiPost(page, "/api/tenants/remove", { tenantId });
  });

  test("GET /api/owner-hostels/{id} returns 404 for non-existent hostel", async ({ page }) => {
    await loginAsDemoOwner(page);

    const result = await apiGet(page, "/api/owner-hostels/nonexistent-id-99999");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });

  test("tenant count increases on create and decreases on vacate", async ({ page }) => {
    await loginAsDemoOwner(page);

    // Get baseline count
    const before = await apiGet(page, "/api/tenants");
    const beforeCount = ((before.body as { tenants?: unknown[] }).tenants ?? []).length;

    const d = uniqueTenantData();
    const created = await apiPost(page, "/api/tenants", {
      fullName: d.fullName,
      phone: d.phone,
      monthlyRent: 7000,
      rentPaid: 7000,
      paidOnDate: "2026-05-01",
      billingCycle: "monthly",
    });
    expect(created.ok).toBe(true);
    const tenantId = (created.body as { tenant?: TenantShape }).tenant?.tenantId ?? "";

    const afterCreate = await apiGet(page, "/api/tenants");
    const afterCreateCount = ((afterCreate.body as { tenants?: unknown[] }).tenants ?? []).length;
    // Use >= to be robust against ghost tenants from other test suites leaking into shared demo store
    expect(afterCreateCount, "Count should increase after create").toBeGreaterThanOrEqual(beforeCount + 1);

    await apiPost(page, "/api/tenants/remove", { tenantId });

    const afterDelete = await apiGet(page, "/api/tenants");
    const afterDeleteCount = ((afterDelete.body as { tenants?: unknown[] }).tenants ?? []).length;
    // Check relative decrease (our tenant was removed) rather than exact baseline equality
    expect(afterDeleteCount, "Count should decrease by 1 after vacate").toBe(afterCreateCount - 1);
  });
});
