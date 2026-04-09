const { query } = require("../config/db");

async function getHostels(req, res) {
  const result = await query(
    `
      SELECT id, owner_id, name, created_at
      FROM hostels
      WHERE owner_id = $1
      ORDER BY created_at DESC, id DESC
    `,
    [req.user.ownerId],
  );

  return res.json({ hostels: result.rows });
}

async function createHostel(req, res) {
  const { name } = req.validatedBody;

  const result = await query(
    `
      INSERT INTO hostels (owner_id, name)
      VALUES ($1, $2)
      RETURNING id, owner_id, name, created_at
    `,
    [req.user.ownerId, name],
  );

  return res.status(201).json({
    message: "Hostel created successfully.",
    hostel: result.rows[0],
  });
}

module.exports = {
  getHostels,
  createHostel,
};
