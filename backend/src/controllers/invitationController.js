const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const { createHttpError } = require("../utils/httpErrors");

// DB migration required (run once):
//   ALTER TABLE owner_invitations ALTER COLUMN email DROP NOT NULL;
//   ALTER TABLE owner_invitations ALTER COLUMN pg_name DROP NOT NULL;

const INVITE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

function signToken(owner) {
  return jwt.sign(
    { ownerId: owner.id, email: owner.email, role: "owner" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

function isExpired(createdAt) {
  return Date.now() - new Date(createdAt).getTime() > INVITE_TTL_MS;
}

async function createInvitation(req, res) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await query(
    `INSERT INTO owner_invitations (token, email, pg_name, status, expires_at)
     VALUES ($1, NULL, NULL, 'pending', $2)`,
    [token, expiresAt],
  );

  return res.status(201).json({ ok: true, token, expiresAt });
}

async function getInvitation(req, res) {
  const { token } = req.params;

  const result = await query(
    `SELECT id, email, pg_name, status, created_at FROM owner_invitations WHERE token = $1 LIMIT 1`,
    [token],
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Invitation not found.");
  }

  const inv = result.rows[0];

  if (inv.status !== "pending") {
    throw createHttpError(410, inv.status === "accepted" ? "Invitation already used." : "Invitation is no longer valid.");
  }

  if (isExpired(inv.created_at)) {
    await query("UPDATE owner_invitations SET status = 'superseded' WHERE id = $1", [inv.id]);
    throw createHttpError(410, "This invitation link has expired (48-hour limit).");
  }

  return res.json({ ok: true, invitation: { expiresAt: new Date(new Date(inv.created_at).getTime() + INVITE_TTL_MS) } });
}

async function acceptInvitation(req, res) {
  const { token } = req.params;
  const { email, name, phoneNumber, password } = req.body;

  if (!email || !email.includes("@")) throw createHttpError(400, "Valid email is required.");
  if (!name || !name.trim()) throw createHttpError(400, "Name is required.");
  if (!password || password.length < 6) throw createHttpError(400, "Password must be at least 6 characters.");

  const result = await query(
    `SELECT id, status, created_at FROM owner_invitations WHERE token = $1 LIMIT 1`,
    [token],
  );

  if (result.rowCount === 0) throw createHttpError(404, "Invitation not found.");

  const inv = result.rows[0];

  if (inv.status !== "pending") {
    throw createHttpError(410, inv.status === "accepted" ? "Invitation already used." : "Invitation is no longer valid.");
  }

  if (isExpired(inv.created_at)) {
    await query("UPDATE owner_invitations SET status = 'superseded' WHERE id = $1", [inv.id]);
    throw createHttpError(410, "This invitation link has expired (48-hour limit).");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingOwner = await query("SELECT id FROM owners WHERE email = $1 LIMIT 1", [normalizedEmail]);
  if (existingOwner.rowCount > 0) {
    throw createHttpError(409, "An account with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const normalizedPhone = phoneNumber?.trim() || null;

  const ownerResult = await query(
    `INSERT INTO owners (email, password, name, phone_number, status, plan, plan_status, trial_start_date)
     VALUES ($1, $2, $3, $4, 'active', 'free', 'trial', NOW())
     RETURNING id, email, name, phone_number, status, plan, plan_status, trial_start_date`,
    [normalizedEmail, hashedPassword, name.trim(), normalizedPhone],
  );

  const owner = ownerResult.rows[0];

  await query(
    "UPDATE owner_invitations SET status = 'accepted', accepted_at = NOW(), email = $1 WHERE id = $2",
    [normalizedEmail, inv.id],
  );

  return res.status(201).json({
    ok: true,
    message: "Account created successfully.",
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
  });
}

async function listInvitations(req, res) {
  const result = await query(
    `SELECT id, token, email, pg_name, status, created_at, expires_at, accepted_at
     FROM owner_invitations ORDER BY created_at DESC LIMIT 100`,
  );
  return res.json({
    invitations: result.rows.map((row) => ({
      id: row.id,
      token: row.token,
      email: row.email,
      pgName: row.pg_name,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
    })),
  });
}

module.exports = { createInvitation, getInvitation, acceptInvitation, listInvitations };
