const { query } = require("../config/db");
const { createHttpError } = require("../utils/httpErrors");

function mapHostel(row) {
  return {
    id: String(row.id),
    hostelName: row.name,
    address: row.address || "",
    floors: Array.isArray(row.data?.floors) ? row.data.floors : [],
    createdAt: row.created_at,
  };
}

async function getHostels(req, res) {
  const result = await query(
    `
      SELECT id, owner_id, name, address, data, created_at
      FROM hostels
      WHERE owner_id = $1
      ORDER BY created_at DESC, id DESC
    `,
    [req.user.ownerId],
  );

  return res.json({ hostels: result.rows.map(mapHostel) });
}

async function getHostelById(req, res) {
  const result = await query(
    `
      SELECT id, owner_id, name, address, data, created_at
      FROM hostels
      WHERE id = $1 AND owner_id = $2
      LIMIT 1
    `,
    [req.params.id, req.user.ownerId],
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Hostel not found.");
  }

  return res.json({ hostel: mapHostel(result.rows[0]) });
}

async function createHostel(req, res) {
  const { name, address, floors } = req.validatedBody;

  const result = await query(
    `
      INSERT INTO hostels (owner_id, name, address, data)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING id, owner_id, name, address, data, created_at
    `,
    [req.user.ownerId, name, address, JSON.stringify({ floors })],
  );

  return res.status(201).json({
    message: "Hostel created successfully.",
    hostel: mapHostel(result.rows[0]),
  });
}

async function updateHostel(req, res) {
  const { name, address, floors } = req.validatedBody;

  const result = await query(
    `
      UPDATE hostels
      SET name = $3, address = $4, data = $5::jsonb
      WHERE id = $1 AND owner_id = $2
      RETURNING id, owner_id, name, address, data, created_at
    `,
    [req.params.id, req.user.ownerId, name, address, JSON.stringify({ floors })],
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Hostel not found.");
  }

  return res.json({
    message: "Hostel updated successfully.",
    hostel: mapHostel(result.rows[0]),
  });
}

module.exports = {
  getHostels,
  getHostelById,
  createHostel,
  updateHostel,
};
