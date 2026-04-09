const express = require("express");
const {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require("../controllers/roomController");
const { protect } = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const { validateObjectId } = require("../middleware/validateObjectId");
const { validateBody } = require("../middleware/validate");
const { roomCreateSchema, roomUpdateSchema } = require("../utils/schemas");

const router = express.Router();

router.use(protect);
router.use(requireRoles("owner", "staff"));
router.route("/").get(getRooms).post(validateBody(roomCreateSchema), createRoom);
router.route("/:id").get(validateObjectId, getRoomById).put(validateObjectId, validateBody(roomUpdateSchema), updateRoom).delete(validateObjectId, deleteRoom);

module.exports = router;
