const express = require("express");
const {
  listBackupsController,
  triggerBackupController,
  getBackupController,
} = require("../controllers/adminBackupController");
const { protect } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);
router.use(requireRoles("super_admin"));

router.get("/", listBackupsController);
router.post("/", triggerBackupController);
router.get("/:id", getBackupController);

module.exports = router;
