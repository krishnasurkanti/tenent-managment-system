import { DEMO_OWNER_HOSTEL_ID, getOwnerHostelInventory } from "@/data/ownerHostelStore";
import { calculateNextDueDate, getDueStatus } from "@/utils/payment";
import { atomicWrite, maybeAutoBackup } from "@/lib/backup";
import type { TenantAssignment, TenantFamilyMember, TenantRecord } from "@/types/tenant";
import fs from "node:fs";
import path from "node:path";

function getDemoTenantRecords(): TenantRecord[] {
  // Use relative offsets so demo data always shows a realistic mix of statuses
  // regardless of the current date: ~5 active, ~3 due-soon, ~2 overdue.
  const d = (offset: number) => formatDateFromToday(offset);
  const nd = (paidOffset: number) => calculateNextDueDate(d(paidOffset), d(paidOffset));

  const demoTenantRecords: TenantRecord[] = [
    buildDemoTenant({
      tenantId: "51201",
      fullName: "Aarav Sharma",
      phone: "9876501201",
      email: "aarav.test@example.com",
      monthlyRent: 8500,
      rentPaid: 8500,
      paidOnDate: d(-20),   // active — due in ~10 days
      nextDueDate: nd(-20),
      createdAt: `${d(-20)}T09:00:00.000Z`,
      assignment: {
        hostelId: DEMO_OWNER_HOSTEL_ID,
        hostelName: "Aurora Residency",
        // (floor removed)
        roomNumber: "101",
        sharingType: "3 sharing",
        moveInDate: d(-20),
      },
    }),
    buildDemoTenant({
      tenantId: "51202",
      fullName: "Diya Patel",
      phone: "9876501202",
      email: "diya.test@example.com",
      monthlyRent: 9000,
      rentPaid: 9000,
      paidOnDate: d(-25),   // due soon — due in ~5 days (yellow)
      nextDueDate: nd(-25),
      createdAt: `${d(-25)}T10:00:00.000Z`,
      assignment: {
        hostelId: DEMO_OWNER_HOSTEL_ID,
        hostelName: "Aurora Residency",
        // (floor removed)
        roomNumber: "101",
        sharingType: "3 sharing",
        moveInDate: d(-25),
      },
    }),
    buildDemoTenant({
      tenantId: "51203",
      fullName: "Kabir Reddy",
      phone: "9876501203",
      email: "kabir.test@example.com",
      monthlyRent: 7800,
      rentPaid: 7800,
      paidOnDate: d(-28),   // due soon — due in ~2 days (orange)
      nextDueDate: nd(-28),
      createdAt: `${d(-28)}T11:00:00.000Z`,
      assignment: {
        hostelId: DEMO_OWNER_HOSTEL_ID,
        hostelName: "Aurora Residency",
// (floor removed)
        roomNumber: "202",
        sharingType: "2 sharing",
        moveInDate: d(-28),
      },
    }),
    buildDemoTenant({
      tenantId: "51204",
      fullName: "Meera Nair",
      phone: "9876501204",
      email: "meera.test@example.com",
      monthlyRent: 9600,
      rentPaid: 9600,
      paidOnDate: d(-34),   // overdue — ~4 days past due (red)
      nextDueDate: nd(-34),
      createdAt: `${d(-34)}T12:00:00.000Z`,
      assignment: {
        hostelId: DEMO_OWNER_HOSTEL_ID,
        hostelName: "Aurora Residency",
// (floor removed)
        roomNumber: "401",
        sharingType: "3 sharing",
        moveInDate: d(-34),
      },
    }),
    buildDemoTenant({
      tenantId: "51205",
      fullName: "Rohan Verma",
      phone: "9876501205",
      email: "rohan.test@example.com",
      monthlyRent: 8200,
      rentPaid: 8200,
      paidOnDate: d(-17),   // active — due in ~13 days
      nextDueDate: nd(-17),
      createdAt: `${d(-17)}T12:00:00.000Z`,
      assignment: {
        hostelId: "owner-hostel-lotus",
        hostelName: "Lotus Elite Stay",
        // (floor removed)
        roomNumber: "101",
        sharingType: "3 sharing",
        moveInDate: d(-17),
      },
    }),
    buildDemoTenant({
      tenantId: "51206",
      fullName: "Sana Khan",
      phone: "9876501206",
      email: "sana.test@example.com",
      monthlyRent: 8800,
      rentPaid: 8800,
      paidOnDate: d(-23),   // active — due in ~7 days
      nextDueDate: nd(-23),
      createdAt: `${d(-23)}T12:00:00.000Z`,
      assignment: {
        hostelId: "owner-hostel-lotus",
        hostelName: "Lotus Elite Stay",
// (floor removed)
        roomNumber: "201",
        sharingType: "3 sharing",
        moveInDate: d(-23),
      },
    }),
    buildDemoTenant({
      tenantId: "51207",
      fullName: "Neha Joshi",
      phone: "9876501207",
      email: "neha.test@example.com",
      monthlyRent: 9100,
      rentPaid: 9100,
      paidOnDate: d(-26),   // due soon — due in ~4 days (yellow)
      nextDueDate: nd(-26),
      createdAt: `${d(-26)}T12:00:00.000Z`,
      assignment: {
        hostelId: "owner-hostel-lotus",
        hostelName: "Lotus Elite Stay",
// (floor removed)
        roomNumber: "402",
        sharingType: "2 sharing",
        moveInDate: d(-26),
      },
    }),
    buildDemoTenant({
      tenantId: "51208",
      fullName: "Arjun Rao",
      phone: "9876501208",
      email: "arjun.test@example.com",
      monthlyRent: 10000,
      rentPaid: 10000,
      paidOnDate: d(-31),   // overdue — ~1 day past due (red)
      nextDueDate: nd(-31),
      createdAt: `${d(-31)}T12:00:00.000Z`,
      assignment: {
        hostelId: "owner-hostel-skyline",
        hostelName: "Skyline Comforts",
        // (floor removed)
        roomNumber: "102",
        sharingType: "2 sharing",
        moveInDate: d(-31),
      },
    }),
    buildDemoTenant({
      tenantId: "51209",
      fullName: "Pooja Singh",
      phone: "9876501209",
      email: "pooja.test@example.com",
      monthlyRent: 9400,
      rentPaid: 9400,
      paidOnDate: d(-15),   // active — due in ~15 days
      nextDueDate: nd(-15),
      createdAt: `${d(-15)}T12:00:00.000Z`,
      assignment: {
        hostelId: "owner-hostel-skyline",
        hostelName: "Skyline Comforts",
// (floor removed)
        roomNumber: "201",
        sharingType: "3 sharing",
        moveInDate: d(-15),
      },
    }),
    buildDemoTenant({
      tenantId: "51210",
      fullName: "Vikram Das",
      phone: "9876501210",
      email: "vikram.test@example.com",
      monthlyRent: 8700,
      rentPaid: 8700,
      paidOnDate: d(-21),   // active — due in ~9 days
      nextDueDate: nd(-21),
      createdAt: `${d(-21)}T12:00:00.000Z`,
      assignment: {
        hostelId: "owner-hostel-skyline",
        hostelName: "Skyline Comforts",
// (floor removed)
        roomNumber: "302",
        sharingType: "2 sharing",
        moveInDate: d(-21),
      },
    }),
    {
      ...buildDemoTenant({
        tenantId: "51211",
        fullName: "Ravi Kumar",
        phone: "9876501211",
        email: "ravi.test@example.com",
        monthlyRent: 300,
        rentPaid: 300,
        paidOnDate: d(-2),   // daily billing — paid 2 days ago, overdue today
        nextDueDate: calculateNextDueDate(d(-2), d(-2), "daily"),
        createdAt: `${d(-2)}T12:00:00.000Z`,
        assignment: {
          hostelId: "owner-hostel-skyline",
          hostelName: "Skyline Comforts",
          roomNumber: "401",
          sharingType: "single",
          moveInDate: d(-2),
        },
      }),
      billingCycle: "daily" as const,
    },
  ];

  return demoTenantRecords.map((tenant) => ({
    ...tenant,
    assignment: tenant.assignment ? { ...tenant.assignment } : undefined,
    paymentHistory: tenant.paymentHistory.map((payment) => ({ ...payment })),
  }));
}

