const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
  const jwtSecret = process.env.JWT_SECRET || "local-dev-secret";
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token is required." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.userId).select("_id name email");

    if (!user) {
      return res.status(401).json({ message: "Authenticated user was not found." });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };

    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

module.exports = { protect };
