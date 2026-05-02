const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { asyncHandler } = require("../utils/asyncHandler");
const { query } = require("../config/db");

const router = express.Router();

router.get("/", protect, asyncHandler(async (_req, res) => {
  const result = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM owners WHERE status = 'active')   AS owner_count,
      (SELECT COUNT(*)::int FROM hostels)                          AS hostel_count,
      (SELECT COUNT(*)::int FROM tenants)                          AS tenant_count
  `);

  const row = result.rows[0] ?? {};
  return res.json({
    owners:  row.owner_count  ?? 0,
    hostels: row.hostel_count ?? 0,
    tenants: row.tenant_count ?? 0,
  });
}));

module.exports = router;