function buildDemoTenant(input: {
  tenantId: string;
  fullName: string;
  phone: string;
  email: string;
  monthlyRent: number;
  rentPaid: number;
  paidOnDate: string;
  nextDueDate: string;
  createdAt: string;
  assignment: TenantAssignment;
}): TenantRecord {
  return {
    tenantId: input.tenantId,
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    monthlyRent: input.monthlyRent,
    rentPaid: input.rentPaid,
    paidOnDate: input.paidOnDate,
    billingAnchorDate: input.assignment?.moveInDate ?? input.paidOnDate,
    nextDueDate: input.nextDueDate,
    idNumber: `TEST-ID-${input.tenantId}`,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    assignment: { ...input.assignment },
    paymentHistory: [
      {
        paymentId: `pay-${input.tenantId}`,
        amount: input.rentPaid,
        paidOnDate: input.paidOnDate,
        nextDueDate: input.nextDueDate,
        status: getDueStatus(input.nextDueDate).tone === "red"
          ? "overdue"
          : getDueStatus(input.nextDueDate).tone === "yellow" || getDueStatus(input.nextDueDate).tone === "orange"
            ? "due-soon"
            : "active",
        paymentMethod: "cash",
        txnId: "",
        proofImageName: "",
        proofImageUrl: "",
        proofMimeType: "",
      },
    ],
  };
}

