const User = require("../models/User");

async function bootstrapSuperAdmin() {
  const email = (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
  const username = (process.env.SUPER_ADMIN_USERNAME || "").trim().toLowerCase();
  const password = (process.env.SUPER_ADMIN_PASSWORD || "").trim();
  const name = (process.env.SUPER_ADMIN_NAME || "Platform Admin").trim();

  if ((!email && !username) || !password) {
    return;
  }

  const query = email ? { email } : { username };
  const existing = await User.findOne(query);
  if (existing) {
    if (existing.role !== "super_admin") {
      existing.role = "super_admin";
    }
    if (username && existing.username !== username) {
      existing.username = username;
    }
    await existing.save();
    return;
  }

  await User.create({
    name,
    email,
    username: username || undefined,
    password,
    role: "super_admin",
  });
}

module.exports = { bootstrapSuperAdmin };
