const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const { createHttpError } = require("../utils/httpErrors");

const OWNER_SELECT = `
  id, email, name, phone_number, status, plan, plan_status, trial_start_date, created_at
`;

function mapOwner(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phoneNumber: row.phone_number,
    status: row.status,
    plan: row.plan,
    planStatus: row.plan_status,
    trialStartDate: row.trial_start_date,
    createdAt: row.created_at,
  };
}

async function listOwners(req, res) {
  const result = await query(
    `SELECT ${OWNER_SELECT} FROM owners ORDER BY created_at DESC`,
  );
  return res.json({ owners: result.rows.map(mapOwner) });
}

async function createOwner(req, res) {
  const { name, email, phoneNumber, password, plan, planStatus } = req.body;

  if (!email || !password) {
    throw createHttpError(400, "Email and password are required.");
  }
  if (password.length < 6) {
    throw createHttpError(400, "Password must be at least 6 characters.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phoneNumber?.trim() || null;

  const existing = await query("SELECT id FROM owners WHERE email = $1 LIMIT 1", [normalizedEmail]);
  if (existing.rowCount > 0) throw createHttpError(409, "Email already registered.");

  if (normalizedPhone) {
    const existingPhone = await query("SELECT id FROM owners WHERE phone_number = $1 LIMIT 1", [normalizedPhone]);
    if (existingPhone.rowCount > 0) throw createHttpError(409, "Phone number already registered.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const now = new Date();

  const result = await query(
    `INSERT INTO owners (email, password, name, phone_number, status, plan, plan_status, trial_start_date)
     VALUES ($1, $2, $3, $4, 'active', $5, $6, $7)
     RETURNING ${OWNER_SELECT}`,
    [
      normalizedEmail,
      hashedPassword,
      name?.trim() || "",
      normalizedPhone,
      plan || "starter",
      planStatus || "trial",
      now,
    ],
  );

  return res.status(201).json({ ok: true, owner: mapOwner(result.rows[0]) });
}

async function updateOwnerStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== "active" && status !== "inactive") {
    throw createHttpError(400, "Status must be 'active' or 'inactive'.");
  }

  const result = await query(
    `UPDATE owners SET status = $1 WHERE id = $2 RETURNING ${OWNER_SELECT}`,
    [status, id],
  );

  if (result.rowCount === 0) throw createHttpError(404, "Owner not found.");
  return res.json({ ok: true, owner: mapOwner(result.rows[0]) });
}

async function updateOwnerPlan(req, res) {
  const { id } = req.params;
  const { plan, planStatus } = req.body;

  const result = await query(
    `UPDATE owners SET plan = COALESCE($1, plan), plan_status = COALESCE($2, plan_status)
     WHERE id = $3 RETURNING ${OWNER_SELECT}`,
    [plan || null, planStatus || null, id],
  );

  if (result.rowCount === 0) throw createHttpError(404, "Owner not found.");
  return res.json({ ok: true, owner: mapOwner(result.rows[0]) });
}

async function deleteOwner(req, res) {
  const { id } = req.params;
  const result = await query("DELETE FROM owners WHERE id = $1 RETURNING id", [id]);
  if (result.rowCount === 0) throw createHttpError(404, "Owner not found.");
  return res.json({ ok: true });
}

module.exports = { listOwners, createOwner, updateOwnerStatus, updateOwnerPlan, deleteOwner };
