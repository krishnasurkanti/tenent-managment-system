import { DEMO_OWNER_HOSTEL_ID, getOwnerHostelInventory } from "@/data/ownerHostelStore";
import { calculateNextDueDate, getDueStatus } from "@/lib/payment-utils";
import type { TenantAssignment, TenantRecord } from "@/types/tenant";

function getDemoTenantRecords(): TenantRecord[] {
  const demoTenantRecords: TenantRecord[] = [
  {
    tenantId: "48215",
    fullName: "Rahul Verma",
    phone: "9876543210",
    email: "rahul@suryaresidency.com",
    monthlyRent: 5500,
    rentPaid: 5500,
    paidOnDate: "2026-03-05",
    billingAnchorDate: "2026-03-05",
    nextDueDate: "2026-04-05",
    idNumber: "IGTOS785U",
    idImageName: "rahul-id.png",
    emergencyContact: "9123456780",
    createdAt: "2026-03-05T10:00:00.000Z",
    assignment: {
      hostelId: DEMO_OWNER_HOSTEL_ID,
      hostelName: "Surya Residency",
      floorNumber: 1,
      roomNumber: "101",
      sharingType: "Triple Sharing",
      moveInDate: "2026-03-05",
    },
    paymentHistory: [
      {
        paymentId: "pay-48215-1",
        amount: 5500,
        paidOnDate: "2026-03-05",
        nextDueDate: "2026-04-05",
        status: "due-soon",
        paymentMethod: "online",
        txnId: "TXN48215MARCH",
        proofImageName: "rahul-rent-march.png",
        proofImageUrl: "",
        proofMimeType: "",
      },
    ],
  },
  {
    tenantId: "51724",
    fullName: "Priya Sharma",
    phone: "9988776655",
    email: "priya@suryaresidency.com",
    monthlyRent: 6000,
    rentPaid: 6000,
    paidOnDate: "2026-03-07",
    billingAnchorDate: "2026-03-07",
    nextDueDate: "2026-04-07",
    idNumber: "QWERT456P",
    idImageName: "priya-id.png",
    emergencyContact: "9012345678",
    createdAt: "2026-03-07T11:30:00.000Z",
    assignment: {
      hostelId: DEMO_OWNER_HOSTEL_ID,
      hostelName: "Surya Residency",
      floorNumber: 1,
      roomNumber: "101",
      sharingType: "Triple Sharing",
      moveInDate: "2026-03-07",
    },
    paymentHistory: [
      {
        paymentId: "pay-51724-1",
        amount: 6000,
        paidOnDate: "2026-03-07",
        nextDueDate: "2026-04-07",
        status: "active",
        paymentMethod: "online",
        txnId: "TXN51724MARCH",
        proofImageName: "priya-rent-march.png",
        proofImageUrl: "",
        proofMimeType: "",
      },
    ],
  },
  {
    tenantId: "63481",
    fullName: "Amit Kumar",
    phone: "9090909090",
    email: "amit@suryaresidency.com",
    monthlyRent: 5000,
    rentPaid: 5000,
    paidOnDate: "2026-02-28",
    billingAnchorDate: "2026-02-28",
    nextDueDate: "2026-03-28",
    idNumber: "LKJHG321T",
    idImageName: "amit-id.png",
    emergencyContact: "9876501234",
    createdAt: "2026-02-28T08:45:00.000Z",
    assignment: {
      hostelId: DEMO_OWNER_HOSTEL_ID,
      hostelName: "Surya Residency",
      floorNumber: 1,
      roomNumber: "102",
      sharingType: "Double Sharing",
      moveInDate: "2026-02-28",
    },
    paymentHistory: [
      {
        paymentId: "pay-63481-1",
        amount: 5000,
        paidOnDate: "2026-02-28",
        nextDueDate: "2026-03-28",
        status: "overdue",
        paymentMethod: "cash",
        txnId: "TXN63481FEB",
        proofImageName: "amit-rent-feb.png",
        proofImageUrl: "",
        proofMimeType: "",
      },
    ],
  },
  ];

  return demoTenantRecords.map((tenant) => ({
    ...tenant,
    assignment: tenant.assignment ? { ...tenant.assignment } : undefined,
    paymentHistory: tenant.paymentHistory.map((payment) => ({ ...payment })),
  }));
}

const tenantRecords: TenantRecord[] = getDemoTenantRecords();

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
  return tenant;
}

export function assignTenantRoom(tenantId: string, assignment: Omit<TenantAssignment, "hostelName">) {
  const tenant = tenantRecords.find((item) => item.tenantId === tenantId);

  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  const hostel = getOwnerHostelInventory().find((item) => item.hostelId === assignment.hostelId);

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

  const assignedCount = getAssignedTenantCount(assignment.hostelId, assignment.floorNumber, assignment.roomNumber);

  if (assignedCount >= room.capacity) {
    throw new Error("Selected room is already full.");
  }

  tenant.assignment = {
    ...assignment,
    hostelName: hostel.hostelName,
  };

  tenant.billingAnchorDate = assignment.moveInDate;
  tenant.nextDueDate = calculateNextDueDate(tenant.paidOnDate, tenant.billingAnchorDate);

  if (tenant.paymentHistory[0]) {
    tenant.paymentHistory[0].nextDueDate = tenant.nextDueDate;
  }

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

  return tenant;
}

export function removeTenantRecord(tenantId: string) {
  const tenantIndex = tenantRecords.findIndex((item) => item.tenantId === tenantId);

  if (tenantIndex === -1) {
    throw new Error("Tenant not found.");
  }

  const [removedTenant] = tenantRecords.splice(tenantIndex, 1);
  return removedTenant;
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

  return tenant;
}
