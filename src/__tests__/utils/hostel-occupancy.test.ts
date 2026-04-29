import { describe, it, expect } from "vitest";
import {
  getRoomCapacity,
  normalizeRoom,
  buildHostelInventory,
  getHostelOccupancySummary,
} from "@/utils/hostel-occupancy";
import type { OwnerHostel, OwnerRoom } from "@/types/owner-hostel";
import type { TenantRecord } from "@/types/tenant";

// ─── helpers ────────────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<OwnerRoom> = {}): OwnerRoom {
  return {
    id: "room-1",
    roomNumber: "101",
    bedCount: 3,
    sharingType: "3 sharing",
    ...overrides,
  };
}

function makeHostel(overrides: Partial<OwnerHostel> = {}): OwnerHostel {
  return {
    id: "hostel-1",
    hostelName: "Test Hostel",
    address: "123 Test St",
    type: "PG",
    createdAt: "2026-01-01T00:00:00Z",
    floors: [
      {
        id: "floor-1",
        floorLabel: "Floor 1",
        rooms: [
          makeRoom({ id: "r1", roomNumber: "101", bedCount: 2 }),
          makeRoom({ id: "r2", roomNumber: "102", bedCount: 3 }),
        ],
      },
    ],
    ...overrides,
  };
}

function makeTenant(hostelId: string, floorNumber: number, roomNumber: string, bedId?: string): TenantRecord {
  return {
    tenantId: `t-${Math.random().toString(36).slice(2)}`,
    fullName: "Test Tenant",
    phone: "9876500000",
    email: "test@test.com",
    monthlyRent: 5000,
    rentPaid: 5000,
    paidOnDate: "2026-03-01",
    billingAnchorDate: "2026-03-01",
    nextDueDate: "2026-04-01",
    idNumber: "ID-001",
    createdAt: "2026-03-01T00:00:00Z",
    assignment: {
      hostelId,
      hostelName: "Test Hostel",
      floorNumber,
      roomNumber,
      sharingType: "3 sharing",
      moveInDate: "2026-03-01",
      bedId,
    },
    paymentHistory: [],
  };
}

// ─── getRoomCapacity ─────────────────────────────────────────────────────────

describe("getRoomCapacity", () => {
  it("RESIDENCE always returns 1", () => {
    expect(getRoomCapacity("RESIDENCE", { bedCount: 5 })).toBe(1);
    expect(getRoomCapacity("RESIDENCE", { bedCount: 0 })).toBe(1);
  });

  it("PG returns bedCount when >= 1", () => {
    expect(getRoomCapacity("PG", { bedCount: 3 })).toBe(3);
    expect(getRoomCapacity("PG", { bedCount: 1 })).toBe(1);
  });

  it("PG returns 1 when bedCount is 0 (min clamp)", () => {
    expect(getRoomCapacity("PG", { bedCount: 0 })).toBe(1);
  });
});

// ─── normalizeRoom ───────────────────────────────────────────────────────────

describe("normalizeRoom", () => {
  it("PG: generates beds array with correct length", () => {
    const room = makeRoom({ bedCount: 3 });
    const normalized = normalizeRoom("hostel-1", "floor-1", "PG", room);
    expect(normalized.beds).toHaveLength(3);
    expect(normalized.beds?.[0].label).toBe("Bed 1");
    expect(normalized.beds?.[2].label).toBe("Bed 3");
  });

  it("RESIDENCE: beds array is empty", () => {
    const room = makeRoom({ bedCount: 1 });
    const normalized = normalizeRoom("hostel-1", "floor-1", "RESIDENCE", room);
    expect(normalized.beds).toHaveLength(0);
    expect(normalized.bedCount).toBe(1);
  });

  it("RESIDENCE: bedCount clamped to 1 even if room.bedCount > 1", () => {
    const room = makeRoom({ bedCount: 5 });
    const normalized = normalizeRoom("hostel-1", "floor-1", "RESIDENCE", room);
    expect(normalized.bedCount).toBe(1);
  });

  it("preserves existing unitId", () => {
    const room = makeRoom({ unitId: "custom-unit-id" });
    const normalized = normalizeRoom("hostel-1", "floor-1", "PG", room);
    expect(normalized.unitId).toBe("custom-unit-id");
  });

  it("generates unitId when id and unitId are absent", () => {
    const room = makeRoom({ id: "", roomNumber: "101", unitId: undefined });
    const normalized = normalizeRoom("hostel-1", "floor-1", "PG", room);
    expect(normalized.unitId).toBeTruthy();
    expect(normalized.unitId).toContain("hostel-1");
  });
});

// ─── buildHostelInventory ────────────────────────────────────────────────────

