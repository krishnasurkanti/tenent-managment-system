const jwt = require("jsonwebtoken");

function signToken(owner) {
  return jwt.sign(
    { ownerId: owner.id, email: owner.email, role: "owner" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

module.exports = { signToken };
