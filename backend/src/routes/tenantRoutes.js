const express = require("express");
const { createTenant, getTenants } = require("../controllers/tenantController");
const { protect } = require("../middleware/authMiddleware");
const { validateBody, validateQuery } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");
const { tenantCreateSchema, tenantListSchema } = require("../utils/schemas");

const router = express.Router();

router.use(protect);
router.get("/", validateQuery(tenantListSchema), asyncHandler(getTenants));
router.post("/", validateBody(tenantCreateSchema), asyncHandler(createTenant));

module.exports = router;
