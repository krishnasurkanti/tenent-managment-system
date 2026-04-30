const { query } = require("../config/db");
const {
  PLAN_SLABS,
  calculateBill,
  getLiveTenantCount,
  getOwnerRow,
  getOrCreateCurrentInvoice,
  runInvoiceCycleJob,
} = require("../services/ownerBillingService");
const { createRazorpayOrderForInvoice, processRazorpayWebhook } = require("../services/adminRazorpayService");

async function getAdminOwners(req, res, next) {
  try {
    const owners = await query(
      `SELECT o.id, o.name, o.email, o.phone_number, o.status, o.plan, o.plan_status,
              o.trial_start_date, o.billing_cycle_start, o.billing_cycle_end,
              o.free_months_remaining, o.created_at,
              COUNT(DISTINCT h.id)::int AS hostel_count,
              COUNT(DISTINCT t.id)::int AS tenant_count,
              (SELECT i.id FROM owner_invoices i WHERE i.owner_id = o.id ORDER BY i.created_at DESC LIMIT 1) AS latest_invoice_id,
              (SELECT i.status FROM owner_invoices i WHERE i.owner_id = o.id ORDER BY i.created_at DESC LIMIT 1) AS latest_invoice_status,
              (SELECT i.total_amount FROM owner_invoices i WHERE i.owner_id = o.id ORDER BY i.created_at DESC LIMIT 1) AS latest_invoice_amount
       FROM owners o
       LEFT JOIN hostels h ON h.owner_id = o.id
       LEFT JOIN tenants t ON t.owner_id = o.id
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
    );

    return res.json({ owners: owners.rows, plans: PLAN_SLABS });
  } catch (error) {
    return next(error);
  }
}

async function getOwnerBillingAdmin(req, res, next) {
  try {
    const ownerId = Number(req.params.id);
    if (!Number.isInteger(ownerId) || ownerId <= 0) {
      return res.status(400).json({ message: "Invalid owner id." });
    }

    const owner = await getOwnerRow(ownerId);
    if (!owner) return res.status(404).json({ message: "Owner not found." });

    const liveTenants = await getLiveTenantCount(ownerId);
    const effectiveTenants =
      owner.billing_tenants_override != null ? owner.billing_tenants_override : liveTenants;
    const planId = owner.billing_plan_override ?? owner.plan ?? "starter";
    const bill = calculateBill(effectiveTenants, planId);
    const freeMonths = owner.free_months_remaining ?? 0;
    const invoice = await getOrCreateCurrentInvoice(ownerId, owner);

    const invoiceHistory = await query(
      `SELECT id, cycle_start, cycle_end, effective_tenants, plan_applied,
              extra_tenants, total_amount, status, payment_provider, created_at
       FROM owner_invoices WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 24`,
      [ownerId],
    );

    const hostels = await query(
      `SELECT id, name, address, type, created_at FROM hostels WHERE owner_id = $1 ORDER BY created_at DESC`,
      [ownerId],
    );

    return res.json({
      owner: {
        id: owner.id,
        plan: planId,
        planStatus: owner.plan_status,
        billingCycleStart: owner.billing_cycle_start,
        billingCycleEnd: owner.billing_cycle_end,
        freeMonthsRemaining: freeMonths,
        planOverride: owner.billing_plan_override,
        tenantsOverride: owner.billing_tenants_override,
      },
      billing_preview: {
        live_tenants: liveTenants,
        effective_tenants: effectiveTenants,
        plan_applied: bill.plan_applied,
        plan_limit: bill.plan_limit === Infinity ? null : bill.plan_limit,
        extra_tenants: bill.extra_tenants,
        base_amount: bill.base_amount,
        total_amount: freeMonths > 0 ? 0 : bill.total_amount,
        upgrade_forced: bill.upgrade_forced,
        next_plan: bill.next_plan,
      },
      current_invoice: invoice,
      invoice_history: invoiceHistory.rows,
      hostels: hostels.rows,
    });
  } catch (error) {
    return next(error);
  }
}

async function generateInvoice(req, res, next) {
  try {
    const ownerId = Number(req.body.owner_id);
    if (!Number.isInteger(ownerId) || ownerId <= 0) {
      return res.status(400).json({ message: "Invalid owner_id." });
    }

    const owner = await getOwnerRow(ownerId);
    if (!owner) return res.status(404).json({ message: "Owner not found." });

    const invoice = await getOrCreateCurrentInvoice(ownerId, owner);
    return res.status(201).json({ invoice });
  } catch (error) {
    return next(error);
  }
}

async function overrideBilling(req, res, next) {
  try {
    const ownerId = Number(req.body.owner_id);
    if (!Number.isInteger(ownerId) || ownerId <= 0) {
      return res.status(400).json({ message: "Invalid owner_id." });
    }

    const { effective_tenants, plan, free_months, note } = req.body;
    const updates = [];
    const params = [ownerId];

    if (effective_tenants !== undefined) {
      params.push(Number(effective_tenants));
      updates.push(`billing_tenants_override = $${params.length}`);
    }
    if (plan !== undefined) {
      params.push(plan);
      updates.push(`billing_plan_override = $${params.length}`);
      updates.push(`plan = $${params.length}`);
    }
    if (free_months !== undefined) {
      params.push(Number(free_months));
      updates.push(`free_months_remaining = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update." });
    }

    const result = await query(
      `UPDATE owners SET ${updates.join(", ")} WHERE id = $1 RETURNING id, plan, plan_status, billing_plan_override, billing_tenants_override, free_months_remaining`,
      params,
    );

    if (result.rowCount === 0) return res.status(404).json({ message: "Owner not found." });

    return res.json({ message: "Billing override updated.", owner: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function markInvoicePaid(req, res, next) {
  try {
    const invoiceId = Number(req.body.invoice_id);
    const { status } = req.body;

    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({ message: "Invalid invoice_id." });
    }

    const result = await query(
      `UPDATE owner_invoices SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [invoiceId, status],
    );

    if (result.rowCount === 0) return res.status(404).json({ message: "Invoice not found." });
    return res.json({ invoice: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function createRazorpayOrder(req, res, next) {
  try {
    const invoiceId = Number(req.body.invoice_id);
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({ message: "Invalid invoice_id." });
    }

    const orderPayload = await createRazorpayOrderForInvoice(invoiceId);
    return res.status(201).json(orderPayload);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to create Razorpay order." });
  }
}

async function razorpayWebhook(req, res, next) {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const result = await processRazorpayWebhook(req.body, signature);
    return res.json({ ok: true, result });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Webhook processing failed." });
  }
}

async function getUpgradeRequests(req, res, next) {
  try {
    const requests = await query(
      `SELECT r.id, r.owner_id, o.name AS owner_name, o.email AS owner_email,
              r.current_plan, r.requested_plan, r.note, r.status, r.created_at
       FROM owner_upgrade_requests r
       JOIN owners o ON o.id = r.owner_id
       ORDER BY r.created_at DESC LIMIT 200`,
    );
    return res.json({ requests: requests.rows });
  } catch (error) {
    return next(error);
  }
}

async function decideUpgrade(req, res, next) {
  try {
    const requestId = Number(req.body.request_id);
    const { action } = req.body;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: "Invalid request_id." });
    }

    const existing = await query(
      `SELECT * FROM owner_upgrade_requests WHERE id = $1 LIMIT 1`,
      [requestId],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Upgrade request not found." });
    }
    const request = existing.rows[0];
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Upgrade request already processed." });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    await query(
      `UPDATE owner_upgrade_requests SET status = $2 WHERE id = $1`,
      [requestId, newStatus],
    );

    if (newStatus === "approved") {
      await query(
        `UPDATE owners SET plan = $2, billing_plan_override = NULL WHERE id = $1`,
        [request.owner_id, request.requested_plan],
      );
    }

    return res.json({ message: `Request ${newStatus}.`, request: { ...request, status: newStatus } });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAdminOwners,
  getOwnerBillingAdmin,
  generateInvoice,
  overrideBilling,
  markInvoicePaid,
  createRazorpayOrder,
  razorpayWebhook,
  getUpgradeRequests,
  decideUpgrade,
};
