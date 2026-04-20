function requireAdminKey(req, res, next) {
  const key = req.headers["x-admin-key"] ?? "";
  const secret = process.env.ADMIN_SECRET ?? "";

  if (!secret) {
    return res.status(503).json({ message: "Admin operations not configured." });
  }

  // Timing-safe compare to prevent timing attacks
  const crypto = require("crypto");
  const keyBuf = Buffer.from(key);
  const secretBuf = Buffer.from(secret);

  if (
    keyBuf.length !== secretBuf.length ||
    !crypto.timingSafeEqual(keyBuf, secretBuf)
  ) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  return next();
}

module.exports = { requireAdminKey };
