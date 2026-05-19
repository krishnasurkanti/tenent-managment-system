import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ── seed counter so parallel tests never collide ──────────────────────────────
let _seq = 0;
function seq() { return String(Date.now()).slice(-6) + String(++_seq).padStart(3, "0"); }

// ── tenant ────────────────────────────────────────────────────────────────────

export function uniqueTenantData(testTitle = "", projectName = "") {
  const seed = seq();
  const phone = `9${seed}0`.slice(0, 10);
  const slug = `${projectName}-${testTitle}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);

  return {
    fullName: `PW Tenant ${seed}`,
    parentName: "Test Parent",
    dateOfBirth: "1998-06-15",
    phone,
    email: `pw.${slug}.${seed}@example.test`,
    pan: "ABCDE1234F",
    idType: "pan",
    idNumber: `TEST-${seed}`,
    occupation: "employed",
    workplaceName: "Playwright Corp",
    emergencyName: "Emergency Contact",
    emergencyRelation: "father",
    emergencyPhone: `8${seed}0`.slice(0, 10),
    monthlyRent: "8500",
    rentPaid: "8500",
    paidOnDate: "2026-05-01",
    billingCycle: "monthly",
  };
}

export function uniquePaymentData() {
  const seed = seq();
  return {
    amount: String(6000 + Number(seed.slice(-3))),
    paidOnDate: new Date().toISOString().slice(0, 10),
    txnId: `PW${seed}`,
  };
}

export function uniqueHostelData() {
  const seed = seq();
  return {
    name: `PW Hostel ${seed}`,
    address: `${seed} Test Road, Playwright City`,
  };
}

export function uniqueRoomData(index = 1) {
  return {
    roomNumber: `PW${index}${seq().slice(-3)}`,
    bedCount: String(index % 3 + 1), // 1, 2, or 3 beds
  };
}

export function superAdminCredentials() {
  return {
    username: process.env.SUPER_ADMIN_USERNAME ?? process.env.DEMO_USERNAME ?? "",
    password: process.env.SUPER_ADMIN_PASSWORD ?? process.env.DEMO_PASSWORD ?? "",
  };
}

export function ownerCredentials(index = 0) {
  const owners = [
    { email: "arjun@demo.com", phone: "9000000001", password: "Demo@1234", name: "Arjun Sharma" },
    { email: "priya@demo.com", phone: "9000000002", password: "Demo@1234", name: "Priya Mehta" },
    { email: "ramesh@demo.com", phone: "9000000003", password: "Demo@1234", name: "Ramesh Yadav" },
    { email: "sunita@demo.com", phone: "9000000004", password: "Demo@1234", name: "Sunita Reddy" },
    { email: "vikram@demo.com", phone: "9000000005", password: "Demo@1234", name: "Vikram Nair" },
  ];
  return owners[index % owners.length];
}

// Minimal 1×1 transparent PNG — used for photo upload tests
export const TINY_PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

// Ten-day simulation: 10 owner profiles with hostel + room + tenant plan
export function simulationPlan() {
  const owners = Array.from({ length: 10 }, (_, i) => {
    const id = seq();
    const cycle = (["monthly", "weekly", "daily"] as const)[i % 3];
    return {
      ownerSeed: id,
      hostelName: `Sim Hostel ${id}`,
      address: `${i + 1} Sim Street`,
      rooms: [
        { roomNumber: `S${i}01`, bedCount: 2 },
        { roomNumber: `S${i}02`, bedCount: 3 },
      ],
      tenants: Array.from({ length: 5 }, (_, j) => ({
        fullName: `Sim Owner${i} Tenant${j} ${seq()}`,
        phone: `7${id.slice(0, 3)}${j}${id.slice(3, 6)}`.slice(0, 10),
        monthlyRent: 5000 + i * 500 + j * 100,
        billingCycle: cycle,
        paidOnDate: (() => {
          const d = new Date("2026-05-01");
          d.setDate(d.getDate() - j * 3); // staggered join dates
          return d.toISOString().slice(0, 10);
        })(),
      })),
    };
  });
  return owners;
}
