import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getOwnerHostels } from "@/data/ownerHostelStore";
import { getTenantRecords } from "@/data/tenantStore";
import type { AdminHostelControl, AdminInvoice, AdminLog, AdminPlan, AdminPlanId, BillingBreakdown, PaymentStatus, UpgradeRequest } from "@/types/admin";

const DATA_DIR = path.join(process.cwd(), ".data");
const ADMIN_FILE = path.join(DATA_DIR, "admin-control.json");

const PLANS: AdminPlan[] = [
  { id: "starter", name: "Silver", basePrice: 299, limit: 50 },
  { id: "growth", name: "Gold", basePrice: 799, limit: 150 },
  { id: "pro", name: "Gold", basePrice: 799, limit: 150 },
  { id: "scale", name: "Founding Member", basePrice: 499, limit: 200 },
];

type AdminState = {
  controls: Record<string, AdminHostelControl>;
  invoices: AdminInvoice[];
  upgradeRequests: UpgradeRequest[];
  features: Record<string, boolean>;
  logs: AdminLog[];
};

const defaultState: AdminState = {
  controls: {},
  invoices: [],
  upgradeRequests: [],
  features: {
    advanced_reports: true,
    instant_payouts: false,
    automated_reminders: true,
    bulk_import: true,
  },
  logs: [],
};

const adminState = loadState();
syncHostelControls();

function loadState(): AdminState {
  try {
    if (!fs.existsSync(ADMIN_FILE)) {
      persistState(defaultState);
      return structuredClone(defaultState);
    }

    const parsed = JSON.parse(fs.readFileSync(ADMIN_FILE, "utf8")) as Partial<AdminState>;
    return {
      controls: parsed.controls ?? {},
      invoices: parsed.invoices ?? [],
      upgradeRequests: parsed.upgradeRequests ?? [],
      features: parsed.features ?? defaultState.features,
      logs: parsed.logs ?? [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function persistState(state: AdminState) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // read-only filesystem (Vercel) — in-memory only
  }
}

function syncHostelControls() {
  const hostels = getOwnerHostels();
  for (const hostel of hostels) {
    if (!adminState.controls[hostel.id]) {
      const ownerUsername = `owner_${hostel.id}`.toLowerCase();
      adminState.controls[hostel.id] = {
        hostelId: hostel.id,
        ownerId: `owner-${hostel.id}`,
        ownerName: `Owner ${hostel.hostelName}`,
        ownerEmail: `${hostel.hostelName.toLowerCase().replace(/\s+/g, "")}@owner.example.com`,
        ownerUsername,
        ownerPasswordHash: hashPassword(crypto.randomBytes(24).toString("base64url")),
        failedLoginAttempts: 0,
        lockedUntil: null,
        ownerSuspended: false,
        hostelActive: true,
        planId: "starter",
        pricingOverride: null,
        discountPercent: 0,
        freeMonthsRemaining: 0,
        autoPayEnabled: false,
      };
    }
  }
  persistState(adminState);
}

function getPlan(planId: AdminPlanId) {
  return PLANS.find((plan) => plan.id === planId) ?? PLANS[0];
}

function getNextPlan(planId: AdminPlanId) {
  if (planId === "starter") return getPlan("pro");
  if (planId === "growth") return getPlan("scale");
  if (planId === "pro") return getPlan("scale");
  return null;
}

function getPlanSettings(planId: AdminPlanId) {
  if (planId === "starter") {
    return {
      extraTenantRate: 0,
      includedHostels: 1,
      extraHostelPrice: 250,
    };
  }

  if (planId === "scale") {
    return {
      extraTenantRate: 5,
      includedHostels: 5,
      extraHostelPrice: 250,
    };
  }

  return {
    extraTenantRate: 5,
    includedHostels: 3,
    extraHostelPrice: 250,
  };
}

function getPerHostelSurcharge(hostelId: string, ownerId: string, includedHostels: number, extraHostelPrice: number) {
  const ownerHostels = getOwnerHostels()
    .filter((hostel) => hostel.ownerId === ownerId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const hostelIndex = ownerHostels.findIndex((hostel) => hostel.id === hostelId);

  if (hostelIndex === -1 || hostelIndex < includedHostels) {
    return 0;
  }

  return extraHostelPrice;
}

function isBillableInMonth(joinDate: string, monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(joinDate);
  const joinYear = date.getUTCFullYear();
  const joinMonth = date.getUTCMonth() + 1;
  const joinDay = date.getUTCDate();

  if (joinYear < year || (joinYear === year && joinMonth < month)) return true;
  if (joinYear > year || (joinYear === year && joinMonth > month)) return false;
  return joinDay <= 20;
}

function monthKeyFromDate(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function calculateBilling(hostelId: string, monthKey: string): BillingBreakdown {
  const control = adminState.controls[hostelId];
  const plan = getPlan(control.planId);
  const nextPlan = getNextPlan(plan.id);
  const planSettings = getPlanSettings(plan.id);
  const tenants = getTenantRecords().filter((tenant) => tenant.assignment?.hostelId === hostelId);
  const billableTenantCount = tenants.filter((tenant) => isBillableInMonth(tenant.assignment?.moveInDate ?? tenant.createdAt, monthKey)).length;
  const tenantCount = tenants.length;

  const baseAmount = control.pricingOverride ?? plan.basePrice;
  const extraTenants = Math.max(0, billableTenantCount - plan.limit);
  const extraTenantCharges = extraTenants * planSettings.extraTenantRate;
  const extraHostelCharges = getPerHostelSurcharge(hostelId, control.ownerId, planSettings.includedHostels, planSettings.extraHostelPrice);
  const extraCharges = extraTenantCharges + extraHostelCharges;
  const discountAmount = Math.round((baseAmount + extraCharges) * (control.discountPercent / 100));
  const rawFinal = baseAmount + extraCharges - discountAmount;
  const finalAmount = control.freeMonthsRemaining > 0 ? 0 : Math.max(rawFinal, 0);

  return {
    tenantCount,
    billableTenantCount,
    extraTenants,
    extraCharges,
    baseAmount,
    discountAmount,
    finalAmount,
    upgradeSuggested: nextPlan ? billableTenantCount > plan.limit && plan.id !== "scale" : false,
    blockedAtNextPlan: false,
    nextPlanName: nextPlan?.name ?? null,
  };
}

function addLog(event: string, detail: string) {
  adminState.logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    actor: "super_admin",
    event,
    detail,
  });
  adminState.logs = adminState.logs.slice(0, 200);
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, storedDigest] = storedHash.split(":");
  if (!salt || !storedDigest) return false;
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(storedDigest, "hex"));
}

