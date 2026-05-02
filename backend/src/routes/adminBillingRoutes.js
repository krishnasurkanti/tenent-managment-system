const express = require("express");
const { z } = require("zod");
const {
  getAdminOwners,
  getOwnerBillingAdmin,
  generateInvoice,
  overrideBilling,
  markInvoicePaid,
  createRazorpayOrder,
  razorpayWebhook,
  getUpgradeRequests,
  decideUpgrade,
} = require("../controllers/adminBillingController");
const { protect } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const { validateBody } = require("../middleware/validate");
const { PLAN_IDS } = require("../config/pricing");

const router = express.Router();

// Razorpay webhook: signed, no admin auth required
router.post("/razorpay/webhook", express.raw({ type: "application/json" }), razorpayWebhook);

router.use(protect);
router.use(requireRoles("super_admin"));

router.get("/owners", getAdminOwners);
router.get("/owner/:id/billing", getOwnerBillingAdmin);

router.post(
  "/generate-invoice",
  validateBody(z.object({ owner_id: z.coerce.number().int().positive() })),
  generateInvoice,
);

router.post(
  "/override-billing",
  validateBody(
    z.object({
      owner_id: z.coerce.number().int().positive(),
      effective_tenants: z.number().int().nonnegative().optional(),
      plan: z.enum(PLAN_IDS).optional(),
      free_months: z.number().int().nonnegative().optional(),
      note: z.string().max(500).optional(),
    }),
  ),
  overrideBilling,
);

router.post(
  "/mark-paid",
  validateBody(
    z.object({
      invoice_id: z.coerce.number().int().positive(),
      status: z.enum(["paid", "pending"]),
    }),
  ),
  markInvoicePaid,
);

router.post(
  "/razorpay/create-order",
  validateBody(z.object({ invoice_id: z.coerce.number().int().positive() })),
  createRazorpayOrder,
);

router.get("/upgrade-requests", getUpgradeRequests);

router.patch(
  "/upgrade-requests",
  validateBody(
    z.object({
      request_id: z.coerce.number().int().positive(),
      action: z.enum(["approve", "reject"]),
    }),
  ),
  decideUpgrade,
);

module.exports = router;