const TENANTS_DATA_DIR = path.join(process.cwd(), ".data");
const TENANTS_DATA_FILE = path.join(TENANTS_DATA_DIR, "tenants.json");

// Live records — persisted to disk
const tenantRecords: TenantRecord[] = loadTenantRecords();

// ── Demo state ────────────────────────────────────────────────────────────────
// Store demo records on globalThis so ALL Turbopack/Next.js module bundles in the
// same Node.js process share a single array instance.  Without this, each route
// bundle gets its own copy of tenantStore.ts (module duplication) and mutations
// (create/delete) in one bundle are invisible to reads in another bundle.
declare global {
  // eslint-disable-next-line no-var
  var __demoTenantStore: { records: TenantRecord[] } | undefined;
  // eslint-disable-next-line no-var
  var __demoSeedingEnabled: boolean | undefined;
}
if (!globalThis.__demoTenantStore) {
  globalThis.__demoTenantStore = { records: getDemoTenantRecords() };
}
// demoRef.records is the shared, mutable demo array for this process
const demoRef = globalThis.__demoTenantStore;

// Set to false by the test reset endpoint so hostel creation never auto-seeds during tests,
// even when PLAYWRIGHT_TEST env var is absent (reused dev server).
export function disableDemoSeeding() {
  globalThis.__demoSeedingEnabled = false;
}
export function isDemoSeedingEnabled() {
  // Default true (normal demo UX); false only after reset endpoint is called
  return globalThis.__demoSeedingEnabled !== false;
}

function loadTenantRecords() {
  try {
    if (!fs.existsSync(TENANTS_DATA_FILE)) {
      const demo = getDemoTenantRecords();
      persistTenantRecords(demo);
      return demo;
    }

    const fileContent = fs.readFileSync(TENANTS_DATA_FILE, "utf8");
    const parsed = JSON.parse(fileContent) as TenantRecord[];

    // N-09 fix: if file is corrupt/invalid, return demo data WITHOUT overwriting
    // the real file — preserves the original data for manual recovery.
    if (!Array.isArray(parsed)) {
      console.error("[tenantStore] tenants.json is not an array — using demo data as fallback, file preserved.");
      return getDemoTenantRecords();
    }

    return parsed;
  } catch {
    console.error("[tenantStore] tenants.json failed to parse — using demo data as fallback, file preserved.");
    return getDemoTenantRecords();
  }
}

function persistTenantRecords(records: TenantRecord[]) {
  try {
    fs.mkdirSync(TENANTS_DATA_DIR, { recursive: true });
    maybeAutoBackup();
    atomicWrite(TENANTS_DATA_FILE, JSON.stringify(records, null, 2));
  } catch {
    // read-only filesystem — in-memory only
  }
}

export function reloadTenantRecords() {
  const fresh = loadTenantRecords();
  tenantRecords.splice(0, tenantRecords.length, ...fresh);
  return tenantRecords;
}

export function reloadDemoTenantRecords() {
  demoRef.records = getDemoTenantRecords();
  return demoRef.records;
}

function generateUniqueFiveDigitId(records: TenantRecord[]) {
  let nextId = "";

  do {
    nextId = String(Math.floor(10000 + Math.random() * 90000));
  } while (records.some((tenant) => tenant.tenantId === nextId));

  return nextId;
}

