const { query } = require("../config/db");
const {
  PLAN_SLABS,
  calculateBill,
  getLiveTenantCount,
  getBillableTenantCount,
  getBillableTenants,
  getOwnerRow,
  getOrCreateCurrentInvoice,
} = require("../services/ownerBillingService");

async function getOwnerBilling(req, res, next) {
  try {
    const ownerId = req.user.ownerId;
    const owner = await getOwnerRow(ownerId);
    if (!owner) return res.status(404).json({ message: "Owner not found." });

    const cycleCountResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE data->>'billingCycle' = 'weekly')::int  AS weekly_count,
         COUNT(*) FILTER (WHERE data->>'billingCycle' = 'daily')::int   AS daily_count,
         COUNT(*) FILTER (WHERE data->>'billingCycle' IS NULL OR data->>'billingCycle' = 'monthly')::int AS monthly_count
       FROM tenants WHERE owner_id = $1 AND deleted_at IS NULL`,
      [ownerId],
    );
    const { weekly_count, daily_count, monthly_count } = cycleCountResult.rows[0] ?? {};

    const hostelCountResult = await query(
      `SELECT COUNT(*)::int AS hostel_count FROM hostels WHERE owner_id = $1`,
      [ownerId],
    );
    const hostelCount = hostelCountResult.rows[0]?.hostel_count ?? 0;

    const cycleStart = owner.billing_cycle_start
      ? new Date(owner.billing_cycle_start).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    const cycleEnd = owner.billing_cycle_end
      ? new Date(owner.billing_cycle_end).toISOString().split("T")[0]
      : null;

    const liveTenants = await getLiveTenantCount(ownerId);

    // Billable count applies 10-day rule; only available when cycle window is known
    const billableList = cycleEnd
      ? await getBillableTenants(ownerId, cycleStart, cycleEnd)
      : [];
    const billableCount = cycleEnd
      ? (owner.billing_tenants_override != null
          ? owner.billing_tenants_override
          : billableList.filter((t) => t.billable).length)
      : liveTenants;

    const effectiveTenants = billableCount;
    const planId = owner.billing_plan_override ?? owner.plan ?? "starter";
    const bill = calculateBill(effectiveTenants, planId, hostelCount);
    const freeMonths = owner.free_months_remaining ?? 0;
    const invoice = await getOrCreateCurrentInvoice(ownerId, owner);
    const displayAmount = freeMonths > 0 ? 0 : bill.total_amount;

    // Check pending upgrade request
    const upgradeResult = await query(
      `SELECT id, requested_plan, status, created_at
       FROM owner_upgrade_requests
       WHERE owner_id = $1 AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [ownerId],
    );
    const pendingUpgrade = upgradeResult.rows[0] ?? null;

    return res.json({
      ownerName: owner.name ?? "",
      ownerId,
      plan: {
        current: planId,
        status: owner.plan_status,
        slabs: PLAN_SLABS,
      },
      billing: {
        cycleStart: owner.billing_cycle_start,
        cycleEnd: owner.billing_cycle_end,
        liveTenantCount: liveTenants,
        billableCount,
        effectiveTenants,
        planLimit: bill.plan_limit,
        extraTenants: bill.extra_tenants,
        baseAmount: bill.base_amount,
        extraCharges: bill.extra_tenants * (bill.extra_per_tenant ?? 0),
        hostelCount,
        hostelLimit: bill.hostel_limit,
        extraHostels: bill.extra_hostels,
        hostelExtraCharges: bill.hostel_extra_charges,
        totalAmount: displayAmount,
        freeMonthsRemaining: freeMonths,
        upgradeSuggested: bill.upgrade_forced,
        nextPlan: bill.next_plan,
      },
      tenantCounts: {
        weekly: weekly_count ?? 0,
        daily: daily_count ?? 0,
        monthly: monthly_count ?? 0,
        total: liveTenants,
      },
      invoice: {
        id: invoice.id,
        status: invoice.status,
        amount: invoice.total_amount,
        cycleStart: invoice.cycle_start,
        cycleEnd: invoice.cycle_end,
        planApplied: invoice.plan_applied,
      },
      autoPayEnabled: owner.auto_pay_enabled,
      upgradePending: Boolean(pendingUpgrade),
      upgradeRequest: pendingUpgrade,
    });
  } catch (error) {
    return next(error);
  }
}

async function setOwnerAutopay(req, res, next) {
  try {
    const ownerId = req.user.ownerId;
    const { enabled } = req.body;
    await query(`UPDATE owners SET auto_pay_enabled = $2 WHERE id = $1`, [ownerId, enabled]);
    return res.json({ autoPayEnabled: enabled });
  } catch (error) {
    return next(error);
  }
}

async function payOwnerInvoice(req, res, next) {
  try {
    const ownerId = req.user.ownerId;
    const owner = await getOwnerRow(ownerId);
    if (!owner) return res.status(404).json({ message: "Owner not found." });

    const invoice = await getOrCreateCurrentInvoice(ownerId, owner);

    // Owners cannot self-mark invoices as paid — payment is confirmed only via
    // Razorpay webhook (payment.captured) or admin action.
    // Return the current invoice state so the frontend can initiate a Razorpay flow.
    return res.json({
      invoice,
      message: "Use the Razorpay payment flow to pay this invoice.",
    });
  } catch (error) {
    return next(error);
  }
}

async function requestUpgrade(req, res, next) {
  try {
    const ownerId = req.user.ownerId;
    const { requestedPlan, note } = req.body;

    const VALID_PLANS = ["free", "starter", "growth", "pro"];
    if (!requestedPlan || !VALID_PLANS.includes(requestedPlan)) {
      return res.status(400).json({ message: "Invalid plan." });
    }

    const owner = await getOwnerRow(ownerId);
    if (!owner) return res.status(404).json({ message: "Owner not found." });

    const currentPlan = owner.plan ?? "free";

    if (currentPlan === requestedPlan) {
      return res.status(400).json({ message: "Already on this plan." });
    }

    // Cancel any stale pending requests for this owner
    await query(
      `UPDATE owner_upgrade_requests SET status = 'superseded' WHERE owner_id = $1 AND status = 'pending'`,
      [ownerId],
    );

    // Create a pending request — admin must approve via /api/admin/billing/upgrade-requests
    const result = await query(
      `INSERT INTO owner_upgrade_requests (owner_id, current_plan, requested_plan, note, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [ownerId, currentPlan, requestedPlan, note?.trim() ?? ""],
    );

    return res.status(202).json({
      ok: true,
      message: "Upgrade request submitted. An admin will review and activate your plan.",
      requestId: result.rows[0].id,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getOwnerBilling, setOwnerAutopay, payOwnerInvoice, requestUpgrade };
