const { query } = require("../config/db");
const { createHttpError } = require("../utils/httpErrors");

const VALID_CATEGORIES = ["maintenance", "noise", "safety", "cleanliness", "food", "other"];
const VALID_STATUSES = ["new", "reviewed", "resolved"];

function mapComplaint(row) {
  return {
    id: String(row.id),
    hostelId: String(row.hostel_id),
    hostelName: row.hostel_name || undefined,
    category: row.category,
    message: row.message,
    status: row.status,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getPublicHostelInfo(req, res) {
  const { hostelId } = req.params;
  const result = await query(
    `SELECT id, name, complaints_enabled FROM hostels WHERE id = $1 LIMIT 1`,
    [hostelId],
  );
  if (result.rowCount === 0) throw createHttpError(404, "Hostel not found.");
  const row = result.rows[0];
  return res.json({
    hostelId: String(row.id),
    hostelName: row.name,
    complaintsEnabled: row.complaints_enabled,
  });
}

async function submitComplaint(req, res) {
  const { hostelId } = req.params;
  const { category, message } = req.body || {};

  if (!VALID_CATEGORIES.includes(category)) {
    throw createHttpError(400, "Invalid category.");
  }
  const trimmed = String(message || "").trim();
  if (trimmed.length < 10) throw createHttpError(400, "Message must be at least 10 characters.");
  if (trimmed.length > 1000) throw createHttpError(400, "Message must be under 1000 characters.");

  const hostelResult = await query(
    `SELECT id, owner_id, complaints_enabled FROM hostels WHERE id = $1 LIMIT 1`,
    [hostelId],
  );
  if (hostelResult.rowCount === 0) throw createHttpError(404, "Hostel not found.");
  const hostel = hostelResult.rows[0];
  if (!hostel.complaints_enabled) {
    throw createHttpError(403, "This hostel is not accepting complaints at this time.");
  }

  await query(
    `INSERT INTO complaints (hostel_id, owner_id, category, message)
     VALUES ($1, $2, $3, $4)`,
    [hostel.id, hostel.owner_id, category, trimmed],
  );

  return res.status(201).json({ ok: true, message: "Complaint submitted. Thank you for your feedback." });
}

async function getComplaints(req, res) {
  const ownerId = req.user.ownerId;
  const hostelId = req.query.hostelId;

  const params = [ownerId];
  let hostelFilter = "";
  if (hostelId) {
    params.push(hostelId);
    hostelFilter = `AND c.hostel_id = $${params.length}`;
  }

  const result = await query(
    `SELECT c.id, c.hostel_id, h.name AS hostel_name, c.category,
            c.message, c.status, c.notes, c.created_at, c.updated_at
     FROM complaints c
     JOIN hostels h ON h.id = c.hostel_id
     WHERE c.owner_id = $1 ${hostelFilter}
     ORDER BY c.created_at DESC
     LIMIT 500`,
    params,
  );

  return res.json({ complaints: result.rows.map(mapComplaint) });
}

async function updateComplaint(req, res) {
  const ownerId = req.user.ownerId;
  const { id } = req.params;
  const { status, notes } = req.body || {};

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    throw createHttpError(400, `status must be one of: ${VALID_STATUSES.join(", ")}.`);
  }

  const setParts = ["updated_at = NOW()"];
  const params = [id, ownerId];

  if (status !== undefined) {
    params.push(status);
    setParts.push(`status = $${params.length}`);
  }
  if (notes !== undefined) {
    params.push(String(notes).trim() || null);
    setParts.push(`notes = $${params.length}`);
  }

  const result = await query(
    `UPDATE complaints
     SET ${setParts.join(", ")}
     WHERE id = $1 AND owner_id = $2
     RETURNING id, hostel_id, category, message, status, notes, created_at, updated_at`,
    params,
  );

  if (result.rowCount === 0) throw createHttpError(404, "Complaint not found.");

  return res.json({ ok: true, complaint: mapComplaint(result.rows[0]) });
}

async function toggleComplaints(req, res) {
  const ownerId = req.user.ownerId;
  const { hostelId } = req.params;
  const { enabled } = req.body || {};

  if (typeof enabled !== "boolean") {
    throw createHttpError(400, "enabled must be a boolean.");
  }

  const result = await query(
    `UPDATE hostels SET complaints_enabled = $3, updated_at = NOW()
     WHERE id = $1 AND owner_id = $2
     RETURNING id, complaints_enabled`,
    [hostelId, ownerId, enabled],
  );

  if (result.rowCount === 0) throw createHttpError(404, "Hostel not found.");

  return res.json({ ok: true, enabled: result.rows[0].complaints_enabled });
}

module.exports = {
  getPublicHostelInfo,
  submitComplaint,
  getComplaints,
  updateComplaint,
  toggleComplaints,
};
