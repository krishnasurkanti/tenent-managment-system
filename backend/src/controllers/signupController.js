const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const { createHttpError } = require("../utils/httpErrors");

function signToken(owner) {
  return jwt.sign(
    { ownerId: owner.id, email: owner.email, role: "owner" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

async function validateSignupKey(req, res) {
  const { key } = req.params;
  const result = await query(
    "SELECT id, status FROM signup_keys WHERE key = $1 LIMIT 1",
    [key],
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Invalid signup link.");
  }

  if (result.rows[0].status !== "active") {
    throw createHttpError(410, "This signup link has already been used. Ask admin to generate a new one.");
  }

  return res.json({ ok: true });
}

async function registerWithKey(req, res) {
  const { key } = req.params;
  const { name, email, phoneNumber, password, hostelName, hostelAddress, hostelType } = req.body;

  if (!name?.trim()) throw createHttpError(400, "Name is required.");
  if (!email?.includes("@")) throw createHttpError(400, "Valid email is required.");
  if (!password || password.length < 6) throw createHttpError(400, "Password must be at least 6 characters.");
  if (!hostelName?.trim()) throw createHttpError(400, "Hostel name is required.");
  if (!hostelAddress?.trim()) throw createHttpError(400, "Hostel address is required.");

  // Re-validate key (atomic check)
  const keyResult = await query(
    "SELECT id FROM signup_keys WHERE key = $1 AND status = 'active' LIMIT 1",
    [key],
  );
  if (keyResult.rowCount === 0) {
    throw createHttpError(410, "Signup link is invalid or already used.");
  }
  const keyId = keyResult.rows[0].id;

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phoneNumber?.trim() || null;

  const existing = await query("SELECT id FROM owners WHERE email = $1 LIMIT 1", [normalizedEmail]);
  if (existing.rowCount > 0) throw createHttpError(409, "An account with this email already exists.");

  const hashedPassword = await bcrypt.hash(password, 12);

  const ownerResult = await query(
    `INSERT INTO owners (email, password, name, phone_number, status, plan, plan_status, trial_start_date)
     VALUES ($1, $2, $3, $4, 'active', 'starter', 'trial', NOW())
     RETURNING id, email, name, phone_number, status, plan, plan_status, trial_start_date`,
    [normalizedEmail, hashedPassword, name.trim(), normalizedPhone],
  );
  const owner = ownerResult.rows[0];

  const validHostelType = ["PG", "RESIDENCE"].includes(hostelType) ? hostelType : "PG";

  const hostelResult = await query(
    `INSERT INTO hostels (owner_id, name, address, type, data)
     VALUES ($1, $2, $3, $4, '{"floors":[]}'::jsonb)
     RETURNING id, name`,
    [owner.id, hostelName.trim(), hostelAddress.trim(), validHostelType],
  );
  const hostel = hostelResult.rows[0];

  // Burn the key — single use
  await query(
    "UPDATE signup_keys SET status = 'used', used_at = NOW(), used_by_owner_id = $1 WHERE id = $2",
    [owner.id, keyId],
  );

  return res.status(201).json({
    ok: true,
    message: "Account and hostel created successfully.",
    token: signToken(owner),
    owner: {
      id: owner.id,
      email: owner.email,
      name: owner.name,
      phoneNumber: owner.phone_number,
      status: owner.status,
      plan: owner.plan,
      planStatus: owner.plan_status,
      trialStartDate: owner.trial_start_date,
    },
    hostel: {
      id: String(hostel.id),
      hostelName: hostel.name,
    },
  });
}

async function getCurrentKey(req, res) {
  const result = await query(
    "SELECT key, created_at FROM signup_keys WHERE status = 'active' ORDER BY created_at DESC LIMIT 1",
  );
  return res.json({
    key: result.rows[0]?.key ?? null,
    createdAt: result.rows[0]?.created_at ?? null,
  });
}

async function generateNewKey(req, res) {
  await query("UPDATE signup_keys SET status = 'revoked' WHERE status = 'active'");

  const key = crypto.randomBytes(24).toString("hex");
  const result = await query(
    "INSERT INTO signup_keys (key) VALUES ($1) RETURNING key, created_at",
    [key],
  );

  return res.status(201).json({
    ok: true,
    key: result.rows[0].key,
    createdAt: result.rows[0].created_at,
  });
}

module.exports = { validateSignupKey, registerWithKey, getCurrentKey, generateNewKey };
