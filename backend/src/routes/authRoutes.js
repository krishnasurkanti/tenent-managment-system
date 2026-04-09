const express = require("express");
const { register, login } = require("../controllers/authController");
const { validateBody } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");
const { authRegisterSchema, authLoginSchema } = require("../utils/schemas");

const router = express.Router();

router.post("/register", validateBody(authRegisterSchema), asyncHandler(register));
router.post("/login", validateBody(authLoginSchema), asyncHandler(login));

module.exports = router;