function generateTenantIdFromPhone(phone: string, records: TenantRecord[]) {
  const digitsOnly = phone.replace(/\D/g, "");
  const preferredId = digitsOnly.slice(-5);

  if (preferredId.length === 5 && !records.some((tenant) => tenant.tenantId === preferredId)) {
    return preferredId;
  }

  return generateUniqueFiveDigitId(records);
}

export function getTenantRecords(isDemo = false) {
  return isDemo ? demoRef.records : tenantRecords;
}

export function resetTenantRecords(isDemo = false) {
  if (isDemo) {
    demoRef.records = getDemoTenantRecords();
    return demoRef.records;
  }
  tenantRecords.splice(0, tenantRecords.length, ...getDemoTenantRecords());
  persistTenantRecords(tenantRecords);
  return tenantRecords;
}

export function getTenantRecordById(tenantId: string, isDemo = false) {
  const records = isDemo ? demoRef.records : tenantRecords;
  return records.find((tenant) => tenant.tenantId === tenantId);
}

export function getAssignedTenantCount(hostelId: string, roomNumber: string, records: TenantRecord[]) {
  return records.filter(
    (tenant) =>
      tenant.assignment?.hostelId === hostelId &&
      tenant.assignment.roomNumber === roomNumber,
  ).length;
}

function getOccupiedBedIds(hostelId: string, roomNumber: string, records: TenantRecord[], exceptTenantId?: string) {
  return new Set(
    records
      .filter(
        (tenant) =>
          tenant.tenantId !== exceptTenantId &&
          tenant.assignment?.hostelId === hostelId &&
          tenant.assignment.roomNumber === roomNumber &&
          tenant.assignment.bedId,
      )
      .map((tenant) => tenant.assignment?.bedId)
      .filter((bedId): bedId is string => Boolean(bedId)),
  );
}

export function createTenantRecord(input: Omit<TenantRecord, "tenantId" | "createdAt" | "updatedAt" | "paymentHistory"> & { hostelId?: string }, isDemo = false) {
  const records = isDemo ? demoRef.records : tenantRecords;
  const now = new Date().toISOString();
  const status = getDueStatus(input.nextDueDate);
  const tenant: TenantRecord = {
    ...input,
    tenantId: generateTenantIdFromPhone(input.phone, records),
    hostelId: input.hostelId || DEMO_OWNER_HOSTEL_ID,
    createdAt: now,
    updatedAt: now,
    paymentHistory: [
      {
        paymentId: `pay-${crypto.randomUUID()}`,
        amount: input.rentPaid,
        paidOnDate: input.paidOnDate,
        nextDueDate: input.nextDueDate,
        status: status.tone === "green" ? "active" : status.tone === "yellow" || status.tone === "orange" ? "due-soon" : "overdue",
        paymentMethod: "cash",
        txnId: "",
        proofImageName: "",
        proofImageUrl: "",
        proofMimeType: "",
      },
    ],
  };

  // Set initial pendingBalance when rentPaid differs from monthlyRent
  const initialBalance = input.monthlyRent - input.rentPaid;
  if (initialBalance !== 0 && !tenant.pendingBalance) {
    tenant.pendingBalance = {
      amount: initialBalance,
      originalRent: input.monthlyRent,
      partialPaidDate: input.paidOnDate,
    };
  }

  records.unshift(tenant);
  if (!isDemo) persistTenantRecords(tenantRecords);
  return tenant;
}

