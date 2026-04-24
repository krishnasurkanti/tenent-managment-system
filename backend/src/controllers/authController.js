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
  const { email, password, name, phoneNumber } = req.validatedBody;
  const normalizedEmail = email.toLowerCase();
  const normalizedPhone = phoneNumber?.trim() || null;

  const existingOwner = await query("SELECT id FROM owners WHERE email = $1 LIMIT 1", [normalizedEmail]);
  if (existingOwner.rowCount > 0) {
    throw createHttpError(409, "An owner with this email already exists.");
  }

  if (normalizedPhone) {
    const existingPhone = await query("SELECT id FROM owners WHERE phone_number = $1 LIMIT 1", [normalizedPhone]);
    if (existingPhone.rowCount > 0) {
      throw createHttpError(409, "Phone number already registered.");
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const now = new Date();
  const result = await query(
    `
      INSERT INTO owners (email, password, name, phone_number, status, plan, plan_status, trial_start_date)
      VALUES ($1, $2, $3, $4, 'active', 'starter', 'trial', $5)
      RETURNING id, email, name, phone_number, status, plan, plan_status, trial_start_date, created_at
    `,
    [normalizedEmail, hashedPassword, name?.trim() || "", normalizedPhone, now],
  );

  const owner = result.rows[0];

  return res.status(201).json({
    message: "Owner registered successfully.",
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
      created_at: owner.created_at,
    },
  });
}

async function login(req, res) {
  const { email, phoneNumber, password } = req.validatedBody;
  if (!email && !phoneNumber) {
    throw createHttpError(401, "Invalid email or password.");
  }

  const identifier = (phoneNumber || email || "").trim().toLowerCase();
  const result = await query(
    `SELECT id, email, name, phone_number, password, status, plan, plan_status, trial_start_date, created_at
     FROM owners WHERE email = $1 OR phone_number = $1 LIMIT 1`,
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
      phoneNumber: owner.phone_number,
      status: owner.status,
      plan: owner.plan,
      planStatus: owner.plan_status,
      trialStartDate: owner.trial_start_date,
      created_at: owner.created_at,
    },
  });
}

module.exports = { register, login };
