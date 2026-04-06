const express = require("express");
const {
  getHostels,
  getHostelById,
  createHostel,
  updateHostel,
  deleteHostel,
} = require("../controllers/hostelController");
const { protect } = require("../middleware/authMiddleware");
const { validateObjectId } = require("../middleware/validateObjectId");

const router = express.Router();

router.use(protect);
router.route("/").get(getHostels).post(createHostel);
router.route("/:id").get(validateObjectId, getHostelById).put(validateObjectId, updateHostel).delete(validateObjectId, deleteHostel);

module.exports = router;
