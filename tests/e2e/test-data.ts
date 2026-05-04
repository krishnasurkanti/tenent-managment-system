import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export function uniqueTenantData(testTitle: string, projectName: string) {
  const seed = `${Date.now()}${Math.floor(Math.random() * 9000)}`;
  const phone = `9${seed.slice(-9)}`;
  const slug = `${projectName}-${testTitle}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);

  return {
    fullName: `Playwright Tenant ${seed.slice(-5)}`,
    parentName: "Automation Parent",
    dateOfBirth: "1999-03-17",
    phone,
    email: `tenant.${slug}.${seed}@example.test`,
    pan: "ABCDE1234F",
    emergencyName: "Automation Contact",
    emergencyPhone: `8${seed.slice(-9)}`,
    monthlyRent: "12345",
    rentPaid: "12000",
    paidOnDate: "2026-05-04",
  };
}

export function uniquePaymentData() {
  const seed = `${Date.now()}${Math.floor(Math.random() * 9000)}`;

  return {
    amount: String(7000 + Number(seed.slice(-3))),
    paidOnDate: "2026-05-04",
    txnId: `PW${seed.slice(-10)}`,
  };
}

export function superAdminCredentials() {
  return {
    username: process.env.SUPER_ADMIN_USERNAME ?? process.env.DEMO_USERNAME ?? "",
    password: process.env.SUPER_ADMIN_PASSWORD ?? process.env.DEMO_PASSWORD ?? "",
  };
}