export function assignTenantRoom(tenantId: string, assignment: Omit<TenantAssignment, "hostelName">, isDemo = false) {
  const records = isDemo ? demoRef.records : tenantRecords;
  const tenant = records.find((item) => item.tenantId === tenantId);

  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  const hostel = getOwnerHostelInventory(records, isDemo).find((item) => item.hostelId === assignment.hostelId);

  if (!hostel) {
    throw new Error("Hostel room inventory not found.");
  }

  // X-10 fix: trim roomNumber on both sides to handle trailing/leading spaces
  if (assignment.roomNumber) {
    assignment.roomNumber = assignment.roomNumber.trim();
  }

  const room = hostel.rooms.find((item) =>
    (assignment.unitId && item.unitId && item.unitId === assignment.unitId) ||
    item.roomNumber.trim() === (assignment.roomNumber ?? "").trim(),
  );

  if (!room) {
    throw new Error("Selected room was not found.");
  }

  const propertyType = hostel.type ?? "PG";
  const currentActiveAssignment = tenant.assignment;

  if (
    currentActiveAssignment &&
    (currentActiveAssignment.hostelId !== assignment.hostelId ||
      currentActiveAssignment.roomNumber !== assignment.roomNumber ||
      currentActiveAssignment.bedId !== assignment.bedId)
  ) {
    throw new Error("Tenant already has an active allocation. Clear the existing assignment before reassigning.");
  }

  if (propertyType === "RESIDENCE") {
    const assignedCount = getAssignedTenantCount(assignment.hostelId, assignment.roomNumber ?? "", records);
    const adjustedCount = currentActiveAssignment ? Math.max(assignedCount - 1, 0) : assignedCount;

    if (adjustedCount >= 1) {
      throw new Error("Selected unit is already occupied.");
    }
  } else {
    const roomBeds = room.beds ?? [];
    const occupiedBedIds = getOccupiedBedIds(assignment.hostelId, assignment.roomNumber ?? "", records, tenantId);

    // Legacy tenants without bedId occupy beds positionally — account for them too
    const legacyTenants = records.filter(
      (t) =>
        t.tenantId !== tenantId &&
        t.assignment?.hostelId === assignment.hostelId &&
        t.assignment?.roomNumber === assignment.roomNumber &&
        !t.assignment?.bedId,
    );
    const allOccupied = new Set(occupiedBedIds);
    let legacyIdx = 0;
    for (const bed of roomBeds) {
      if (legacyIdx >= legacyTenants.length) break;
      if (!allOccupied.has(bed.id)) { allOccupied.add(bed.id); legacyIdx++; }
    }

    const availableBed = assignment.bedId
      ? roomBeds.find((bed) => bed.id === assignment.bedId && !allOccupied.has(bed.id))
      : roomBeds.find((bed) => !allOccupied.has(bed.id));

    if (!availableBed) {
      throw new Error("Selected bed is not available.");
    }

    assignment.bedId = availableBed.id;
    assignment.bedLabel = availableBed.label;
  }

  tenant.assignment = {
    ...assignment,
    hostelName: hostel.hostelName,
    propertyType,
  };

  tenant.billingAnchorDate = assignment.moveInDate ?? tenant.paidOnDate;
  tenant.nextDueDate = calculateNextDueDate(
    tenant.paidOnDate,
    tenant.billingAnchorDate,
    tenant.billingCycle ?? "monthly",
  );

  if (!isDemo) persistTenantRecords(tenantRecords);
  return tenant;
}

export type RecordPaymentOptions = {
  /** Apply a discount this month */
  discountType?: "fixed" | "percent";
  discountValue?: number;
  discountMonths?: number;   // set when first creating a discount; ignored if one is active
  discountNote?: string;
  /** Recording a partial payment — amount < full due rent */
  isPartial?: boolean;
  partialNote?: string;
  deferredTo?: string;       // optional reminder date for balance
  /** Collecting the deferred balance from a previous partial payment */
  isBalanceCollection?: boolean;
  balanceNote?: string;
};

