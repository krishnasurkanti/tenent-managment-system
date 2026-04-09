const Hostel = require("../models/Hostel");
const Invoice = require("../models/Invoice");
const UpgradeRequest = require("../models/UpgradeRequest");
const { PLAN_SLABS, generateInvoiceForHostel, getAdminHostelBilling } = require("../services/adminBillingService");
const { createRazorpayOrderForInvoice, processRazorpayWebhook } = require("../services/adminRazorpayService");

async function getAdminHostels(req, res, next) {
  try {
    const hostels = await Hostel.find({})
      .populate("ownerId", "_id name email role")
      .sort({ createdAt: -1 });

    const mapped = await Promise.all(
      hostels.map(async (hostel) => {
        const invoiceCount = await Invoice.countDocuments({ hostel_id: hostel._id });
        return {
          id: hostel._id,
          name: hostel.name,
          owner: hostel.ownerId,
          join_date: hostel.join_date,
          current_plan: hostel.current_plan,
          billing_cycle_start: hostel.billing_cycle_start,
          billing_cycle_end: hostel.billing_cycle_end,
          active: hostel.active,
          invoice_count: invoiceCount,
        };
      }),
    );

    return res.json({ hostels: mapped, plans: PLAN_SLABS });
  } catch (error) {
    return next(error);
  }
}

async function getHostelBilling(req, res, next) {
  try {
    const payload = await getAdminHostelBilling(req.params.id);
    return res.json(payload);
  } catch (error) {
    if (error.message === "Hostel not found.") {
      return res.status(404).json({ message: error.message });
    }
    return next(error);
  }
}

async function generateInvoice(req, res, next) {
  try {
    const { hostel_id } = req.body;
    if (!hostel_id) {
      return res.status(400).json({ message: "hostel_id is required." });
    }

    const hostel = await Hostel.findById(hostel_id);
    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found." });
    }

    const invoice = await generateInvoiceForHostel(hostel, { force: true });
    return res.status(201).json({ invoice });
  } catch (error) {
    return next(error);
  }
}

async function overrideBilling(req, res, next) {
  try {
    const { hostel_id, effective_tenants, plan, free_months, note } = req.body;
    if (!hostel_id) {
      return res.status(400).json({ message: "hostel_id is required." });
    }

    const hostel = await Hostel.findById(hostel_id);
    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found." });
    }

    if (effective_tenants !== undefined) {
      if (Number.isNaN(Number(effective_tenants)) || Number(effective_tenants) < 0) {
        return res.status(400).json({ message: "effective_tenants must be a positive number." });
      }
      hostel.billing_override.effective_tenants = Number(effective_tenants);
    }

    if (plan !== undefined) {
      if (!PLAN_SLABS.some((item) => item.id === plan)) {
        return res.status(400).json({ message: "Invalid plan value." });
      }
      hostel.billing_override.plan = plan;
    }

    if (typeof note === "string") {
      hostel.billing_override.note = note.trim();
    }

    if (free_months !== undefined) {
      if (Number.isNaN(Number(free_months)) || Number(free_months) < 0) {
        return res.status(400).json({ message: "free_months must be a positive number." });
      }
      hostel.free_months_remaining = Number(free_months);
    }

    await hostel.save();
    return res.json({ message: "Billing override updated.", hostel });
  } catch (error) {
    return next(error);
  }
}

async function markInvoicePaid(req, res, next) {
  try {
    const { invoice_id, status } = req.body;
    if (!invoice_id) {
      return res.status(400).json({ message: "invoice_id is required." });
    }

    if (!["paid", "pending"].includes(status)) {
      return res.status(400).json({ message: "status must be paid or pending." });
    }

    const invoice = await Invoice.findByIdAndUpdate(
      invoice_id,
      { status },
      { new: true, runValidators: true },
    );

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    return res.json({ invoice });
  } catch (error) {
    return next(error);
  }
}

async function createRazorpayOrder(req, res, next) {
  try {
    const { invoice_id } = req.body;
    if (!invoice_id) {
      return res.status(400).json({ message: "invoice_id is required." });
    }

    const orderPayload = await createRazorpayOrderForInvoice(invoice_id);
    return res.status(201).json(orderPayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create Razorpay order.";
    return res.status(400).json({ message });
  }
}

async function razorpayWebhook(req, res, next) {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const result = await processRazorpayWebhook(req.body, signature);
    return res.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    return res.status(400).json({ message });
  }
}

async function getUpgradeRequests(req, res, next) {
  try {
    const requests = await UpgradeRequest.find({}).sort({ createdAt: -1 }).limit(200);
    return res.json({ requests });
  } catch (error) {
    return next(error);
  }
}

async function decideUpgrade(req, res, next) {
  try {
    const { request_id, action } = req.body;
    if (!request_id || !action) {
      return res.status(400).json({ message: "request_id and action are required." });
    }

    const request = await UpgradeRequest.findById(request_id);
    if (!request) {
      return res.status(404).json({ message: "Upgrade request not found." });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Upgrade request already processed." });
    }

    request.status = action === "approve" ? "approved" : "rejected";
    await request.save();

    if (request.status === "approved") {
      await Hostel.findByIdAndUpdate(request.hostelId, { current_plan: request.requestedPlan });
    }

    return res.json({ request });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAdminHostels,
  getHostelBilling,
  generateInvoice,
  overrideBilling,
  markInvoicePaid,
  createRazorpayOrder,
  razorpayWebhook,
  getUpgradeRequests,
  decideUpgrade,
};
