const express = require("express");
const {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const { validateObjectId } = require("../middleware/validateObjectId");
const { validateBody } = require("../middleware/validate");
const { paymentCreateSchema, paymentUpdateSchema } = require("../utils/schemas");

const router = express.Router();

router.use(protect);
router.use(requireRoles("owner", "staff"));
router.route("/").get(getPayments).post(validateBody(paymentCreateSchema), createPayment);
router.route("/:id").get(validateObjectId, getPaymentById).put(validateObjectId, validateBody(paymentUpdateSchema), updatePayment).delete(validateObjectId, deletePayment);

module.exports = router;
