const { query } = require("../config/db");
const {
  PLAN_SLABS,
  calculateBill,
  getLiveTenantCount,
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
       FROM tenants WHERE owner_id = $1`,
      [ownerId],
    );
    const { weekly_count, daily_count, monthly_count } = cycleCountResult.rows[0] ?? {};

    const liveTenants = await getLiveTenantCount(ownerId);
    const effectiveTenants =
      owner.billing_tenants_override != null ? owner.billing_tenants_override : liveTenants;
    const planId = owner.billing_plan_override ?? owner.plan ?? "starter";
    const bill = calculateBill(effectiveTenants, planId);
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
        effectiveTenants,
        planLimit: bill.plan_limit,
        extraTenants: bill.extra_tenants,
        baseAmount: bill.base_amount,
        extraCharges: bill.extra_tenants * (bill.extra_per_tenant ?? 0),
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
    const { paymentMethod } = req.body;
    const owner = await getOwnerRow(ownerId);
    if (!owner) return res.status(404).json({ message: "Owner not found." });

    const invoice = await getOrCreateCurrentInvoice(ownerId, owner);

    const result = await query(
      `UPDATE owner_invoices
       SET status = 'paid',
           payment_provider = $3,
           payment_note = 'Marked paid by owner.',
           updated_at = NOW()
       WHERE id = $2 AND owner_id = $1
       RETURNING *`,
      [ownerId, invoice.id, paymentMethod === "online" ? "razorpay" : "manual"],
    );

    return res.json({ invoice: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function requestUpgrade(req, res, next) {
  try {
    const ownerId = req.user.ownerId;
    const { requestedPlan, note } = req.body;
    const owner = await getOwnerRow(ownerId);
    if (!owner) return res.status(404).json({ message: "Owner not found." });

    const existing = await query(
      `SELECT id FROM owner_upgrade_requests WHERE owner_id = $1 AND status = 'pending' LIMIT 1`,
      [ownerId],
    );
    if (existing.rowCount > 0) {
      return res.status(400).json({ message: "Upgrade request already pending." });
    }

    const result = await query(
      `INSERT INTO owner_upgrade_requests (owner_id, current_plan, requested_plan, note)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [ownerId, owner.plan ?? "starter", requestedPlan, note?.trim() ?? ""],
    );

    return res.status(201).json({ upgradeRequest: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getOwnerBilling, setOwnerAutopay, payOwnerInvoice, requestUpgrade };
