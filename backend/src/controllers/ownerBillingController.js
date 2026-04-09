const Hostel = require("../models/Hostel");
const Invoice = require("../models/Invoice");
const UpgradeRequest = require("../models/UpgradeRequest");
const { calculateBill, getEffectiveTenants, generateInvoiceForHostel } = require("../services/adminBillingService");

async function resolveOwnerHostel(ownerId, hostelId) {
  const query = { ownerId };
  if (hostelId) query._id = hostelId;
  const hostel = await Hostel.findOne(query).sort({ createdAt: 1 });
  return hostel;
}

async function getOwnerBilling(req, res, next) {
  try {
    const hostel = await resolveOwnerHostel(req.user.id, req.query.hostelId);
    if (!hostel) return res.status(404).json({ message: "Hostel not found for owner." });

    const effectiveTenants = await getEffectiveTenants(hostel._id, hostel.billing_cycle_start, hostel.billing_cycle_end);
    const bill = calculateBill(effectiveTenants, hostel.current_plan);

    let invoice = await Invoice.findOne({
      hostel_id: hostel._id,
      cycle_start: hostel.billing_cycle_start,
      cycle_end: hostel.billing_cycle_end,
    });
    if (!invoice) {
      invoice = await generateInvoiceForHostel(hostel, { force: true });
    }

    const pendingUpgrade = await UpgradeRequest.findOne({
      ownerId: req.user.id,
      hostelId: hostel._id,
      status: "pending",
    }).sort({ createdAt: -1 });

    return res.json({
      hostelId: hostel._id,
      hostelName: hostel.name,
      planId: hostel.current_plan,
      dueDate: hostel.billing_cycle_end,
      autoPayEnabled: hostel.auto_pay_enabled,
      paymentStatus: invoice.status,
      payableAmount: invoice.total_amount,
      accessActive: invoice.status === "paid" || invoice.total_amount === 0,
      billing: {
        tenantCount: effectiveTenants,
        billableTenantCount: effectiveTenants,
        extraTenants: bill.extra_tenants,
        extraCharges: bill.extra_tenants * 10,
        baseAmount: bill.total_amount - bill.extra_tenants * 10,
        discountAmount: 0,
        finalAmount: invoice.total_amount,
        upgradeSuggested: bill.upgrade_forced,
        blockedAtNextPlan: false,
        nextPlanName: null,
      },
      upgradePending: Boolean(pendingUpgrade),
      upgradeRequest: pendingUpgrade,
    });
  } catch (error) {
    return next(error);
  }
}

async function setOwnerAutopay(req, res, next) {
  try {
    const hostel = await resolveOwnerHostel(req.user.id, null);
    if (!hostel) return res.status(404).json({ message: "Hostel not found for owner." });
    hostel.auto_pay_enabled = req.body.enabled;
    await hostel.save();
    return res.json({ hostelId: hostel._id, autoPayEnabled: hostel.auto_pay_enabled });
  } catch (error) {
    return next(error);
  }
}

async function payOwnerInvoice(req, res, next) {
  try {
    const hostel = await resolveOwnerHostel(req.user.id, null);
    if (!hostel) return res.status(404).json({ message: "Hostel not found for owner." });

    const invoice = await Invoice.findOneAndUpdate(
      {
        hostel_id: hostel._id,
        cycle_start: hostel.billing_cycle_start,
        cycle_end: hostel.billing_cycle_end,
      },
      {
        $set: {
          status: "paid",
          payment_provider: req.body.paymentMethod === "online" ? "razorpay" : "manual",
          payment_note: "Marked paid by owner checkout flow.",
        },
      },
      { new: true },
    );

    if (!invoice) return res.status(404).json({ message: "Invoice not found." });
    return res.json({ invoice });
  } catch (error) {
    return next(error);
  }
}

async function requestUpgrade(req, res, next) {
  try {
    const hostel = await resolveOwnerHostel(req.user.id, null);
    if (!hostel) return res.status(404).json({ message: "Hostel not found for owner." });

    const existing = await UpgradeRequest.findOne({
      ownerId: req.user.id,
      hostelId: hostel._id,
      status: "pending",
    });
    if (existing) return res.status(400).json({ message: "Upgrade request already pending." });

    const request = await UpgradeRequest.create({
      hostelId: hostel._id,
      ownerId: req.user.id,
      currentPlan: hostel.current_plan,
      requestedPlan: req.body.requestedPlan,
      note: req.body.note || "",
    });
    return res.status(201).json({ upgradeRequest: request });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getOwnerBilling,
  setOwnerAutopay,
  payOwnerInvoice,
  requestUpgrade,
};
