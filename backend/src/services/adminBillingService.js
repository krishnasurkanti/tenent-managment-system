const Hostel = require("../models/Hostel");
const Tenant = require("../models/Tenant");
const TenantLog = require("../models/TenantLog");
const Invoice = require("../models/Invoice");

const PLAN_SLABS = [
  { id: "starter", price: 999, limit: 50 },
  { id: "growth", price: 1500, limit: 100 },
  { id: "pro", price: 2000, limit: 150 },
  { id: "scale", price: 3999, limit: 500 },
];

function startOfDayUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addMonthsSameDate(date, months) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function areSameUTCDate(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function choosePlan(tenants) {
  if (tenants <= 50) return PLAN_SLABS[0];
  if (tenants <= 100) return PLAN_SLABS[1];
  if (tenants <= 150) return PLAN_SLABS[2];
  return PLAN_SLABS[3];
}

function getPlan(planId) {
  return PLAN_SLABS.find((plan) => plan.id === planId) || PLAN_SLABS[0];
}

function getNextPlan(planId) {
  const idx = PLAN_SLABS.findIndex((plan) => plan.id === planId);
  return idx >= 0 ? PLAN_SLABS[idx + 1] || null : null;
}

function calculateBill(effectiveTenants, activePlanId) {
  let chosenPlan = activePlanId ? getPlan(activePlanId) : choosePlan(effectiveTenants);
  let nextPlan = getNextPlan(chosenPlan.id);
  let upgradeForced = false;

  // Force step-up until tenants fit within the current plan band.
  while (nextPlan && effectiveTenants >= nextPlan.limit) {
    chosenPlan = nextPlan;
    nextPlan = getNextPlan(chosenPlan.id);
    upgradeForced = true;
  }

  const extraTenants = nextPlan
    ? Math.max(0, effectiveTenants - chosenPlan.limit)
    : Math.max(0, effectiveTenants - chosenPlan.limit);

  const totalAmount = chosenPlan.price + extraTenants * 10;

  return {
    plan_applied: chosenPlan.id,
    extra_tenants: extraTenants,
    total_amount: totalAmount,
    upgrade_forced: upgradeForced,
  };
}

async function trackDailyTenantCounts() {
  const today = startOfDayUTC(new Date());
  const hostels = await Hostel.find({ active: true }).select("_id");

  for (const hostel of hostels) {
    const activeTenantCount = await Tenant.countDocuments({
      hostelId: hostel._id,
      moveInDate: { $lte: today },
      isActive: true,
    });

    await TenantLog.updateOne(
      { hostel_id: hostel._id, date: today },
      { $set: { active_tenant_count: activeTenantCount } },
      { upsert: true },
    );
  }
}

async function getEffectiveTenants(hostelId, cycleStart, cycleEnd) {
  const validEnd = new Date(cycleEnd);
  validEnd.setUTCDate(validEnd.getUTCDate() - 7);

  const logs = await TenantLog.find({
    hostel_id: hostelId,
    date: {
      $gte: startOfDayUTC(cycleStart),
      $lte: startOfDayUTC(validEnd),
    },
  }).select("active_tenant_count");

  return logs.reduce((maxCount, row) => Math.max(maxCount, row.active_tenant_count), 0);
}

async function generateInvoiceForHostel(hostel, { force = false } = {}) {
  const cycleStart = hostel.billing_cycle_start || hostel.join_date || hostel.createdAt || new Date();
  const cycleEnd = hostel.billing_cycle_end || addMonthsSameDate(cycleStart, 1);

  const existing = await Invoice.findOne({
    hostel_id: hostel._id,
    cycle_start: cycleStart,
    cycle_end: cycleEnd,
  });

  if (existing && !force) {
    return existing;
  }

  const overriddenTenants = hostel.billing_override?.effective_tenants;
  const effectiveTenants =
    typeof overriddenTenants === "number"
      ? overriddenTenants
      : await getEffectiveTenants(hostel._id, cycleStart, cycleEnd);

  const activePlan = hostel.billing_override?.plan || hostel.current_plan || null;
  const bill = calculateBill(effectiveTenants, activePlan);

  const finalAmount = hostel.free_months_remaining > 0 ? 0 : bill.total_amount;

  const payload = {
    hostel_id: hostel._id,
    cycle_start: cycleStart,
    cycle_end: cycleEnd,
    effective_tenants: effectiveTenants,
    plan_applied: bill.plan_applied,
    extra_tenants: bill.extra_tenants,
    total_amount: finalAmount,
    status: existing?.status || "pending",
    finalized: true,
  };

  const invoice = await Invoice.findOneAndUpdate(
    { hostel_id: hostel._id, cycle_start: cycleStart, cycle_end: cycleEnd },
    { $set: payload },
    { upsert: true, new: true, runValidators: true },
  );

  hostel.current_plan = bill.plan_applied;
  hostel.billing_cycle_start = cycleEnd;
  hostel.billing_cycle_end = addMonthsSameDate(cycleEnd, 1);
  if (hostel.free_months_remaining > 0) {
    hostel.free_months_remaining -= 1;
  }
  await hostel.save();

  return invoice;
}

async function runInvoiceCycleJob() {
  const today = startOfDayUTC(new Date());
  const hostels = await Hostel.find({ active: true });

  for (const hostel of hostels) {
    const cycleEnd = startOfDayUTC(new Date(hostel.billing_cycle_end || addMonthsSameDate(today, 1)));
    if (areSameUTCDate(cycleEnd, today)) {
      await generateInvoiceForHostel(hostel);
    }
  }
}

async function getAdminHostelBilling(hostelId) {
  const hostel = await Hostel.findById(hostelId).populate("ownerId", "_id name email role");
  if (!hostel) {
    throw new Error("Hostel not found.");
  }

  const [latestInvoice] = await Invoice.find({ hostel_id: hostel._id }).sort({ createdAt: -1 }).limit(1);
  const effectiveTenants = await getEffectiveTenants(hostel._id, hostel.billing_cycle_start, hostel.billing_cycle_end);
  const billPreview = calculateBill(effectiveTenants, hostel.billing_override?.plan || null);

  return {
    hostel,
    billing_preview: {
      effective_tenants: effectiveTenants,
      plan_applied: billPreview.plan_applied,
      extra_tenants: billPreview.extra_tenants,
      total_amount: hostel.free_months_remaining > 0 ? 0 : billPreview.total_amount,
      cycle_start: hostel.billing_cycle_start,
      cycle_end: hostel.billing_cycle_end,
      valid_end: new Date(new Date(hostel.billing_cycle_end).setUTCDate(new Date(hostel.billing_cycle_end).getUTCDate() - 7)),
    },
    latest_invoice: latestInvoice || null,
  };
}

module.exports = {
  PLAN_SLABS,
  calculateBill,
  trackDailyTenantCounts,
  getEffectiveTenants,
  generateInvoiceForHostel,
  runInvoiceCycleJob,
  getAdminHostelBilling,
};
