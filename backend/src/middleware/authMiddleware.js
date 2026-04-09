const jwt = require("jsonwebtoken");

function protect(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token is required." });
  }

  const token = authHeader.slice(7).trim();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.ownerId) {
      return res.status(401).json({ message: "Invalid token payload." });
    }

    req.user = {
      ownerId: decoded.ownerId,
      email: decoded.email,
    };

    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

module.exports = { protect };
