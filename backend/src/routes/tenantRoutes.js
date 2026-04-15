const express = require("express");
const { createTenant, deleteTenant, getTenantById, getTenants, updateTenant } = require("../controllers/tenantController");
const { protect } = require("../middleware/authMiddleware");
const { validateBody, validateQuery } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");
const { tenantCreateSchema, tenantListSchema } = require("../utils/schemas");

const router = express.Router();

router.use(protect);
router.get("/", validateQuery(tenantListSchema), asyncHandler(getTenants));
router.post("/", validateBody(tenantCreateSchema), asyncHandler(createTenant));
router.get("/:id", asyncHandler(getTenantById));
router.put("/:id", asyncHandler(updateTenant));
router.delete("/:id", asyncHandler(deleteTenant));

module.exports = router;