export function recordTenantPayment(
  tenantId: string,
  amount: number,
  paidOnDate: string,
  paymentMethod: "cash" | "online",
  txnId?: string,
  proofImageName?: string,
  proofImageUrl?: string,
  proofMimeType?: string,
  isDemo = false,
  options: RecordPaymentOptions = {},
) {
  const records = isDemo ? demoRef.records : tenantRecords;
  const tenant = records.find((item) => item.tenantId === tenantId);

  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  if (!paidOnDate || Number.isNaN(amount) || amount < 0) {
    throw new Error("Valid payment amount and paid date are required.");
  }

  if (paymentMethod !== "cash" && paymentMethod !== "online") {
    throw new Error("Select a valid payment mode.");
  }

  const {
    discountType,
    discountValue,
    discountMonths,
    discountNote,
    isPartial,
    partialNote,
    deferredTo,
    isBalanceCollection,
    balanceNote,
  } = options;

  // ── Balance collection ─────────────────────────────────────────────────────
  // Owner is collecting the deferred balance from a previous partial payment.
  // This advances the billing cycle because full rent is now settled.
  if (isBalanceCollection && tenant.pendingBalance) {
    const balanceEntry = tenant.pendingBalance;
    tenant.pendingBalance = undefined;
    const nextDueDate = calculateNextDueDate(
      balanceEntry.partialPaidDate, // cycle started on original partial date
      tenant.billingAnchorDate,
      tenant.billingCycle ?? "monthly",
    );
    const status = getDueStatus(nextDueDate, tenant.billingCycle ?? "monthly");
    tenant.rentPaid = amount;
    tenant.paidOnDate = paidOnDate;
    tenant.nextDueDate = nextDueDate;
    tenant.paymentHistory.unshift({
      paymentId: `pay-${tenantId}-${crypto.randomUUID()}`,
      amount,
      paidOnDate,
      nextDueDate,
      status: status.tone === "green" ? "active" : status.tone === "yellow" || status.tone === "orange" ? "due-soon" : "overdue",
      paymentMethod,
      txnId: txnId?.trim() ?? "",
      proofImageName: proofImageName?.trim() ?? "",
      proofImageUrl: proofImageUrl?.trim() ?? "",
      proofMimeType: proofMimeType?.trim() ?? "",
      note: balanceNote?.trim() || `Balance collected for cycle starting ${balanceEntry.partialPaidDate}.`,
    });
    if (tenant.paymentHistory.length > 120) tenant.paymentHistory = tenant.paymentHistory.slice(0, 120);
    if (!isDemo) persistTenantRecords(tenantRecords);
    return tenant;
  }

  // ── Discount handling ──────────────────────────────────────────────────────
  let discountApplied = 0;
  if (discountType && discountValue !== undefined && discountValue > 0) {
    if (!tenant.activeDiscount) {
      // Create new discount
      tenant.activeDiscount = {
        type: discountType,
        value: discountValue,
        monthsTotal: discountMonths ?? 1,
        monthsUsed: 0,
        note: discountNote?.trim() || undefined,
        appliedAt: paidOnDate,
      };
    }
  }

  if (tenant.activeDiscount) {
    const disc = tenant.activeDiscount;
    discountApplied =
      disc.type === "fixed"
        ? Math.min(disc.value, tenant.monthlyRent)  // N-03 fix: cap fixed discount at monthlyRent
        : Math.round((tenant.monthlyRent * disc.value) / 100);
    disc.monthsUsed += 1;
    if (disc.monthsUsed >= disc.monthsTotal) {
      tenant.activeDiscount = undefined; // expired
    }
  }

  // ── Partial payment ────────────────────────────────────────────────────────
  // A partial payment does NOT advance the billing cycle — nextDueDate stays.
  // The deferred balance is stored so the owner can collect it later.
  if (isPartial) {
    const effectiveRent = Math.max(0, tenant.monthlyRent - discountApplied);
    const balanceAmount = Math.max(0, effectiveRent - amount);
    if (balanceAmount > 0) {
      tenant.pendingBalance = {
        amount: balanceAmount,
        originalRent: effectiveRent,
        partialPaidDate: paidOnDate,
        deferredTo: deferredTo || undefined,
        note: partialNote?.trim() || undefined,
      };
    }
    // nextDueDate unchanged — cycle hasn't turned yet
    tenant.rentPaid = amount;
    tenant.paidOnDate = paidOnDate;
    tenant.paymentHistory.unshift({
      paymentId: `pay-${tenantId}-${crypto.randomUUID()}`,
      amount,
      paidOnDate,
      nextDueDate: tenant.nextDueDate, // same due — not yet settled
      status: "due-soon",             // still has a balance
      paymentMethod,
      txnId: txnId?.trim() ?? "",
      proofImageName: proofImageName?.trim() ?? "",
      proofImageUrl: proofImageUrl?.trim() ?? "",
      proofMimeType: proofMimeType?.trim() ?? "",
      isPartial: true,
      discountAmount: discountApplied > 0 ? discountApplied : undefined,
      note: partialNote?.trim() || `Partial payment — ₹${balanceAmount.toLocaleString("en-IN")} balance pending.`,
    });
    if (tenant.paymentHistory.length > 120) tenant.paymentHistory = tenant.paymentHistory.slice(0, 120);
    if (!isDemo) persistTenantRecords(tenantRecords);
    return tenant;
  }

  // ── Normal full payment ────────────────────────────────────────────────────
  // If tenant has a pending balance, auto-reduce it rather than blindly clearing.
  // Payment < pendingBalance.amount → reduce, don't advance cycle.
  // Payment >= pendingBalance.amount → clear and fall through to advance cycle.
  if (tenant.pendingBalance) {
    const newAmount = tenant.pendingBalance.amount - amount;
    if (newAmount > 0) {
      tenant.pendingBalance = { ...tenant.pendingBalance, amount: newAmount };
      tenant.rentPaid = amount;
      tenant.paidOnDate = paidOnDate;
      tenant.paymentHistory.unshift({
        paymentId: `pay-${tenantId}-${crypto.randomUUID()}`,
        amount,
        paidOnDate,
        nextDueDate: tenant.nextDueDate,
        status: "due-soon",
        paymentMethod,
        txnId: txnId?.trim() ?? "",
        proofImageName: proofImageName?.trim() ?? "",
        proofImageUrl: proofImageUrl?.trim() ?? "",
        proofMimeType: proofMimeType?.trim() ?? "",
        discountAmount: discountApplied > 0 ? discountApplied : undefined,
      });
      if (tenant.paymentHistory.length > 120) tenant.paymentHistory = tenant.paymentHistory.slice(0, 120);
      tenant.updatedAt = new Date().toISOString();
      if (!isDemo) persistTenantRecords(tenantRecords);
      return tenant;
    }
    tenant.pendingBalance = undefined;
  }

  const nextDueDate = calculateNextDueDate(
    paidOnDate,
    tenant.billingAnchorDate,
    tenant.billingCycle ?? "monthly",
  );
  const status = getDueStatus(nextDueDate, tenant.billingCycle ?? "monthly");

  tenant.rentPaid = amount;
  tenant.paidOnDate = paidOnDate;
  tenant.nextDueDate = nextDueDate;

  tenant.paymentHistory.unshift({
    paymentId: `pay-${tenantId}-${crypto.randomUUID()}`,
    amount,
    paidOnDate,
    nextDueDate,
    status: status.tone === "green" ? "active" : status.tone === "yellow" || status.tone === "orange" ? "due-soon" : "overdue",
    paymentMethod,
    txnId: txnId?.trim() ?? "",
    proofImageName: proofImageName?.trim() ?? "",
    proofImageUrl: proofImageUrl?.trim() ?? "",
    proofMimeType: proofMimeType?.trim() ?? "",
    discountAmount: discountApplied > 0 ? discountApplied : undefined,
  });

  // Cap history at 120 entries to prevent unbounded growth
  if (tenant.paymentHistory.length > 120) {
    tenant.paymentHistory = tenant.paymentHistory.slice(0, 120);
  }

  if (!isDemo) persistTenantRecords(tenantRecords);
  return tenant;
}

