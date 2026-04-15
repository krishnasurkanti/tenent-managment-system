const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const { createHttpError } = require("../utils/httpErrors");

function signToken(owner) {
  return jwt.sign(
    {
      ownerId: owner.id,
      email: owner.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

async function register(req, res) {
  const { email, password } = req.validatedBody;
  const normalizedEmail = email.toLowerCase();

  const existingOwner = await query("SELECT id FROM owners WHERE email = $1 LIMIT 1", [normalizedEmail]);
  if (existingOwner.rowCount > 0) {
    throw createHttpError(409, "An owner with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const result = await query(
    `
      INSERT INTO owners (email, password)
      VALUES ($1, $2)
      RETURNING id, email, created_at
    `,
    [normalizedEmail, hashedPassword],
  );

  const owner = result.rows[0];

  return res.status(201).json({
    message: "Owner registered successfully.",
    token: signToken(owner),
    owner,
  });
}

async function login(req, res) {
  const { email, password } = req.validatedBody;
  if (!email) {
    throw createHttpError(401, "Invalid email or password.");
  }

  const normalizedEmail = email.toLowerCase();

  const result = await query(
    `
      SELECT id, email, password, created_at
      FROM owners
      WHERE email = $1
      LIMIT 1
    `,
    [normalizedEmail],
  );

  if (result.rowCount === 0) {
    throw createHttpError(401, "Invalid email or password.");
  }

  const owner = result.rows[0];
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
      created_at: owner.created_at,
    },
  });
}

module.exports = { register, login };
