const express = require("express");
const { getVacatedTenantsAdmin } = require("../controllers/tenantController");
const { protect } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(protect);
router.use(requireRoles("super_admin"));

// GET /api/admin/tenants/vacated?period=daily|weekly|monthly|all
router.get("/vacated", asyncHandler(getVacatedTenantsAdmin));

module.exports = router;