describe("buildHostelInventory (PG)", () => {
  it("empty tenants → all rooms vacant", () => {
    const hostel = makeHostel();
    const inventory = buildHostelInventory(hostel, []);
    const floor = inventory.floors[0];
    expect(floor.rooms[0].occupied).toBe(0);
    expect(floor.rooms[1].occupied).toBe(0);
  });

  it("counts occupied beds from tenants", () => {
    const hostel = makeHostel();
    // Normalize first to get actual bed IDs
    const inventory = buildHostelInventory(hostel, []);
    const floor = inventory.floors[0];
    const room = floor.rooms[0]; // 101
    const bedId = room.beds?.[0]?.id ?? "";

    const tenant = makeTenant("hostel-1", 1, "101", bedId);
    const inventoryWithTenant = buildHostelInventory(hostel, [tenant]);
    expect(inventoryWithTenant.floors[0].rooms[0].occupied).toBe(1);
  });

  it("hostel metadata preserved", () => {
    const hostel = makeHostel();
    const inventory = buildHostelInventory(hostel, []);
    expect(inventory.hostelId).toBe("hostel-1");
    expect(inventory.hostelName).toBe("Test Hostel");
    expect(inventory.type).toBe("PG");
  });

  it("floor numbers are 1-indexed", () => {
    const hostel = makeHostel();
    const inventory = buildHostelInventory(hostel, []);
    expect(inventory.floors[0].floorNumber).toBe(1);
  });

  it("beds array populated for PG rooms", () => {
    const hostel = makeHostel();
    const inventory = buildHostelInventory(hostel, []);
    expect(inventory.floors[0].rooms[0].beds?.length).toBe(2); // bedCount=2
    expect(inventory.floors[0].rooms[1].beds?.length).toBe(3); // bedCount=3
  });
});

describe("buildHostelInventory (RESIDENCE)", () => {
  it("beds array empty for RESIDENCE rooms", () => {
    const hostel = makeHostel({ type: "RESIDENCE" });
    const inventory = buildHostelInventory(hostel, []);
    expect(inventory.floors[0].rooms[0].beds).toHaveLength(0);
  });

  it("occupied is 1 when a tenant is assigned to the unit", () => {
    const hostel = makeHostel({ type: "RESIDENCE" });
    const tenant = makeTenant("hostel-1", 1, "101");
    const inventory = buildHostelInventory(hostel, [tenant]);
    expect(inventory.floors[0].rooms[0].occupied).toBe(1);
  });

  it("occupied max 1 even if multiple tenants recorded for same unit", () => {
    const hostel = makeHostel({ type: "RESIDENCE" });
    const tenant1 = makeTenant("hostel-1", 1, "101");
    const tenant2 = makeTenant("hostel-1", 1, "101");
    const inventory = buildHostelInventory(hostel, [tenant1, tenant2]);
    expect(inventory.floors[0].rooms[0].occupied).toBe(1);
  });
});

// ─── getHostelOccupancySummary ───────────────────────────────────────────────

describe("getHostelOccupancySummary (PG)", () => {
  it("all vacant: occupiedBeds=0, vacantBeds=totalBeds", () => {
    const hostel = makeHostel(); // 2+3 = 5 beds
    const summary = getHostelOccupancySummary(hostel, []);
    expect(summary.totalRooms).toBe(2);
    expect(summary.totalBeds).toBe(5);
    expect(summary.occupiedBeds).toBe(0);
    expect(summary.vacantBeds).toBe(5);
    expect(summary.vacantUnits).toBe(0); // PG has no unit vacancy metric
  });

  it("1 occupied bed: occupiedBeds=1, vacantBeds=4", () => {
    const hostel = makeHostel();
    const inventory = buildHostelInventory(hostel, []);
    const bedId = inventory.floors[0].rooms[0].beds?.[0]?.id ?? "";
    const tenant = makeTenant("hostel-1", 1, "101", bedId);
    const summary = getHostelOccupancySummary(hostel, [tenant]);
    expect(summary.occupiedBeds).toBe(1);
    expect(summary.vacantBeds).toBe(4);
  });
});

describe("getHostelOccupancySummary (RESIDENCE)", () => {
  it("all vacant: occupiedUnits=0, vacantUnits=totalRooms", () => {
    const hostel = makeHostel({ type: "RESIDENCE" });
    const summary = getHostelOccupancySummary(hostel, []);
    expect(summary.occupiedUnits).toBe(0);
    expect(summary.vacantUnits).toBe(2);
    expect(summary.vacantBeds).toBe(0); // RESIDENCE uses unit metrics not bed
  });

  it("1 tenant → occupiedUnits=1", () => {
    const hostel = makeHostel({ type: "RESIDENCE" });
    const tenant = makeTenant("hostel-1", 1, "101");
    const summary = getHostelOccupancySummary(hostel, [tenant]);
    expect(summary.occupiedUnits).toBe(1);
    expect(summary.vacantUnits).toBe(1);
  });
});
