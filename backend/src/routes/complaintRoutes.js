const express = require("express");
const {
  getPublicHostelInfo,
  submitComplaint,
  getComplaints,
  updateComplaint,
  toggleComplaints,
} = require("../controllers/complaintController");
const { protect } = require("../middleware/authMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");
const { publicRateLimit } = require("../middleware/rateLimitMiddleware");

const router = express.Router();

// ── Public (no auth) ──────────────────────────────────────────────
router.get("/public/hostels/:hostelId/info", asyncHandler(getPublicHostelInfo));
router.post("/public/hostels/:hostelId/complaints", publicRateLimit, asyncHandler(submitComplaint));

// ── Owner (protected) ─────────────────────────────────────────────
router.use(protect);
router.get("/", asyncHandler(getComplaints));
router.patch("/hostels/:hostelId/toggle", asyncHandler(toggleComplaints));
router.patch("/:id", asyncHandler(updateComplaint));

module.exports = router;
