const express = require("express");
const { requireAdminKey } = require("../middleware/adminKeyMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateBody } = require("../middleware/validate");
const { createInvitation, getInvitation, acceptInvitation, listInvitations } = require("../controllers/invitationController");
const { acceptInvitationSchema } = require("../utils/schemas");

const router = express.Router();

// Admin-only: create and list invitations
router.post("/", requireAdminKey, asyncHandler(createInvitation));
router.get("/", requireAdminKey, asyncHandler(listInvitations));

// Public: validate token (owner clicks link)
router.get("/:token", asyncHandler(getInvitation));

// Public: owner submits registration form
router.post("/:token/accept", validateBody(acceptInvitationSchema), asyncHandler(acceptInvitation));

module.exports = router;