export function getAdminOverview() {
  syncHostelControls();
  const hostels = getOwnerHostels();
  const monthKey = monthKeyFromDate();
  const previousMonthDate = new Date();
  previousMonthDate.setUTCMonth(previousMonthDate.getUTCMonth() - 1);
  const previousMonthKey = monthKeyFromDate(previousMonthDate);
  const tenants = getTenantRecords();

  const activeHostels = hostels.filter((hostel) => adminState.controls[hostel.id]?.hostelActive).length;
  const inactiveHostels = hostels.length - activeHostels;
  const activeTenants = tenants.filter((tenant) => tenant.assignment).length;
  const monthlyRevenue = hostels.reduce((sum, hostel) => sum + calculateBilling(hostel.id, monthKey).finalAmount, 0);
  const newTenantsThisMonth = tenants.filter((tenant) => {
    const date = new Date(tenant.createdAt);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}` === monthKey;
  }).length;
  const newHostelsThisMonth = hostels.filter((hostel) => hostel.createdAt.slice(0, 7) === monthKey).length;
  const prevNewTenants = tenants.filter((tenant) => {
    const date = new Date(tenant.createdAt);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}` === previousMonthKey;
  }).length;

  return {
    totals: {
      hostels: hostels.length,
      activeTenants,
      monthlyRevenue,
      activeHostels,
      inactiveHostels,
    },
    growth: {
      newTenantsThisMonth,
      newHostelsThisMonth,
      tenantGrowthDelta: newTenantsThisMonth - prevNewTenants,
    },
  };
}