export function removeTenantRecord(tenantId: string, isDemo = false) {
  const records = isDemo ? demoRef.records : tenantRecords;
  const tenantIndex = records.findIndex((item) => item.tenantId === tenantId);

  if (tenantIndex === -1) {
    throw new Error("Tenant not found.");
  }

  const [removedTenant] = records.splice(tenantIndex, 1);
  if (!isDemo) persistTenantRecords(tenantRecords);
  return removedTenant;
}

export function updateTenantProfile(
  tenantId: string,
  patch: Partial<Pick<TenantRecord, "fullName" | "fatherName" | "dateOfBirth" | "phone" | "email" | "idType" | "idNumber" | "emergencyContactName" | "emergencyContactRelation" | "emergencyContactPhone" | "monthlyRent" | "billingCycle" | "paidOnDate" | "occupation" | "workplaceName" | "tenantPhotoUrl" | "idPhotoUrl" | "agreementUrls">>,
  isDemo = false,
) {
  const records = isDemo ? demoRef.records : tenantRecords;
  const tenant = records.find((item) => item.tenantId === tenantId);

  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  Object.assign(tenant, patch);

  if (patch.billingCycle || patch.monthlyRent !== undefined || patch.paidOnDate) {
    // N-14 fix: paidOnDate/billingCycle/monthlyRent change all invalidate the stored nextDueDate
    tenant.nextDueDate = calculateNextDueDate(
      tenant.paidOnDate,
      tenant.billingAnchorDate,
      tenant.billingCycle ?? "monthly",
    );
    // Bug 7 fix: keep paymentHistory[0].nextDueDate in sync when nextDueDate is recalculated
    if (tenant.paymentHistory.length > 0) {
      tenant.paymentHistory[0].nextDueDate = tenant.nextDueDate;
    }
  }

  if (!isDemo) persistTenantRecords(tenantRecords);
  return tenant;
}

