const express = require("express");
const {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
} = require("../controllers/tenantController");
const { protect } = require("../middleware/authMiddleware");
const { validateObjectId } = require("../middleware/validateObjectId");

const router = express.Router();

router.use(protect);
router.route("/").get(getTenants).post(createTenant);
router.route("/:id").get(validateObjectId, getTenantById).put(validateObjectId, updateTenant).delete(validateObjectId, deleteTenant);

module.exports = router;
