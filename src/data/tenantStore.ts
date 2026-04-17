import { DEMO_OWNER_HOSTEL_ID, getOwnerHostelInventory } from "@/data/ownerHostelStore";
import { calculateNextDueDate, getDueStatus } from "@/utils/payment";
import type { TenantAssignment, TenantFamilyMember, TenantRecord } from "@/types/tenant";
import fs from "node:fs";
import path from "node:path";

function getDemoTenantRecords(): TenantRecord[] {
  const demoTenantRecords: TenantRecord[] = [
    buildDemoTenant({
      tenantId: "51201",
      fullName: "Aarav Sharma",
      phone: "9876501201",
      email: "aarav.test@example.com",
      monthlyRent: 8500,
      rentPaid: 8500,
      paidOnDate: "2026-03-15",
      nextDueDate: "2026-04-15",
      emergencyContact: "9876502201",
      createdAt: "2026-03-15T09:00:00.000Z",
      assignment: {
        hostelId: DEMO_OWNER_HOSTEL_ID,
        hostelName: "Aurora Residency",
        floorNumber: 1,
        roomNumber: "101",
        sharingType: "3 sharing",
        moveInDate: "2026-03-15",
      },
    }),
    buildDemoTenant({
      tenantId: "51202",
      fullName: "Diya Patel",
      phone: "9876501202",
      email: "diya.test@example.com",
      monthlyRent: 9000,
      rentPaid: 9000,
      paidOnDate: "2026-03-10",
      nextDueDate: "2026-04-10",
      emergencyContact: "9876502202",
      createdAt: "2026-03-10T10:00:00.000Z",
      assignment: {
        hostelId: DEMO_OWNER_HOSTEL_ID,
        hostelName: "Aurora Residency",
        floorNumber: 1,
        roomNumber: "101",
        sharingType: "3 sharing",
        moveInDate: "2026-03-10",
      },
    }),
    buildDemoTenant({
      tenantId: "51203",
      fullName: "Kabir Reddy",
      phone: "9876501203",
      email: "kabir.test@example.com",
      monthlyRent: 7800,
      rentPaid: 7800,
      paidOnDate: "2026-03-07",
      nextDueDate: "2026-04-07",
      emergencyContact: "9876502203",
      createdAt: "2026-03-07T11:00:00.000Z",
      assignment: {
        hostelId: DEMO_OWNER_HOSTEL_ID,
        hostelName: "Aurora Residency",
        floorNumber: 2,
        roomNumber: "202",
        sharingType: "2 sharing",
        moveInDate: "2026-03-07",
      },
    }),
    buildDemoTenant({
      tenantId: "51204",
      fullName: "Meera Nair",
      phone: "9876501204",
      email: "meera.test@example.com",
      monthlyRent: 9600,
      rentPaid: 9600,
      paidOnDate: "2026-03-01",
      nextDueDate: "2026-04-01",
      emergencyContact: "9876502204",
      createdAt: "2026-03-01T12:00:00.000Z",
      assignment: {
        hostelId: DEMO_OWNER_HOSTEL_ID,
        hostelName: "Aurora Residency",
        floorNumber: 4,
        roomNumber: "401",
        sharingType: "3 sharing",
        moveInDate: "2026-03-01",
      },
    }),
    buildDemoTenant({
      tenantId: "51205",
      fullName: "Rohan Verma",
      phone: "9876501205",
      email: "rohan.test@example.com",
      monthlyRent: 8200,
      rentPaid: 8200,
      paidOnDate: "2026-03-18",
      nextDueDate: "2026-04-18",
      emergencyContact: "9876502205",
      createdAt: "2026-03-18T12:00:00.000Z",
      assignment: {
        hostelId: "owner-hostel-lotus",
        hostelName: "Lotus Elite Stay",
        floorNumber: 1,
        roomNumber: "101",
        sharingType: "3 sharing",
        moveInDate: "2026-03-18",
      },
    }),
    buildDemoTenant({
      tenantId: "51206",
      fullName: "Sana Khan",
      phone: "9876501206",
      email: "sana.test@example.com",
      monthlyRent: 8800,
      rentPaid: 8800,
      paidOnDate: "2026-03-12",
      nextDueDate: "2026-04-12",
      emergencyContact: "9876502206",
      createdAt: "2026-03-12T12:00:00.000Z",
      assignment: {
        hostelId: "owner-hostel-lotus",
        hostelName: "Lotus Elite Stay",
        floorNumber: 2,
        roomNumber: "201",
        sharingType: "3 sharing",
        moveInDate: "2026-03-12",
      },
    }),
    buildDemoTenant({
      tenantId: "51207",
      fullName: "Neha Joshi",
      phone: "9876501207",
      email: "neha.test@example.com",
      monthlyRent: 9100,
      rentPaid: 9100,
      paidOnDate: "2026-03-09",
      nextDueDate: "2026-04-09",
      emergencyContact: "9876502207",
      createdAt: "2026-03-09T12:00:00.000Z",
      assignment: {
        hostelId: "owner-hostel-lotus",
        hostelName: "Lotus Elite Stay",
        floorNumber: 4,
        roomNumber: "402",
        sharingType: "2 sharing",
        moveInDate: "2026-03-09",
      },
    }),
    buildDemoTenant({
      tenantId: "51208",
      fullName: "Arjun Rao",
      phone: "9876501208",
      email: "arjun.test@example.com",
      monthlyRent: 10000,
      rentPaid: 10000,
      paidOnDate: "2026-03-04",
      nextDueDate: "2026-04-04",
      emergencyContact: "9876502208",
      createdAt: "2026-03-04T12:00:00.000Z",
      assignment: {
        hostelId: "owner-hostel-skyline",
        hostelName: "Skyline Comforts",
        floorNumber: 1,
        roomNumber: "102",
        sharingType: "2 sharing",
        moveInDate: "2026-03-04",
      },
    }),
    buildDemoTenant({
      tenantId: "51209",
      fullName: "Pooja Singh",
      phone: "9876501209",
      email: "pooja.test@example.com",
      monthlyRent: 9400,
      rentPaid: 9400,
      paidOnDate: "2026-03-20",
      nextDueDate: "2026-04-20",
      emergencyContact: "9876502209",
      createdAt: "2026-03-20T12:00:00.000Z",
      assignment: {
        hostelId: "owner-hostel-skyline",
        hostelName: "Skyline Comforts",
        floorNumber: 2,
        roomNumber: "201",
        sharingType: "3 sharing",
        moveInDate: "2026-03-20",
      },
    }),
    buildDemoTenant({
      tenantId: "51210",
      fullName: "Vikram Das",
      phone: "9876501210",
      email: "vikram.test@example.com",
      monthlyRent: 8700,
      rentPaid: 8700,
      paidOnDate: "2026-03-14",
      nextDueDate: "2026-04-14",
      emergencyContact: "9876502210",
      createdAt: "2026-03-14T12:00:00.000Z",
      assignment: {
        hostelId: "owner-hostel-skyline",
        hostelName: "Skyline Comforts",
        floorNumber: 3,
        roomNumber: "302",
        sharingType: "2 sharing",
        moveInDate: "2026-03-14",
      },
    }),
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
  emergencyContact: string;
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
    billingAnchorDate: input.assignment.moveInDate,
    nextDueDate: input.nextDueDate,
    idNumber: `TEST-ID-${input.tenantId}`,
    idImageName: "demo-id.png",
    emergencyContact: input.emergencyContact,
    createdAt: input.createdAt,
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

const tenantRecords: TenantRecord[] = loadTenantRecords();

function loadTenantRecords() {
  try {
    if (!fs.existsSync(TENANTS_DATA_FILE)) {
      const demo = getDemoTenantRecords();
      persistTenantRecords(demo);
      return demo;
    }

    const fileContent = fs.readFileSync(TENANTS_DATA_FILE, "utf8");
    const parsed = JSON.parse(fileContent) as TenantRecord[];

    if (!Array.isArray(parsed)) {
      const demo = getDemoTenantRecords();
      persistTenantRecords(demo);
      return demo;
    }

    return parsed;
  } catch {
    return getDemoTenantRecords();
  }
}

function persistTenantRecords(records: TenantRecord[]) {
  fs.mkdirSync(TENANTS_DATA_DIR, { recursive: true });
  fs.writeFileSync(TENANTS_DATA_FILE, JSON.stringify(records, null, 2), "utf8");
}

function generateUniqueFiveDigitId() {
  let nextId = "";

  do {
    nextId = String(Math.floor(10000 + Math.random() * 90000));
  } while (tenantRecords.some((tenant) => tenant.tenantId === nextId));

  return nextId;
}

function generateTenantIdFromPhone(phone: string) {
  const digitsOnly = phone.replace(/\D/g, "");
  const preferredId = digitsOnly.slice(-5);

  if (preferredId.length === 5 && !tenantRecords.some((tenant) => tenant.tenantId === preferredId)) {
    return preferredId;
  }

  return generateUniqueFiveDigitId();
}

export function getTenantRecords() {
  return tenantRecords;
}

export function resetTenantRecords() {
  tenantRecords.splice(0, tenantRecords.length, ...getDemoTenantRecords());
  persistTenantRecords(tenantRecords);
  return tenantRecords;
}

export function getTenantRecordById(tenantId: string) {
  return tenantRecords.find((tenant) => tenant.tenantId === tenantId);
}

export function getAssignedTenantCount(hostelId: string, floorNumber: number, roomNumber: string) {
  return tenantRecords.filter(
    (tenant) =>
      tenant.assignment?.hostelId === hostelId &&
      tenant.assignment.floorNumber === floorNumber &&
      tenant.assignment.roomNumber === roomNumber,
  ).length;
}

function getOccupiedBedIds(hostelId: string, floorNumber: number, roomNumber: string, exceptTenantId?: string) {
  return new Set(
    tenantRecords
      .filter(
        (tenant) =>
          tenant.tenantId !== exceptTenantId &&
          tenant.assignment?.hostelId === hostelId &&
          tenant.assignment.floorNumber === floorNumber &&
          tenant.assignment.roomNumber === roomNumber &&
          tenant.assignment.bedId,
      )
      .map((tenant) => tenant.assignment?.bedId)
      .filter((bedId): bedId is string => Boolean(bedId)),
  );
}

export function createTenantRecord(input: Omit<TenantRecord, "tenantId" | "createdAt" | "paymentHistory">) {
  const status = getDueStatus(input.nextDueDate);
  const tenant: TenantRecord = {
    tenantId: generateTenantIdFromPhone(input.phone),
    createdAt: new Date().toISOString(),
    paymentHistory: [
      {
        paymentId: `pay-${Date.now()}`,
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
    ...input,
  };

  tenantRecords.unshift(tenant);
  persistTenantRecords(tenantRecords);
  return tenant;
}

export function assignTenantRoom(tenantId: string, assignment: Omit<TenantAssignment, "hostelName">) {
  const tenant = tenantRecords.find((item) => item.tenantId === tenantId);

  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  const hostel = getOwnerHostelInventory(tenantRecords).find((item) => item.hostelId === assignment.hostelId);

  if (!hostel) {
    throw new Error("Hostel room inventory not found.");
  }

  const floor = hostel.floors.find((item) => item.floorNumber === assignment.floorNumber);

  if (!floor) {
    throw new Error("Selected floor was not found.");
  }

  const room = floor.rooms.find((item) => item.roomNumber === assignment.roomNumber);

  if (!room) {
    throw new Error("Selected room was not found.");
  }

  const propertyType = hostel.type ?? "PG";
  const currentActiveAssignment = tenant.assignment;

  if (
    currentActiveAssignment &&
    (currentActiveAssignment.hostelId !== assignment.hostelId ||
      currentActiveAssignment.floorNumber !== assignment.floorNumber ||
      currentActiveAssignment.roomNumber !== assignment.roomNumber ||
      currentActiveAssignment.bedId !== assignment.bedId)
  ) {
    throw new Error("Tenant already has an active allocation. Clear the existing assignment before reassigning.");
  }

  if (propertyType === "RESIDENCE") {
    const assignedCount = getAssignedTenantCount(assignment.hostelId, assignment.floorNumber, assignment.roomNumber);
    const adjustedCount = currentActiveAssignment ? Math.max(assignedCount - 1, 0) : assignedCount;

    if (adjustedCount >= 1) {
      throw new Error("Selected unit is already occupied.");
    }
  } else {
    const roomBeds = room.beds ?? [];
    const occupiedBedIds = getOccupiedBedIds(assignment.hostelId, assignment.floorNumber, assignment.roomNumber, tenantId);
    const availableBed = assignment.bedId
      ? roomBeds.find((bed) => bed.id === assignment.bedId && !occupiedBedIds.has(bed.id))
      : roomBeds.find((bed) => !occupiedBedIds.has(bed.id));

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

  tenant.billingAnchorDate = assignment.moveInDate;
  tenant.nextDueDate = calculateNextDueDate(tenant.paidOnDate, tenant.billingAnchorDate);

  if (tenant.paymentHistory[0]) {
    tenant.paymentHistory[0].nextDueDate = tenant.nextDueDate;
  }

  persistTenantRecords(tenantRecords);
  return tenant;
}

export function recordTenantPayment(
  tenantId: string,
  amount: number,
  paidOnDate: string,
  paymentMethod: "cash" | "online",
  txnId?: string,
  proofImageName?: string,
  proofImageUrl?: string,
  proofMimeType?: string,
) {
  const tenant = tenantRecords.find((item) => item.tenantId === tenantId);

  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  if (!paidOnDate || Number.isNaN(amount) || amount < 0) {
    throw new Error("Valid payment amount and paid date are required.");
  }

  if (paymentMethod !== "cash" && paymentMethod !== "online") {
    throw new Error("Select a valid payment mode.");
  }

  const nextDueDate = calculateNextDueDate(paidOnDate, tenant.billingAnchorDate);
  const status = getDueStatus(nextDueDate);

  tenant.rentPaid = amount;
  tenant.paidOnDate = paidOnDate;
  tenant.nextDueDate = nextDueDate;

  tenant.paymentHistory.unshift({
    paymentId: `pay-${tenantId}-${Date.now()}`,
    amount,
    paidOnDate,
    nextDueDate,
    status: status.tone === "green" ? "active" : status.tone === "yellow" || status.tone === "orange" ? "due-soon" : "overdue",
    paymentMethod,
    txnId: txnId?.trim() ?? "",
    proofImageName: proofImageName?.trim() ?? "",
    proofImageUrl: proofImageUrl?.trim() ?? "",
    proofMimeType: proofMimeType?.trim() ?? "",
  });

  persistTenantRecords(tenantRecords);
  return tenant;
}

export function removeTenantRecord(tenantId: string) {
  const tenantIndex = tenantRecords.findIndex((item) => item.tenantId === tenantId);

  if (tenantIndex === -1) {
    throw new Error("Tenant not found.");
  }

  const [removedTenant] = tenantRecords.splice(tenantIndex, 1);
  persistTenantRecords(tenantRecords);
  return removedTenant;
}

export function updateTenantFamilyMembersRecord(tenantId: string, familyMembers: TenantFamilyMember[]) {
  const tenant = tenantRecords.find((item) => item.tenantId === tenantId);

  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  tenant.familyMembers = familyMembers;
  persistTenantRecords(tenantRecords);
  return tenant;
}

export function addPaymentProof(
  tenantId: string,
  paymentId: string,
  txnId?: string,
  proofImageName?: string,
  proofImageUrl?: string,
  proofMimeType?: string,
) {
  const tenant = tenantRecords.find((item) => item.tenantId === tenantId);

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

  persistTenantRecords(tenantRecords);
  return tenant;
}

export function seedDemoTenantsForHostel(hostelId: string) {
  const hostel = getOwnerHostelInventory(tenantRecords).find((item) => item.hostelId === hostelId);

  if (!hostel) {
    return [];
  }

  const alreadyAssigned = tenantRecords.some((tenant) => tenant.assignment?.hostelId === hostelId);
  if (alreadyAssigned) {
    return [];
  }

  const availableSlots = hostel.floors.flatMap((floor) =>
    floor.rooms.flatMap((room) =>
      Array.from({ length: room.capacity }, (_, bedIndex) => ({
        floorNumber: floor.floorNumber,
        roomNumber: room.roomNumber,
        sharingType: room.sharingType ?? `${room.capacity} sharing`,
        propertyType: hostel.type,
        bedId: hostel.type === "PG" ? room.beds?.[bedIndex]?.id : undefined,
        bedLabel: hostel.type === "PG" ? room.beds?.[bedIndex]?.label : undefined,
      })),
    ),
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
      emergencyContact: `98765022${String(index + 1).padStart(2, "0")}`,
      idImageName: "demo-id.png",
    });

    assignTenantRoom(tenant.tenantId, {
      hostelId,
      floorNumber: slot.floorNumber,
      roomNumber: slot.roomNumber,
      sharingType: slot.sharingType,
      moveInDate,
      propertyType: slot.propertyType,
      bedId: slot.bedId,
      bedLabel: slot.bedLabel,
    });

    return tenant;
  });

  return seededTenants;
}

function formatDateFromToday(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
