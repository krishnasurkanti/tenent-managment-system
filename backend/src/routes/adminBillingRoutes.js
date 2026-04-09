const express = require("express");
const { z } = require("zod");
const {
  getAdminHostels,
  getHostelBilling,
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
const { validateObjectId } = require("../middleware/validateObjectId");
const { validateBody } = require("../middleware/validate");

const router = express.Router();

// Razorpay webhook: signed callback, no admin auth token required.
router.post("/razorpay/webhook", express.raw({ type: "application/json" }), razorpayWebhook);

router.use(protect);
router.use(requireRoles("super_admin"));

router.get("/hostels", getAdminHostels);
router.get("/hostel/:id/billing", validateObjectId, getHostelBilling);
router.post("/generate-invoice", validateBody(z.object({ hostel_id: z.string().regex(/^[a-f\d]{24}$/i) })), generateInvoice);
router.post("/override-billing", validateBody(z.object({
  hostel_id: z.string().regex(/^[a-f\d]{24}$/i),
  effective_tenants: z.number().int().nonnegative().optional(),
  plan: z.enum(["starter", "growth", "pro", "scale"]).optional(),
  free_months: z.number().int().nonnegative().optional(),
  note: z.string().max(500).optional(),
})), overrideBilling);
router.post("/mark-paid", validateBody(z.object({
  invoice_id: z.string().regex(/^[a-f\d]{24}$/i),
  status: z.enum(["paid", "pending"]),
})), markInvoicePaid);
router.post("/razorpay/create-order", validateBody(z.object({ invoice_id: z.string().regex(/^[a-f\d]{24}$/i) })), createRazorpayOrder);
router.get("/upgrade-requests", getUpgradeRequests);
router.patch("/upgrade-requests", validateBody(z.object({
  request_id: z.string().regex(/^[a-f\d]{24}$/i),
  action: z.enum(["approve", "reject"]),
})), decideUpgrade);

module.exports = router;
