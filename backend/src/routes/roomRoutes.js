const express = require("express");
const {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require("../controllers/roomController");
const { protect } = require("../middleware/authMiddleware");
const { validateObjectId } = require("../middleware/validateObjectId");

const router = express.Router();

router.use(protect);
router.route("/").get(getRooms).post(createRoom);
router.route("/:id").get(validateObjectId, getRoomById).put(validateObjectId, updateRoom).delete(validateObjectId, deleteRoom);

module.exports = router;
