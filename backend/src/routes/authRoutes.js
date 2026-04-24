const express = require("express");
const { register, login } = require("../controllers/authController");
const { validateBody } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");
const { authRegisterSchema, authLoginSchema } = require("../utils/schemas");
const { protect } = require("../middleware/authMiddleware");
const { query } = require("../config/db");

const router = express.Router();

router.post("/register", validateBody(authRegisterSchema), asyncHandler(register));
router.post("/login", validateBody(authLoginSchema), asyncHandler(login));

router.get("/me", protect, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, email, name, phone_number, status, plan, plan_status, trial_start_date, created_at
     FROM owners WHERE id = $1 LIMIT 1`,
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

module.exports = router;
