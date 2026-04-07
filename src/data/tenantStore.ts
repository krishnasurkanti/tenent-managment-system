import { getOwnerHostelInventory } from "@/data/ownerHostelStore";
import { calculateNextDueDate, getDueStatus } from "@/lib/payment-utils";
import type { TenantAssignment, TenantRecord } from "@/types/tenant";

function getDemoTenantRecords(): TenantRecord[] {
  const demoTenantRecords: TenantRecord[] = [];

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

export function seedDemoTenantsForHostel(hostelId: string) {
  const hostel = getOwnerHostelInventory().find((item) => item.hostelId === hostelId);

  if (!hostel) {
    return [];
  }

  const alreadyAssigned = tenantRecords.some((tenant) => tenant.assignment?.hostelId === hostelId);
  if (alreadyAssigned) {
    return [];
  }

  const availableSlots = hostel.floors.flatMap((floor) =>
    floor.rooms.flatMap((room) =>
      Array.from({ length: room.capacity }, () => ({
        floorNumber: floor.floorNumber,
        roomNumber: room.roomNumber,
        sharingType: room.sharingType ?? `${room.capacity} sharing`,
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
