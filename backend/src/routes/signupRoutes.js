const express = require("express");
const { requireAdminKey } = require("../middleware/adminKeyMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateSignupKey, registerWithKey, getCurrentKey, generateNewKey } = require("../controllers/signupController");

const router = express.Router();

// Admin: get current active key, generate new one
router.get("/key", requireAdminKey, asyncHandler(getCurrentKey));
router.post("/key/generate", requireAdminKey, asyncHandler(generateNewKey));

// Public: validate key (page load check)
router.get("/validate/:key", asyncHandler(validateSignupKey));

// Public: register + create hostel
router.post("/:key", asyncHandler(registerWithKey));

module.exports = router;
