const { query, getClient } = require("../config/db");

const PLAN_SLABS = [
  { id: "starter", label: "Starter", price: 999,  limit: 50 },
  { id: "growth",  label: "Growth",  price: 1500, limit: 100 },
  { id: "pro",     label: "Pro",     price: 2000, limit: 150 },
  { id: "scale",   label: "Scale",   price: 2999, limit: Infinity },
];

function getPlan(planId) {
  return PLAN_SLABS.find((p) => p.id === planId) ?? PLAN_SLABS[0];
}

function getNextPlan(planId) {
  const idx = PLAN_SLABS.findIndex((p) => p.id === planId);
  return idx >= 0 ? (PLAN_SLABS[idx + 1] ?? null) : null;
}

function calculateBill(tenantCount, planId) {
  let plan = getPlan(planId);
  let nextPlan = getNextPlan(plan.id);
  let upgradeForced = false;

  while (nextPlan && nextPlan.limit !== Infinity && tenantCount > plan.limit) {
    plan = nextPlan;
    nextPlan = getNextPlan(plan.id);
    upgradeForced = true;
  }

  const extraTenants = plan.limit !== Infinity ? Math.max(0, tenantCount - plan.limit) : 0;
  const totalAmount = plan.price + extraTenants * 10;

  return {
    plan_applied: plan.id,
    plan_label: plan.label,
    plan_limit: plan.limit,
    extra_tenants: extraTenants,
    base_amount: plan.price,
    total_amount: totalAmount,
    upgrade_forced: upgradeForced,
    next_plan: nextPlan
      ? { id: nextPlan.id, label: nextPlan.label, price: nextPlan.price, limit: nextPlan.limit }
      : null,
  };
}

function addOneMonth(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().split("T")[0];
}

async function getOwnerRow(ownerId) {
  const result = await query(
    `SELECT id, plan, plan_status, billing_cycle_start, billing_cycle_end,
            auto_pay_enabled, free_months_remaining,
            billing_plan_override, billing_tenants_override
     FROM owners WHERE id = $1 LIMIT 1`,
    [ownerId],
  );
  return result.rows[0] ?? null;
}

async function getLiveTenantCount(ownerId) {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM tenants WHERE owner_id = $1`,
    [ownerId],
  );
  return result.rows[0]?.count ?? 0;
}

async function getOrCreateCurrentInvoice(ownerId, owner) {
  const cycleStart = owner.billing_cycle_start
    ? new Date(owner.billing_cycle_start).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const existing = await query(
    `SELECT * FROM owner_invoices WHERE owner_id = $1 AND cycle_start = $2 LIMIT 1`,
    [ownerId, cycleStart],
  );
  if (existing.rowCount > 0) return existing.rows[0];

  const tenantCount =
    owner.billing_tenants_override != null
      ? owner.billing_tenants_override
      : await getLiveTenantCount(ownerId);
  const planId = owner.billing_plan_override ?? owner.plan ?? "starter";
  const bill = calculateBill(tenantCount, planId);
  const freeMonths = owner.free_months_remaining ?? 0;
  const totalAmount = freeMonths > 0 ? 0 : bill.total_amount;
  const cycleEnd = owner.billing_cycle_end
    ? new Date(owner.billing_cycle_end).toISOString().split("T")[0]
    : addOneMonth(cycleStart);

  const result = await query(
    `INSERT INTO owner_invoices
       (owner_id, cycle_start, cycle_end, effective_tenants, plan_applied, extra_tenants, total_amount, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
     ON CONFLICT (owner_id, cycle_start) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [ownerId, cycleStart, cycleEnd, tenantCount, bill.plan_applied, bill.extra_tenants, totalAmount],
  );
  return result.rows[0];
}

async function trackDailyTenantCounts() {
  const today = new Date().toISOString().split("T")[0];
  const owners = await query(`SELECT id FROM owners WHERE status = 'active'`);

  for (const row of owners.rows) {
    const count = await getLiveTenantCount(row.id);
    await query(
      `INSERT INTO owner_tenant_logs (owner_id, date, active_tenant_count)
       VALUES ($1, $2, $3)
       ON CONFLICT (owner_id, date) DO UPDATE SET active_tenant_count = EXCLUDED.active_tenant_count`,
      [row.id, today, count],
    );
  }
}

async function runInvoiceCycleJob() {
  const today = new Date().toISOString().split("T")[0];
  const owners = await query(
    `SELECT id, plan, plan_status, billing_cycle_start, billing_cycle_end,
            free_months_remaining, billing_plan_override, billing_tenants_override
     FROM owners
     WHERE status = 'active'
       AND billing_cycle_end IS NOT NULL
       AND billing_cycle_end::date <= $1::date`,
    [today],
  );

  for (const owner of owners.rows) {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      const tenantCount =
        owner.billing_tenants_override != null
          ? owner.billing_tenants_override
          : await getLiveTenantCount(owner.id);
      const planId = owner.billing_plan_override ?? owner.plan ?? "starter";
      const bill = calculateBill(tenantCount, planId);
      const freeMonths = owner.free_months_remaining ?? 0;
      const totalAmount = freeMonths > 0 ? 0 : bill.total_amount;
      const cycleStart = new Date(owner.billing_cycle_start).toISOString().split("T")[0];
      const cycleEnd = new Date(owner.billing_cycle_end).toISOString().split("T")[0];

      await client.query(
        `INSERT INTO owner_invoices
           (owner_id, cycle_start, cycle_end, effective_tenants, plan_applied, extra_tenants, total_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         ON CONFLICT (owner_id, cycle_start) DO UPDATE SET
           effective_tenants = EXCLUDED.effective_tenants,
           plan_applied      = EXCLUDED.plan_applied,
           extra_tenants     = EXCLUDED.extra_tenants,
           total_amount      = EXCLUDED.total_amount,
           updated_at        = NOW()`,
        [owner.id, cycleStart, cycleEnd, tenantCount, bill.plan_applied, bill.extra_tenants, totalAmount],
      );

      const newCycleStart = cycleEnd;
      const newCycleEnd = addOneMonth(cycleEnd);
      const newFreeMonths = Math.max(0, freeMonths - 1);

      await client.query(
        `UPDATE owners SET
           plan                  = $2,
           billing_cycle_start   = $3,
           billing_cycle_end     = $4,
           free_months_remaining = $5
         WHERE id = $1`,
        [owner.id, bill.plan_applied, newCycleStart, newCycleEnd, newFreeMonths],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[billing-job] invoice cycle failed for owner ${owner.id}:`, err.message);
    } finally {
      client.release();
    }
  }
}

module.exports = {
  PLAN_SLABS,
  getPlan,
  calculateBill,
  getLiveTenantCount,
  getOwnerRow,
  getOrCreateCurrentInvoice,
  trackDailyTenantCounts,
  runInvoiceCycleJob,
};
