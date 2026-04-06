const express = require("express");
const {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const { validateObjectId } = require("../middleware/validateObjectId");

const router = express.Router();

router.use(protect);
router.route("/").get(getPayments).post(createPayment);
router.route("/:id").get(validateObjectId, getPaymentById).put(validateObjectId, updatePayment).delete(validateObjectId, deletePayment);

module.exports = router;