export function updateTenantFamilyMembersRecord(tenantId: string, familyMembers: TenantFamilyMember[], isDemo = false) {
  const records = isDemo ? demoRef.records : tenantRecords;
  const tenant = records.find((item) => item.tenantId === tenantId);

  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  tenant.familyMembers = familyMembers;
  if (!isDemo) persistTenantRecords(tenantRecords);
  return tenant;
}

export function addPaymentProof(
  tenantId: string,
  paymentId: string,
  txnId?: string,
  proofImageName?: string,
  proofImageUrl?: string,
  proofMimeType?: string,
  isDemo = false,
) {
  const records = isDemo ? demoRef.records : tenantRecords;
  const tenant = records.find((item) => item.tenantId === tenantId);

  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  const payment = tenant.paymentHistory.find((item) => item.paymentId === paymentId);

  if (!payment) {
    throw new Error("Payment record not found.");
  }

  payment.txnId = txnId?.trim() ?? payment.txnId ?? "";
  payment.proofImageName = proofImageName?.trim() ?? payment.proofImageName ?? "";
  payment.proofImageUrl = proofImageUrl?.trim() ?? payment.proofImageUrl ?? "";
  payment.proofMimeType = proofMimeType?.trim() ?? payment.proofMimeType ?? "";

  if (!isDemo) persistTenantRecords(tenantRecords);
  return tenant;
}

export function seedDemoTenantsForHostel(hostelId: string, isDemo = false) {
  const records = isDemo ? demoRef.records : tenantRecords;
  const hostel = getOwnerHostelInventory(records, isDemo).find((item) => item.hostelId === hostelId);

  if (!hostel) {
    return [];
  }

  const alreadyAssigned = records.some((tenant) => tenant.assignment?.hostelId === hostelId);
  if (alreadyAssigned) {
    return [];
  }

  const availableSlots = hostel.rooms.flatMap((room) =>
    Array.from({ length: room.capacity }, (_, bedIndex) => ({
      unitId: room.unitId,
      roomNumber: room.roomNumber,
      sharingType: room.sharingType ?? `${room.capacity} sharing`,
      propertyType: hostel.type,
      bedId: hostel.type === "PG" ? room.beds?.[bedIndex]?.id : undefined,
      bedLabel: hostel.type === "PG" ? room.beds?.[bedIndex]?.label : undefined,
    })),
  );

  const demoProfiles = [
    {
      fullName: "Aarav Sharma",
      phone: "9876501201",
      email: "aarav.test@example.com",
      monthlyRent: 8500,
      rentPaid: 8500,
      paidOnOffsetDays: -22,
      dueOffsetDays: 8,
    },
    {
      fullName: "Diya Patel",
      phone: "9876501202",
      email: "diya.test@example.com",
      monthlyRent: 9000,
      rentPaid: 9000,
      paidOnOffsetDays: -27,
      dueOffsetDays: 3,
    },
    {
      fullName: "Kabir Reddy",
      phone: "9876501203",
      email: "kabir.test@example.com",
      monthlyRent: 7800,
      rentPaid: 7800,
      paidOnOffsetDays: -31,
      dueOffsetDays: 0,
    },
    {
      fullName: "Meera Nair",
      phone: "9876501204",
      email: "meera.test@example.com",
      monthlyRent: 9600,
      rentPaid: 9600,
      paidOnOffsetDays: -36,
      dueOffsetDays: -4,
    },
  ];

  const seededTenants = demoProfiles.slice(0, availableSlots.length).map((profile, index) => {
    const moveInDate = formatDateFromToday(profile.paidOnOffsetDays);
    const paidOnDate = moveInDate;
    const nextDueDate = formatDateFromToday(profile.dueOffsetDays);
    const slot = availableSlots[index];

    const tenant = createTenantRecord({
      fullName: profile.fullName,
      phone: profile.phone,
      email: profile.email,
      monthlyRent: profile.monthlyRent,
      rentPaid: profile.rentPaid,
      paidOnDate,
      billingAnchorDate: moveInDate,
      nextDueDate,
      idNumber: `TEST-ID-${index + 1}`,
    }, isDemo);

    assignTenantRoom(tenant.tenantId, {
      hostelId,
      unitId: slot.unitId,
      roomNumber: slot.roomNumber,
      sharingType: slot.sharingType,
      moveInDate,
      propertyType: slot.propertyType,
      bedId: slot.bedId,
      bedLabel: slot.bedLabel,
    }, isDemo);

    return tenant;
  });

  return seededTenants;
}

function formatDateFromToday(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
