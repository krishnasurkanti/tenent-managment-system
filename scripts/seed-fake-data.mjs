import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), ".data");
const tenantsFile = path.join(dataDir, "tenants.json");
const hostelsFile = path.join(dataDir, "hostels.json");

function daysFromToday(offset) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function addDays(dateValue, offset) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function addMonthAnchored(dateValue) {
  const paid = new Date(`${dateValue}T00:00:00`);
  const next = new Date(paid.getFullYear(), paid.getMonth() + 1, 1);
  const lastDay = new Date(paid.getFullYear(), paid.getMonth() + 2, 0).getDate();
  next.setDate(Math.min(paid.getDate(), lastDay));
  return next.toISOString().slice(0, 10);
}

function nextDueForCycle(paidOnDate, billingCycle) {
  if (billingCycle === "daily") return addDays(paidOnDate, 1);
  if (billingCycle === "weekly") return addDays(paidOnDate, 7);
  return addMonthAnchored(paidOnDate);
}

function statusForDue(nextDueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${nextDueDate}T00:00:00`);
  const days = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
  return days < 0 ? "overdue" : days <= 3 ? "due-soon" : "active";
}

function tenant(input) {
  const paidOnDate = input.paidOnDate ?? daysFromToday(input.paidOffset);
  const billingCycle = input.billingCycle ?? "monthly";
  const nextDueDate = input.nextDueDate ?? input.nextDueOffset !== undefined
    ? input.nextDueDate ?? daysFromToday(input.nextDueOffset)
    : nextDueForCycle(paidOnDate, billingCycle);
  const status = statusForDue(nextDueDate);
  const createdAt = `${daysFromToday(input.createdOffset)}T09:00:00.000Z`;

  return {
    tenantId: input.tenantId,
    fullName: input.fullName,
    fatherName: input.fatherName,
    dateOfBirth: input.dateOfBirth,
    phone: input.phone,
    email: input.email,
    idType: input.idType,
    idNumber: input.idNumber,
    emergencyContactName: input.emergencyContactName,
    emergencyContactRelation: input.emergencyContactRelation,
    emergencyContactPhone: input.emergencyContactPhone,
    monthlyRent: input.monthlyRent,
    rentPaid: input.rentPaid,
    paidOnDate,
    billingAnchorDate: input.billingAnchorDate ?? paidOnDate,
    nextDueDate,
    billingCycle,
    createdAt,
    updatedAt: createdAt,
    assignment: {
      hostelId: input.hostelId,
      hostelName: input.hostelName,
      floorNumber: input.floorNumber,
      roomNumber: input.roomNumber,
      sharingType: input.sharingType,
      moveInDate: input.moveInDate ?? paidOnDate,
      propertyType: "PG",
      bedId: input.bedId,
      bedLabel: input.bedLabel,
    },
    paymentHistory: [
      {
        paymentId: `pay-${input.tenantId}`,
        amount: input.rentPaid,
        paidOnDate,
        nextDueDate,
        status,
        paymentMethod: input.paymentMethod ?? "cash",
        txnId: input.txnId ?? "",
        proofImageName: "",
        proofImageUrl: "",
        proofMimeType: "",
      },
    ],
  };
}

function createRooms(hostelSlug, floorNumber) {
  return Array.from({ length: 10 }, (_, index) => {
    const roomNumber = `${floorNumber}${String(index + 1).padStart(2, "0")}`;
    const bedCount = index % 3 === 0 ? 3 : 2;
    const unitId = `room-${hostelSlug}-${roomNumber}`;
    return {
      id: unitId,
      unitId,
      roomNumber,
      bedCount,
      sharingType: `${bedCount} sharing`,
      propertyType: "PG",
      beds: Array.from({ length: bedCount }, (_bed, bedIndex) => ({
        id: `${unitId}-bed-${bedIndex + 1}`,
        label: `Bed ${bedIndex + 1}`,
      })),
    };
  });
}

function createDeepHostels() {
  return Array.from({ length: 10 }, (_, index) => {
    const number = index + 1;
    const slug = `deep-owner-${String(number).padStart(2, "0")}`;
    return {
      id: `owner-hostel-${slug}`,
      ownerId: `deep-test-owner-${String(number).padStart(2, "0")}`,
      hostelName: `Deep Test Owner ${String(number).padStart(2, "0")} Hostel`,
      address: `Automation Lane ${number}, Hyderabad`,
      type: "PG",
      createdAt: `2026-04-${String(Math.min(number, 28)).padStart(2, "0")}T10:00:00.000Z`,
      floors: [1].map((floorNumber) => ({
        id: `floor-${slug}-${floorNumber}`,
        floorLabel: `Floor ${floorNumber}`,
        rooms: createRooms(slug, floorNumber),
      })),
    };
  });
}

function createDeepTenants(hostels) {
  const firstNames = [
    "Anika", "Bharat", "Charan", "Devika", "Eshan", "Farah", "Girish", "Harini", "Ishan", "Jaya",
    "Kavin", "Lavanya", "Manav", "Nisha", "Omkar", "Prisha", "Qadir", "Ritika", "Samar", "Tanvi",
    "Uday", "Vidya", "Waseem", "Yamini", "Zara",
  ];
  const cycles = ["monthly", "weekly", "daily"];
  const paidOffsets = [-46, -8, -1, -33, -6, -2, -29, -7, -1, -31, -5, -1];
  const tenants = [];

  hostels.forEach((hostel, hostelIndex) => {
    const tenantCount = hostelIndex % 2 === 0 ? 2 : 3;
    const rooms = hostel.floors[0].rooms;

    for (let index = 0; index < tenantCount; index += 1) {
      const globalIndex = tenants.length;
      const room = rooms[index];
      const bed = room.beds[0];
      const billingCycle = cycles[(hostelIndex + index) % cycles.length];
      const paidOnDate = daysFromToday(paidOffsets[(hostelIndex + index) % paidOffsets.length]);
      const nextDueDate =
        globalIndex % 5 === 0
          ? daysFromToday(12)
          : billingCycle === "monthly" && index === 0
            ? daysFromToday(hostelIndex % 3 === 0 ? -2 : 2)
            : nextDueForCycle(paidOnDate, billingCycle);

      tenants.push(tenant({
        tenantId: `72${String(globalIndex + 1).padStart(3, "0")}`,
        fullName: `${firstNames[globalIndex]} Deep Tenant ${String(globalIndex + 1).padStart(2, "0")}`,
        fatherName: `Guardian ${String(globalIndex + 1).padStart(2, "0")}`,
        dateOfBirth: `199${globalIndex % 10}-0${(globalIndex % 8) + 1}-1${globalIndex % 9}`,
        phone: `98877${String(globalIndex + 1).padStart(5, "0")}`,
        email: `deep.tenant.${String(globalIndex + 1).padStart(2, "0")}@example.test`,
        idType: globalIndex % 3 === 0 ? "aadhar" : globalIndex % 3 === 1 ? "pan" : "driving_licence",
        idNumber: globalIndex % 3 === 0 ? `9000000${String(globalIndex + 1).padStart(5, "0")}` : globalIndex % 3 === 1 ? `ABCDE${String(1000 + globalIndex)}F` : `TS092026${String(globalIndex + 1).padStart(7, "0")}`,
        emergencyContactName: `Emergency ${String(globalIndex + 1).padStart(2, "0")}`,
        emergencyContactRelation: globalIndex % 2 === 0 ? "father" : "friend",
        emergencyContactPhone: `97766${String(globalIndex + 1).padStart(5, "0")}`,
        monthlyRent: billingCycle === "daily" ? 650 : billingCycle === "weekly" ? 4200 : 9000 + (globalIndex % 5) * 500,
        rentPaid: billingCycle === "daily" ? 650 : billingCycle === "weekly" ? 4200 : 9000 + (globalIndex % 5) * 500,
        paidOnDate,
        nextDueDate,
        billingCycle,
        hostelId: hostel.id,
        hostelName: hostel.hostelName,
        floorNumber: 1,
        roomNumber: room.roomNumber,
        sharingType: room.sharingType,
        bedId: bed.id,
        bedLabel: bed.label,
        createdOffset: -90 + globalIndex,
        paymentMethod: globalIndex % 2 === 0 ? "cash" : "online",
        txnId: globalIndex % 2 === 0 ? "" : `DEEPUPI${String(globalIndex + 1).padStart(4, "0")}`,
      }));
    }
  });

  return tenants;
}

const demoTenants = [
  tenant({
    tenantId: "51201",
    fullName: "Aarav Sharma",
    fatherName: "Mahesh Sharma",
    dateOfBirth: "1998-02-12",
    phone: "9876501201",
    email: "aarav.test@example.com",
    idType: "aadhar",
    idNumber: "123412341234",
    emergencyContactName: "Mahesh Sharma",
    emergencyContactRelation: "father",
    emergencyContactPhone: "9876502201",
    monthlyRent: 8500,
    rentPaid: 8500,
    hostelId: "owner-hostel-aurora",
    hostelName: "Aurora Residency",
    floorNumber: 1,
    roomNumber: "101",
    sharingType: "3 sharing",
    bedId: "room-aurora-101-bed-1",
    bedLabel: "Bed 1",
    paidOffset: -36,
    nextDueOffset: -6,
    createdOffset: -70,
  }),
  tenant({
    tenantId: "51202",
    fullName: "Diya Patel",
    fatherName: "Kiran Patel",
    dateOfBirth: "2000-07-21",
    phone: "9876501202",
    email: "diya.test@example.com",
    idType: "pan",
    idNumber: "ABCDE1234F",
    emergencyContactName: "Kiran Patel",
    emergencyContactRelation: "father",
    emergencyContactPhone: "9876502202",
    monthlyRent: 9000,
    rentPaid: 9000,
    hostelId: "owner-hostel-aurora",
    hostelName: "Aurora Residency",
    floorNumber: 1,
    roomNumber: "101",
    sharingType: "3 sharing",
    bedId: "room-aurora-101-bed-2",
    bedLabel: "Bed 2",
    paidOffset: -28,
    nextDueOffset: 2,
    createdOffset: -63,
    paymentMethod: "online",
    txnId: "UPI51202",
  }),
  tenant({
    tenantId: "51203",
    fullName: "Kabir Reddy",
    fatherName: "Suresh Reddy",
    dateOfBirth: "1999-11-03",
    phone: "9876501203",
    email: "kabir.test@example.com",
    idType: "driving_licence",
    idNumber: "TS0920260001234",
    emergencyContactName: "Suresh Reddy",
    emergencyContactRelation: "father",
    emergencyContactPhone: "9876502203",
    monthlyRent: 7800,
    rentPaid: 7800,
    hostelId: "owner-hostel-aurora",
    hostelName: "Aurora Residency",
    floorNumber: 2,
    roomNumber: "202",
    sharingType: "2 sharing",
    bedId: "room-aurora-202-bed-1",
    bedLabel: "Bed 1",
    paidOffset: -18,
    nextDueOffset: 12,
    createdOffset: -51,
  }),
  tenant({
    tenantId: "51204",
    fullName: "Meera Nair",
    fatherName: "Gopal Nair",
    dateOfBirth: "1997-04-09",
    phone: "9876501204",
    email: "meera.test@example.com",
    idType: "aadhar",
    idNumber: "567856785678",
    emergencyContactName: "Gopal Nair",
    emergencyContactRelation: "father",
    emergencyContactPhone: "9876502204",
    monthlyRent: 9600,
    rentPaid: 9600,
    hostelId: "owner-hostel-aurora",
    hostelName: "Aurora Residency",
    floorNumber: 4,
    roomNumber: "401",
    sharingType: "3 sharing",
    bedId: "room-aurora-401-bed-1",
    bedLabel: "Bed 1",
    paidOffset: -40,
    nextDueOffset: -10,
    createdOffset: -90,
  }),
];

const deepHostels = createDeepHostels();
const deepTenants = createDeepTenants(deepHostels);
const tenants = [...demoTenants, ...deepTenants];

fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(tenantsFile, `${JSON.stringify(tenants, null, 2)}\n`, "utf8");
fs.writeFileSync(hostelsFile, `${JSON.stringify(deepHostels, null, 2)}\n`, "utf8");

console.log(`Seeded ${tenants.length} fake tenants into ${tenantsFile}`);
console.log(`Seeded ${deepHostels.length} deep-test hostels into ${hostelsFile}`);