export function getAdminHostels() {
  syncHostelControls();
  const hostels = getOwnerHostels();
  const tenants = getTenantRecords();
  const ownerHostelCount = Object.values(adminState.controls).reduce<Record<string, number>>((acc, control) => {
    acc[control.ownerId] = (acc[control.ownerId] ?? 0) + 1;
    return acc;
  }, {});

  return hostels.map((hostel) => {
    const control = adminState.controls[hostel.id];
    const tenantCount = tenants.filter((tenant) => tenant.assignment?.hostelId === hostel.id).length;
    return {
      hostelId: hostel.id,
      hostelName: hostel.hostelName,
      address: hostel.address,
      createdAt: hostel.createdAt,
      tenantCount,
      owner: {
        ownerId: control.ownerId,
        ownerName: control.ownerName,
        ownerEmail: control.ownerEmail,
        ownerUsername: control.ownerUsername,
        failedLoginAttempts: control.failedLoginAttempts,
        lockedUntil: control.lockedUntil,
        ownerSuspended: control.ownerSuspended,
        ownerHostelCount: ownerHostelCount[control.ownerId] ?? 1,
      },
      status: {
        hostelActive: control.hostelActive,
        planId: control.planId,
      },
    };
  });
}

export function applyHostelAdminAction(hostelId: string, action: "activate" | "deactivate" | "suspend_owner" | "unsuspend_owner" | "delete_hostel" | "reset_owner_password") {
  syncHostelControls();
  const control = adminState.controls[hostelId];
  if (!control) {
    throw new Error("Hostel not found.");
  }

  if (action === "activate") control.hostelActive = true;
  if (action === "deactivate") control.hostelActive = false;
  if (action === "suspend_owner") control.ownerSuspended = true;
  if (action === "unsuspend_owner") control.ownerSuspended = false;
  if (action === "delete_hostel") control.hostelActive = false;
  if (action === "reset_owner_password") {
    control.ownerPasswordHash = hashPassword(crypto.randomBytes(24).toString("base64url"));
    control.failedLoginAttempts = 0;
    control.lockedUntil = null;
    addLog("owner_password_reset", `Password reset triggered for ${control.ownerEmail}`);
  }

  addLog("hostel_action", `${action} on ${control.hostelId}`);
  persistState(adminState);
  return control;
}

export function setOwnerCredentials(hostelId: string, username: string, password: string) {
  syncHostelControls();
  const control = adminState.controls[hostelId];
  if (!control) throw new Error("Hostel not found.");

  const normalized = username.trim().toLowerCase();
  if (!normalized || password.trim().length < 6) {
    throw new Error("Valid username and password (min 6 chars) are required.");
  }

  const usernameTaken = Object.values(adminState.controls).some(
    (item) => item.hostelId !== hostelId && item.ownerUsername.toLowerCase() === normalized,
  );
  if (usernameTaken) throw new Error("Username already assigned to another owner.");

  control.ownerUsername = normalized;
  control.ownerPasswordHash = hashPassword(password.trim());
  control.failedLoginAttempts = 0;
  control.lockedUntil = null;
  addLog("owner_credentials_updated", `Owner credentials updated for ${control.ownerEmail}`);
  persistState(adminState);
  return control;
}

export function resetOwnerLoginFailures(hostelId: string) {
  syncHostelControls();
  const control = adminState.controls[hostelId];
  if (!control) throw new Error("Hostel not found.");
  control.failedLoginAttempts = 0;
  control.lockedUntil = null;
  addLog("owner_login_reset", `Failed-login counter reset for ${control.ownerEmail}`);
  persistState(adminState);
  return control;
}

export function validateOwnerCredentials(username: string, password: string) {
  syncHostelControls();
  const normalized = username.trim().toLowerCase();

  const control = Object.values(adminState.controls).find((item) => item.ownerUsername.toLowerCase() === normalized);

  if (!control) {
    return { ok: false, reason: "invalid" as const };
  }

  if (control.ownerSuspended) {
    return { ok: false, reason: "suspended" as const };
  }

  if (control.lockedUntil && new Date(control.lockedUntil).getTime() > Date.now()) {
    return { ok: false, reason: "locked" as const };
  }

  if (!verifyPassword(password, control.ownerPasswordHash)) {
    control.failedLoginAttempts += 1;
    if (control.failedLoginAttempts >= 5) {
      const until = new Date(Date.now() + 15 * 60 * 1000);
      control.lockedUntil = until.toISOString();
      addLog("owner_login_locked", `${control.ownerEmail} locked after multiple failed attempts`);
    }
    persistState(adminState);
    return { ok: false, reason: "invalid" as const };
  }

  control.failedLoginAttempts = 0;
  control.lockedUntil = null;
  persistState(adminState);
  return { ok: true, ownerId: control.ownerId, hostelId: control.hostelId };
}

