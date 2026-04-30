const { query } = require("../config/db");
const { createHttpError } = require("../utils/httpErrors");

const VALID_HOSTEL_TYPES = ["PG", "RESIDENCE"];

function buildOccupancy(allocs) {
  const map = {};
  for (const { hostel_id, unit_id, bed_id } of allocs) {
    const hId = String(hostel_id);
    if (!map[hId]) map[hId] = {};
    if (!map[hId][unit_id]) map[hId][unit_id] = { totalAllocs: 0, beds: new Set() };
    map[hId][unit_id].totalAllocs++;
    if (bed_id) map[hId][unit_id].beds.add(bed_id);
  }
  return map;
}

function mapHostel(row, hostelOccupancy = {}) {
  const floors = Array.isArray(row.data?.floors) ? row.data.floors : [];
  return {
    id: String(row.id),
    hostelName: row.name,
    address: row.address || "",
    type: VALID_HOSTEL_TYPES.includes(row.type) ? row.type : "PG",
    floors: floors.map((floor) => ({
      ...floor,
      rooms: (floor.rooms ?? []).map((room) => {
        const unitId = room.unitId ?? room.id;
        const unitData = hostelOccupancy[unitId] ?? { totalAllocs: 0, beds: new Set() };
        return {
          ...room,
          occupied: unitData.totalAllocs,
          beds: (room.beds ?? []).map((bed) => ({
            ...bed,
            occupied: unitData.beds.has(bed.id),
          })),
        };
      }),
    })),
    createdAt: row.created_at,
  };
}

async function getHostels(req, res) {
  const [hostelResult, allocResult] = await Promise.all([
    query(
      `SELECT id, owner_id, name, address, type, data, created_at
       FROM hostels WHERE owner_id = $1 ORDER BY created_at DESC, id DESC`,
      [req.user.ownerId],
    ),
    query(
      `SELECT hostel_id, unit_id, bed_id FROM allocations
       WHERE owner_id = $1 AND status = 'ACTIVE'`,
      [req.user.ownerId],
    ),
  ]);

  const occupancy = buildOccupancy(allocResult.rows);
  return res.json({
    hostels: hostelResult.rows.map((row) => mapHostel(row, occupancy[String(row.id)] ?? {})),
  });
}

async function getHostelById(req, res) {
  const [result, allocResult] = await Promise.all([
    query(
      `SELECT id, owner_id, name, address, type, data, created_at
       FROM hostels WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [req.params.id, req.user.ownerId],
    ),
    query(
      `SELECT hostel_id, unit_id, bed_id FROM allocations
       WHERE hostel_id = $1 AND owner_id = $2 AND status = 'ACTIVE'`,
      [req.params.id, req.user.ownerId],
    ),
  ]);

  if (result.rowCount === 0) {
    throw createHttpError(404, "Hostel not found.");
  }

  const occupancy = buildOccupancy(allocResult.rows);
  return res.json({ hostel: mapHostel(result.rows[0], occupancy[String(result.rows[0].id)] ?? {}) });
}

async function createHostel(req, res) {
  const { name, address, floors } = req.validatedBody;
  const rawType = req.body?.type;
  const type = VALID_HOSTEL_TYPES.includes(rawType) ? rawType : "PG";

  const result = await query(
    `
      INSERT INTO hostels (owner_id, name, address, type, data)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING id, owner_id, name, address, type, data, created_at
    `,
    [req.user.ownerId, name, address, type, JSON.stringify({ floors })],
  );

  return res.status(201).json({
    message: "Hostel created successfully.",
    hostel: mapHostel(result.rows[0]),
  });
}

async function updateHostel(req, res) {
  const { name, address, floors } = req.validatedBody;
  const rawType = req.body?.type;
  const type = VALID_HOSTEL_TYPES.includes(rawType) ? rawType : "PG";

  const result = await query(
    `
      UPDATE hostels
      SET name = $3, address = $4, type = $5, data = $6::jsonb
      WHERE id = $1 AND owner_id = $2
      RETURNING id, owner_id, name, address, type, data, created_at
    `,
    [req.params.id, req.user.ownerId, name, address, type, JSON.stringify({ floors })],
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Hostel not found.");
  }

  return res.json({
    message: "Hostel updated successfully.",
    hostel: mapHostel(result.rows[0]),
  });
}

module.exports = {
  getHostels,
  getHostelById,
  createHostel,
  updateHostel,
};
