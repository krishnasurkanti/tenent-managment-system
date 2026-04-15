const { query } = require("../config/db");
const { createHttpError } = require("../utils/httpErrors");

async function assertHostelOwnership(ownerId, hostelId) {
  const result = await query(
    `
      SELECT id, owner_id, name, created_at
      FROM hostels
      WHERE id = $1 AND owner_id = $2
      LIMIT 1
    `,
    [hostelId, ownerId],
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Hostel not found for this owner.");
  }

  return result.rows[0];
}

async function createTenant(req, res) {
  const { hostel_id: hostelId } = req.validatedBody;
  const ownerId = req.user.ownerId;

  await assertHostelOwnership(ownerId, hostelId);

  const tenantPayload = { ...req.validatedBody };

  const result = await query(
    `
      INSERT INTO tenants (owner_id, hostel_id, data)
      VALUES ($1, $2, $3::jsonb)
      RETURNING id, owner_id, hostel_id, data, created_at
    `,
    [ownerId, hostelId, JSON.stringify(tenantPayload)],
  );

  return res.status(201).json({
    message: "Tenant created successfully.",
    tenant: mapTenantRow(result.rows[0]),
  });
}

async function getTenants(req, res) {
  const { hostel_id: hostelId } = req.validatedQuery;
  const ownerId = req.user.ownerId;

  await assertHostelOwnership(ownerId, hostelId);

  const result = await query(
    `
      SELECT id, owner_id, hostel_id, data, created_at
      FROM tenants
      WHERE owner_id = $1 AND hostel_id = $2
      ORDER BY created_at DESC, id DESC
    `,
    [ownerId, hostelId],
  );

  return res.json({
    hostel_id: hostelId,
    tenants: result.rows.map(mapTenantRow),
  });
}

function mapTenantRow(row) {
  const data = row.data || {};

  return {
    tenantId: String(row.id),
    fullName: data.fullName || "",
    phone: data.phone || "",
    email: data.email || "",
    monthlyRent: Number(data.monthlyRent || 0),
    rentPaid: Number(data.rentPaid || 0),
    paidOnDate: data.paidOnDate || "",
    billingAnchorDate: data.billingAnchorDate || "",
    nextDueDate: data.nextDueDate || "",
    idNumber: data.idNumber || "",
    idImageName: data.idImageName || "",
    emergencyContact: data.emergencyContact || "",
    createdAt: row.created_at,
    assignment: data.assignment || undefined,
    paymentHistory: Array.isArray(data.paymentHistory) ? data.paymentHistory : [],
  };
}

async function getTenantById(req, res) {
  const result = await query(
    `
      SELECT id, owner_id, hostel_id, data, created_at
      FROM tenants
      WHERE id = $1 AND owner_id = $2
      LIMIT 1
    `,
    [req.params.id, req.user.ownerId],
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Tenant not found.");
  }

  return res.json({ tenant: mapTenantRow(result.rows[0]) });
}

async function updateTenant(req, res) {
  const existing = await query(
    `
      SELECT id, owner_id, hostel_id, data, created_at
      FROM tenants
      WHERE id = $1 AND owner_id = $2
      LIMIT 1
    `,
    [req.params.id, req.user.ownerId],
  );

  if (existing.rowCount === 0) {
    throw createHttpError(404, "Tenant not found.");
  }

  const current = existing.rows[0];
  const patch = req.body && typeof req.body === "object" ? req.body : {};
  const nextData = { ...(current.data || {}), ...patch };
  const nextHostelId = patch.hostel_id ?? current.hostel_id;

  await assertHostelOwnership(req.user.ownerId, nextHostelId);

  const result = await query(
    `
      UPDATE tenants
      SET hostel_id = $3, data = $4::jsonb
      WHERE id = $1 AND owner_id = $2
      RETURNING id, owner_id, hostel_id, data, created_at
    `,
    [req.params.id, req.user.ownerId, nextHostelId, JSON.stringify(nextData)],
  );

  return res.json({
    message: "Tenant updated successfully.",
    tenant: mapTenantRow(result.rows[0]),
  });
}

async function deleteTenant(req, res) {
  const result = await query(
    `
      DELETE FROM tenants
      WHERE id = $1 AND owner_id = $2
      RETURNING id, owner_id, hostel_id, data, created_at
    `,
    [req.params.id, req.user.ownerId],
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Tenant not found.");
  }

  return res.json({
    message: "Tenant removed successfully.",
    tenant: mapTenantRow(result.rows[0]),
  });
}

module.exports = {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
};