export function updateBillingControl(hostelId: string, payload: Partial<Pick<AdminHostelControl, "planId" | "pricingOverride" | "discountPercent" | "freeMonthsRemaining">>) {
  syncHostelControls();
  const control = adminState.controls[hostelId];
  if (!control) throw new Error("Hostel not found.");

  if (payload.planId && PLANS.some((plan) => plan.id === payload.planId)) {
    control.planId = payload.planId;
  }
  if (payload.pricingOverride !== undefined) {
    control.pricingOverride = payload.pricingOverride;
  }
  if (payload.discountPercent !== undefined) {
    control.discountPercent = Math.max(0, Math.min(payload.discountPercent, 100));
  }
  if (payload.freeMonthsRemaining !== undefined) {
    control.freeMonthsRemaining = Math.max(0, payload.freeMonthsRemaining);
  }

  addLog("billing_control_update", `Billing control updated for ${hostelId}`);
  persistState(adminState);
  return control;
}

export function getBillingSummary(monthKey = monthKeyFromDate()) {
  syncHostelControls();
  const hostels = getOwnerHostels();
  return hostels.map((hostel) => {
    const control = adminState.controls[hostel.id];
    const billing = calculateBilling(hostel.id, monthKey);
    return {
      hostelId: hostel.id,
      hostelName: hostel.hostelName,
      plan: getPlan(control.planId),
      control,
      billing,
    };
  });
}

function getDueDateForMonth(monthKey = monthKeyFromDate()) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 28)).toISOString().slice(0, 10);
}

export function getOwnerBilling(hostelId: string, monthKey = monthKeyFromDate()) {
  syncHostelControls();
  const control = adminState.controls[hostelId];
  if (!control) throw new Error("Hostel not found.");

  const hostel = getOwnerHostels().find((item) => item.id === hostelId);
  if (!hostel) throw new Error("Hostel not found.");

  let invoice = adminState.invoices.find((item) => item.hostelId === hostelId && item.monthKey === monthKey);
  if (!invoice) {
    invoice = generateInvoice(hostelId, monthKey);
  }

  const billing = calculateBilling(hostelId, monthKey);
  const accessActive = invoice.paymentStatus === "paid" || billing.finalAmount === 0;
  const pendingRequest = adminState.upgradeRequests.find((item) => item.hostelId === hostelId && item.status === "pending") ?? null;

  return {
    hostelId,
    hostelName: hostel.hostelName,
    monthKey,
    dueDate: getDueDateForMonth(monthKey),
    planId: control.planId,
    autoPayEnabled: control.autoPayEnabled,
    paymentStatus: invoice.paymentStatus,
    accessActive,
    payableAmount: invoice.finalAmount,
    billing,
    upgradePending: Boolean(pendingRequest),
    upgradeRequest: pendingRequest,
  };
}

export function setOwnerAutoPay(hostelId: string, enabled: boolean) {
  syncHostelControls();
  const control = adminState.controls[hostelId];
  if (!control) throw new Error("Hostel not found.");
  control.autoPayEnabled = enabled;
  addLog("owner_autopay_changed", `${hostelId} autoPay set to ${enabled}`);
  persistState(adminState);
  return control;
}

export function ownerPayBilling(hostelId: string, paymentMethod: "online" | "manual", monthKey = monthKeyFromDate()) {
  const invoice = adminState.invoices.find((item) => item.hostelId === hostelId && item.monthKey === monthKey) ?? generateInvoice(hostelId, monthKey);
  invoice.paymentStatus = "paid";
  addLog("owner_billing_paid", `${hostelId} paid via ${paymentMethod}`);
  persistState(adminState);
  return invoice;
}

