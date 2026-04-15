const express = require("express");
const { createHostel, getHostelById, getHostels, updateHostel } = require("../controllers/hostelController");
const { protect } = require("../middleware/authMiddleware");
const { validateBody } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");
const { hostelCreateSchema } = require("../utils/schemas");

const router = express.Router();

router.use(protect);
router.get("/", asyncHandler(getHostels));
router.post("/", validateBody(hostelCreateSchema), asyncHandler(createHostel));
router.get("/:id", asyncHandler(getHostelById));
router.put("/:id", validateBody(hostelCreateSchema), asyncHandler(updateHostel));

module.exports = router;
