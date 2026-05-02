const express = require("express");
const { z } = require("zod");
const { protect } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const { validateBody } = require("../middleware/validate");
const { PAID_PLAN_IDS } = require("../config/pricing");
const {
  getOwnerBilling,
  setOwnerAutopay,
  payOwnerInvoice,
  requestUpgrade,
} = require("../controllers/ownerBillingController");

const router = express.Router();

router.use(protect);
router.use(requireRoles("owner", "staff"));

router.get("/", getOwnerBilling);

router.patch(
  "/autopay",
  validateBody(
    z.object({
      enabled: z.boolean(),
    }),
  ),
  setOwnerAutopay,
);

router.post(
  "/pay",
  validateBody(
    z.object({
      paymentMethod: z.enum(["online", "manual"]).default("online"),
    }),
  ),
  payOwnerInvoice,
);

router.post(
  "/request-upgrade",
  validateBody(
    z.object({
      requestedPlan: z.enum(PAID_PLAN_IDS),
      note: z.string().max(500).optional(),
    }),
  ),
  requestUpgrade,
);

module.exports = router;
