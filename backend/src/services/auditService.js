const { query } = require("../config/db");

async function logAdminAction({ actor, action, targetType = null, targetId = null, details = {} }) {
  try {
    await query(
      `INSERT INTO admin_audit_log (actor, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [actor, action, targetType, targetId != null ? String(targetId) : null, JSON.stringify(details)],
    );
  } catch (err) {
    // Never let audit failure crash a request — log and continue
    console.error("[audit] Failed to write audit log:", err.message);
  }
}

async function listAuditLog({ limit = 100, offset = 0, actor, targetType, targetId } = {}) {
  const conditions = [];
  const params = [];

  if (actor) { conditions.push(`actor = $${params.push(actor)}`); }
  if (targetType) { conditions.push(`target_type = $${params.push(targetType)}`); }
  if (targetId) { conditions.push(`target_id = $${params.push(String(targetId))}`); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit, offset);

  const result = await query(
    `SELECT id, actor, action, target_type, target_id, details, created_at
     FROM admin_audit_log
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

module.exports = { logAdminAction, listAuditLog };
