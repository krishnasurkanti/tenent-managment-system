const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const { createHttpError } = require("../utils/httpErrors");

function signToken(owner) {
  return jwt.sign(
    {
      ownerId: owner.id,
      email: owner.email,
      role: "owner",
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

async function register(req, res) {
  const { email, password, name, username } = req.validatedBody;
  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = username?.trim().toLowerCase() || null;

  const existingOwner = await query("SELECT id FROM owners WHERE email = $1 LIMIT 1", [normalizedEmail]);
  if (existingOwner.rowCount > 0) {
    throw createHttpError(409, "An owner with this email already exists.");
  }

  if (normalizedUsername) {
    const existingUsername = await query("SELECT id FROM owners WHERE username = $1 LIMIT 1", [normalizedUsername]);
    if (existingUsername.rowCount > 0) {
      throw createHttpError(409, "Username already taken.");
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const now = new Date();
  const result = await query(
    `
      INSERT INTO owners (email, password, name, username, status, plan, plan_status, trial_start_date)
      VALUES ($1, $2, $3, $4, 'active', 'starter', 'trial', $5)
      RETURNING id, email, name, username, status, plan, plan_status, trial_start_date, created_at
    `,
    [normalizedEmail, hashedPassword, name?.trim() || "", normalizedUsername, now],
  );

  const owner = result.rows[0];

  return res.status(201).json({
    message: "Owner registered successfully.",
    token: signToken(owner),
    owner: {
      id: owner.id,
      email: owner.email,
      name: owner.name,
      username: owner.username,
      status: owner.status,
      plan: owner.plan,
      planStatus: owner.plan_status,
      trialStartDate: owner.trial_start_date,
      created_at: owner.created_at,
    },
  });
}

async function login(req, res) {
  const { email, username, password } = req.validatedBody;
  if (!email && !username) {
    throw createHttpError(401, "Invalid email or password.");
  }

  const identifier = (username || email || "").trim().toLowerCase();
  // Single query: match on either email or username column
  const result = await query(
    `SELECT id, email, name, username, password, status, plan, plan_status, trial_start_date, created_at
     FROM owners WHERE email = $1 OR username = $1 LIMIT 1`,
    [identifier],
  );

  if (result.rowCount === 0) {
    throw createHttpError(401, "Invalid email or password.");
  }

  const owner = result.rows[0];

  if (owner.status === "inactive") {
    throw createHttpError(401, "Your account has been suspended. Contact your administrator.");
  }

  const passwordMatches = await bcrypt.compare(password, owner.password);
  if (!passwordMatches) {
    throw createHttpError(401, "Invalid email or password.");
  }

  return res.json({
    message: "Login successful.",
    token: signToken(owner),
    owner: {
      id: owner.id,
      email: owner.email,
      name: owner.name,
      username: owner.username,
      status: owner.status,
      plan: owner.plan,
      planStatus: owner.plan_status,
      trialStartDate: owner.trial_start_date,
      created_at: owner.created_at,
    },
  });
}

module.exports = { register, login };
