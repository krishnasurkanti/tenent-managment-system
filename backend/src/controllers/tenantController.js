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
    tenant: result.rows[0],
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
    tenants: result.rows,
  });
}

module.exports = {
  createTenant,
  getTenants,
};
