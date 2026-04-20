const express = require("express");
const { requireAdminKey } = require("../middleware/adminKeyMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  listOwners,
  createOwner,
  updateOwnerStatus,
  updateOwnerPlan,
  deleteOwner,
} = require("../controllers/ownerMgmtController");

const router = express.Router();

router.use(requireAdminKey);

router.get("/", asyncHandler(listOwners));
router.post("/", asyncHandler(createOwner));
router.patch("/:id/status", asyncHandler(updateOwnerStatus));
router.patch("/:id/plan", asyncHandler(updateOwnerPlan));
router.delete("/:id", asyncHandler(deleteOwner));

module.exports = router;