export function requestPlanUpgrade(hostelId: string, requestedPlanId: AdminPlanId, note = "") {
  syncHostelControls();
  const control = adminState.controls[hostelId];
  if (!control) throw new Error("Hostel not found.");
  const hostel = getOwnerHostels().find((item) => item.id === hostelId);
  if (!hostel) throw new Error("Hostel not found.");

  const existing = adminState.upgradeRequests.find((item) => item.hostelId === hostelId && item.status === "pending");
  if (existing) throw new Error("Upgrade request already pending.");

  const request: UpgradeRequest = {
    requestId: `upg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    hostelId,
    hostelName: hostel.hostelName,
    currentPlanId: control.planId,
    requestedPlanId,
    note: note.trim(),
    status: "pending",
    requestedAt: new Date().toISOString(),
  };
  adminState.upgradeRequests.unshift(request);
  addLog("upgrade_requested", `${hostel.hostelName} requested ${requestedPlanId}`);
  persistState(adminState);
  return request;
}

export function getUpgradeRequests() {
  return adminState.upgradeRequests;
}

export function decideUpgradeRequest(requestId: string, action: "approve" | "reject") {
  const request = adminState.upgradeRequests.find((item) => item.requestId === requestId);
  if (!request) throw new Error("Upgrade request not found.");
  if (request.status !== "pending") throw new Error("Upgrade request already decided.");

  request.status = action === "approve" ? "approved" : "rejected";
  request.decidedAt = new Date().toISOString();

  if (action === "approve") {
    const control = adminState.controls[request.hostelId];
    if (control) {
      control.planId = request.requestedPlanId;
      addLog("upgrade_approved", `${request.hostelName} upgraded to ${request.requestedPlanId}`);
    }
  } else {
    addLog("upgrade_rejected", `${request.hostelName} upgrade rejected`);
  }

  persistState(adminState);
  return request;
}

export function generateInvoice(hostelId: string, monthKey = monthKeyFromDate()) {
  syncHostelControls();
  const control = adminState.controls[hostelId];
  if (!control) throw new Error("Hostel not found.");

  const existing = adminState.invoices.find((item) => item.hostelId === hostelId && item.monthKey === monthKey);
  if (existing) return existing;

  const billing = calculateBilling(hostelId, monthKey);
  const invoice: AdminInvoice = {
    invoiceId: `inv-${hostelId}-${monthKey}`,
    hostelId,
    monthKey,
    planId: control.planId,
    tenantCount: billing.tenantCount,
    billableTenantCount: billing.billableTenantCount,
    extraCharges: billing.extraCharges,
    finalAmount: billing.finalAmount,
    paymentStatus: "pending",
    createdAt: new Date().toISOString(),
  };

  adminState.invoices.unshift(invoice);
  addLog("invoice_generated", `Invoice ${invoice.invoiceId} generated`);
  persistState(adminState);
  return invoice;
}

export function updateInvoiceStatus(invoiceId: string, status: PaymentStatus) {
  const invoice = adminState.invoices.find((item) => item.invoiceId === invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  invoice.paymentStatus = status;
  addLog("invoice_status_changed", `${invoiceId} marked as ${status}`);
  persistState(adminState);
  return invoice;
}

export function getBillingHistory() {
  return adminState.invoices;
}

export function getAdminAnalytics() {
  const hostels = getOwnerHostels();
  const monthKey = monthKeyFromDate();
  const billingRows = getBillingSummary(monthKey);

  const tenantsPerHostel = billingRows.map((row) => ({
    hostelId: row.hostelId,
    hostelName: row.hostelName,
    tenantCount: row.billing.tenantCount,
  }));

  const revenuePerHostel = billingRows.map((row) => ({
    hostelId: row.hostelId,
    hostelName: row.hostelName,
    revenue: row.billing.finalAmount,
  }));

  const mostActiveHostels = [...tenantsPerHostel]
    .sort((a, b) => b.tenantCount - a.tenantCount)
    .slice(0, 5);

  return {
    tenantsPerHostel,
    revenuePerHostel,
    growthTrends: {
      monthKey,
      newHostels: hostels.filter((hostel) => hostel.createdAt.slice(0, 7) === monthKey).length,
      newTenants: getTenantRecords().filter((tenant) => tenant.createdAt.slice(0, 7) === monthKey).length,
    },
    mostActiveHostels,
  };
}

export function getAdminFeatures() {
  return adminState.features;
}

export function setAdminFeature(name: string, enabled: boolean) {
  adminState.features[name] = enabled;
  addLog("feature_toggle", `${name} set to ${enabled}`);
  persistState(adminState);
  return adminState.features;
}

export function getAdminLogs() {
  return adminState.logs;
}

export function getAdminPlans() {
  return PLANS;
}
