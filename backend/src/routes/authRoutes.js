const express = require("express");
const bcrypt = require("bcryptjs");
const { register, login } = require("../controllers/authController");
const { validateBody } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");
const { authRegisterSchema, authLoginSchema } = require("../utils/schemas");
const { protect } = require("../middleware/authMiddleware");
const { query } = require("../config/db");
const { logAdminAction } = require("../services/auditService");

const router = express.Router();

router.post("/register", validateBody(authRegisterSchema), asyncHandler(register));
router.post("/login", validateBody(authLoginSchema), asyncHandler(login));

router.get("/me", protect, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, email, name, phone_number, status, plan, plan_status, trial_start_date, created_at
     FROM owners WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [req.user.ownerId],
  );
  if (result.rowCount === 0) return res.status(404).json({ message: "Owner not found." });
  const o = result.rows[0];
  return res.json({
    owner: {
      id: o.id, email: o.email, name: o.name, phoneNumber: o.phone_number,
      status: o.status, plan: o.plan, planStatus: o.plan_status,
      trialStartDate: o.trial_start_date, createdAt: o.created_at,
    },
  });
}));

router.patch("/update-profile", protect, asyncHandler(async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const phone = String(req.body.phone ?? "").trim() || null;

  if (!name) return res.status(400).json({ message: "Name is required." });
  if (name.length > 120) return res.status(400).json({ message: "Name too long (max 120 chars)." });

  const result = await query(
    `UPDATE owners SET name = $2, phone_number = $3, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, email, name, phone_number`,
    [req.user.ownerId, name, phone],
  );
  if (result.rowCount === 0) return res.status(404).json({ message: "Owner not found." });
  const o = result.rows[0];
  return res.json({ owner: { id: o.id, email: o.email, name: o.name, phone: o.phone_number } });
}));

router.patch("/change-password", protect, asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.currentPassword ?? "");
  const newPassword = String(req.body.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new password are required." });
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ message: "New password must be 8–128 characters." });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ message: "New password must differ from current password." });
  }

  const result = await query(
    `SELECT id, password FROM owners WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [req.user.ownerId],
  );
  if (result.rowCount === 0) return res.status(404).json({ message: "Owner not found." });

  const owner = result.rows[0];
  const passwordMatches = await bcrypt.compare(currentPassword, owner.password);
  if (!passwordMatches) return res.status(401).json({ message: "Current password is incorrect." });

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await query(
    `UPDATE owners SET password = $2, updated_at = NOW() WHERE id = $1`,
    [owner.id, hashedPassword],
  );
  return res.json({ message: "Password updated successfully." });
}));

// DELETE /api/auth/me — owner self-deletion with password re-auth (GDPR right to erasure)
router.delete("/me", protect, asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: "Password is required to delete your account." });

  const result = await query(
    `SELECT id, password FROM owners WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [req.user.ownerId],
  );
  if (result.rowCount === 0) return res.status(404).json({ message: "Account not found." });

  const owner = result.rows[0];
  const passwordMatches = await bcrypt.compare(password, owner.password);
  if (!passwordMatches) return res.status(401).json({ message: "Incorrect password." });

  await query(
    `UPDATE owners SET deleted_at = NOW(), updated_at = NOW(), status = 'inactive' WHERE id = $1`,
    [owner.id],
  );

  await logAdminAction({
    actor: `owner:${owner.id}`,
    action: "owner.self_delete",
    targetType: "owner",
    targetId: owner.id,
    details: {},
  });

  return res.json({ ok: true, message: "Account deleted." });
}));

module.exports = router;
