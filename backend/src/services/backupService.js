const { query } = require("../config/db");

const TABLES = [
  {
    name: "owners",
    sql: `SELECT id, email, name, username, phone_number, status, plan, plan_status,
                 billing_cycle_start, billing_cycle_end, auto_pay_enabled,
                 free_months_remaining, billing_plan_override, billing_tenants_override,
                 created_at FROM owners`,
  },
  { name: "hostels", sql: `SELECT * FROM hostels` },
  { name: "tenants", sql: `SELECT * FROM tenants WHERE deleted_at IS NULL` },
  { name: "allocations", sql: `SELECT * FROM allocations` },
  { name: "owner_invoices", sql: `SELECT * FROM owner_invoices` },
  { name: "owner_upgrade_requests", sql: `SELECT * FROM owner_upgrade_requests` },
];

async function createBackup(triggeredBy = "auto") {
  const snapshot = {};
  for (const table of TABLES) {
    const result = await query(table.sql);
    snapshot[table.name] = result.rows;
  }

  await query(`DELETE FROM admin_backups WHERE created_at < NOW() - INTERVAL '7 days'`);

  const result = await query(
    `INSERT INTO admin_backups (triggered_by, snapshot)
     VALUES ($1, $2)
     RETURNING id, created_at, triggered_by`,
    [triggeredBy, JSON.stringify(snapshot)],
  );

  console.log(`[backup] id=${result.rows[0].id} triggered_by=${triggeredBy}`);
  return result.rows[0];
}

async function listBackups() {
  const result = await query(
    `SELECT id, triggered_by, created_at,
            octet_length(snapshot::text) AS size_bytes
     FROM admin_backups
     ORDER BY created_at DESC`,
  );
  return result.rows;
}

async function getBackupById(id) {
  const result = await query(
    `SELECT id, triggered_by, created_at, snapshot FROM admin_backups WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

module.exports = { createBackup, listBackups, getBackupById };
