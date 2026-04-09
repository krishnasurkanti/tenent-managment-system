const express = require("express");
const { createHostel, getHostels } = require("../controllers/hostelController");
const { protect } = require("../middleware/authMiddleware");
const { validateBody } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");
const { hostelCreateSchema } = require("../utils/schemas");

const router = express.Router();

router.use(protect);
router.get("/", asyncHandler(getHostels));
router.post("/", validateBody(hostelCreateSchema), asyncHandler(createHostel));

module.exports = router;
