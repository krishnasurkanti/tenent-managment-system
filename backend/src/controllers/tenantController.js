const { getClient, query } = require("../config/db");
const { createHttpError } = require("../utils/httpErrors");

function normalizeHostelType(value) {
  return value === "RESIDENCE" ? "RESIDENCE" : "PG";
}

function buildUnitId(hostelId, floorId, room) {
  const safeRoomNumber = String(room.roomNumber || "unit")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return room.unitId || room.id || `${hostelId}-${floorId}-${safeRoomNumber || "unit"}`;
}

function normalizeHostelFloors(hostelRow) {
  const type = normalizeHostelType(hostelRow.type);
  const floors = Array.isArray(hostelRow.data?.floors) ? hostelRow.data.floors : [];

  return floors.map((floor) => ({
    ...floor,
    rooms: Array.isArray(floor.rooms)
      ? floor.rooms.map((room) => {
          const unitId = buildUnitId(hostelRow.id, floor.id, room);
          const capacity = type === "RESIDENCE" ? 1 : Math.max(Number(room.bedCount || 0), 1);
          const beds =
            type === "PG"
              ? Array.from({ length: capacity }, (_, index) => ({
                  id: room.beds?.[index]?.id || `${unitId}-bed-${index + 1}`,
                  label: room.beds?.[index]?.label || `Bed ${index + 1}`,
                }))
              : [];

          return {
            ...room,
            unitId,
            propertyType: type,
            bedCount: capacity,
            sharingType: type === "RESIDENCE" ? "Private unit" : room.sharingType || `${capacity} sharing`,
            beds,
          };
        })
      : [],
  }));
}

function mapTenantRow(row) {
  const data = row.data || {};

  const billingCycleRaw = data.billingCycle;
  const billingCycle =
    billingCycleRaw === "daily" || billingCycleRaw === "weekly" ? billingCycleRaw : "monthly";

  return {
    tenantId: String(row.id),
    hostelId: String(row.hostel_id),
    fullName: data.fullName || "",
    fatherName: data.fatherName || undefined,
    dateOfBirth: data.dateOfBirth || undefined,
    phone: data.phone || "",
    email: data.email || "",
    monthlyRent: Number(data.monthlyRent || 0),
    rentPaid: Number(data.rentPaid || 0),
    advanceAmount: Number(data.advanceAmount || 0),
    serviceFeeAmount: Number(data.serviceFeeAmount || 0),
    advanceBalance: Number(data.advanceBalance ?? data.advanceAmount ?? 0),
    serviceFeeCollected: Number(data.serviceFeeCollected ?? data.serviceFeeAmount ?? 0),
    paidOnDate: data.paidOnDate || "",
    billingAnchorDate: data.billingAnchorDate || "",
    nextDueDate: data.nextDueDate || "",
    billingCycle,
    occupation: data.occupation || undefined,
    workplaceName: data.workplaceName || undefined,
    tenantPhotoUrl: data.tenantPhotoUrl || undefined,
    idPhotoUrl: data.idPhotoUrl || undefined,
    idType: data.idType || undefined,
    idNumber: data.idNumber || "",
    emergencyContactName: data.emergencyContactName || undefined,
    emergencyContactRelation: data.emergencyContactRelation || undefined,
    emergencyContactPhone: data.emergencyContactPhone || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignment: data.assignment || undefined,
    paymentHistory: Array.isArray(data.paymentHistory) ? data.paymentHistory : [],
  };
}

async function getHostelForOwner(ownerId, hostelId, client = { query }) {
  const result = await client.query(
    `
      SELECT id, owner_id, name, type, data, created_at
      FROM hostels
      WHERE id = $1 AND owner_id = $2
      LIMIT 1
    `,
    [hostelId, ownerId],
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Hostel not found for this owner.");
  }

  return result.rows[0];
}

function resolveAssignment(hostelRow, assignment) {
  if (!assignment) {
    return null;
  }

  const floors = normalizeHostelFloors(hostelRow);
  const propertyType = normalizeHostelType(hostelRow.type);
  const roomNumber = String(assignment.roomNumber || "").trim();

  // Prefer unitId lookup — new frontend sends unitId directly without floorNumber.
  // Fall back to legacy floorNumber+roomNumber for backward compatibility.
  let room = null;

  if (assignment.unitId) {
    for (const floor of floors) {
      const found = floor.rooms.find((r) => r.unitId === assignment.unitId);
      if (found) { room = found; break; }
    }
  }

  if (!room && roomNumber) {
    const floorNumber = Number(assignment.floorNumber || 0);
    const floor = floors[floorNumber - 1];
    if (!floor) {
      throw createHttpError(400, "Selected floor was not found.");
    }
    room = floor.rooms.find((r) => r.roomNumber === roomNumber);
  }

  if (!room) {
    throw createHttpError(400, "Selected room or unit was not found.");
  }

  if (propertyType === "PG") {
    const bedId = String(assignment.bedId || "").trim();
    const bed = room.beds.find((item) => item.id === bedId);

    if (!bed) {
      throw createHttpError(400, "Selected bed was not found.");
    }

    return {
      propertyType,
      unitId: room.unitId,
      bedId: bed.id,
      bedLabel: bed.label,
      sharingType: room.sharingType,
      roomNumber: room.roomNumber,
      moveInDate: assignment.moveInDate || "",
    };
  }

  return {
    propertyType,
    unitId: room.unitId,
    bedId: null,
    bedLabel: "",
    sharingType: room.sharingType,
    roomNumber: room.roomNumber,
    moveInDate: assignment.moveInDate || "",
  };
}

async function ensureAllocationAvailability({ client, ownerId, hostelId, tenantId, assignment }) {
  if (!assignment) {
    return;
  }

  const activeAllocationResult = await client.query(
    `
      SELECT id, tenant_id, unit_id, bed_id
      FROM allocations
      WHERE owner_id = $1 AND status = 'ACTIVE' AND tenant_id = $2
      LIMIT 1
    `,
    [ownerId, tenantId],
  );

  const activeAllocation = activeAllocationResult.rows[0];

  if (
    activeAllocation &&
    activeAllocation.unit_id === assignment.unitId &&
    (activeAllocation.bed_id || null) === (assignment.bedId || null)
  ) {
    return;
  }

  if (activeAllocation) {
    throw createHttpError(409, "Tenant already has an active allocation.");
  }

  if (assignment.propertyType === "RESIDENCE") {
    const occupiedUnit = await client.query(
      `
        SELECT id
        FROM allocations
        WHERE owner_id = $1 AND hostel_id = $2 AND unit_id = $3 AND status = 'ACTIVE'
        LIMIT 1
      `,
      [ownerId, hostelId, assignment.unitId],
    );

    if (occupiedUnit.rowCount > 0) {
      throw createHttpError(409, "Selected unit is already occupied.");
    }

    return;
  }

  const occupiedBed = await client.query(
    `
      SELECT id
      FROM allocations
      WHERE owner_id = $1 AND hostel_id = $2 AND unit_id = $3 AND bed_id = $4 AND status = 'ACTIVE'
      LIMIT 1
    `,
    [ownerId, hostelId, assignment.unitId, assignment.bedId],
  );

  if (occupiedBed.rowCount > 0) {
    throw createHttpError(409, "Selected bed is already occupied.");
  }
}

async function insertAllocation({ client, ownerId, tenantId, hostelId, assignment }) {
  if (!assignment) {
    return;
  }

  await client.query(
    `
      INSERT INTO allocations (owner_id, tenant_id, hostel_id, unit_id, bed_id, status, start_date)
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6::date)
    `,
    [ownerId, tenantId, hostelId, assignment.unitId, assignment.bedId, assignment.moveInDate],
  );
}

async function replaceAllocation({ client, ownerId, tenantId, hostelId, assignment }) {
  await client.query(
    `
      UPDATE allocations
      SET status = 'ENDED', end_date = CURRENT_DATE
      WHERE owner_id = $1 AND tenant_id = $2 AND status = 'ACTIVE'
    `,
    [ownerId, tenantId],
  );

  if (assignment) {
    await ensureAllocationAvailability({ client, ownerId, hostelId, tenantId, assignment });
    await insertAllocation({ client, ownerId, tenantId, hostelId, assignment });
  }
}

async function createTenant(req, res) {
  const { hostel_id: hostelId } = req.validatedBody;
  const ownerId = req.user.ownerId;
  const tenantPayload = { ...req.validatedBody };
  const client = await getClient();

  try {
    await client.query("BEGIN");
    const hostel = await getHostelForOwner(ownerId, hostelId, client);
    const resolvedAssignment = resolveAssignment(hostel, tenantPayload.assignment);

    if (resolvedAssignment) {
      tenantPayload.assignment = {
        ...(tenantPayload.assignment || {}),
        hostelId: String(hostel.id),
        hostelName: hostel.name,
        propertyType: resolvedAssignment.propertyType,
        unitId: resolvedAssignment.unitId,
        bedId: resolvedAssignment.bedId || undefined,
        bedLabel: resolvedAssignment.bedLabel || undefined,
        sharingType: resolvedAssignment.sharingType,
      };
    }

    const result = await client.query(
      `
        INSERT INTO tenants (owner_id, hostel_id, data)
        VALUES ($1, $2, $3::jsonb)
        RETURNING id, owner_id, hostel_id, data, created_at
      `,
      [ownerId, hostelId, JSON.stringify(tenantPayload)],
    );

    const insertedRow = result.rows[0];

    if (resolvedAssignment) {
      await ensureAllocationAvailability({
        client,
        ownerId,
        hostelId,
        tenantId: insertedRow.id,
        assignment: resolvedAssignment,
      });
      await insertAllocation({
        client,
        ownerId,
        tenantId: insertedRow.id,
        hostelId,
        assignment: resolvedAssignment,
      });
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Tenant created successfully.",
      tenant: mapTenantRow(insertedRow),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getTenants(req, res) {
  const { hostel_id: hostelId } = req.validatedQuery;
  const ownerId = req.user.ownerId;

  if (hostelId) {
    await getHostelForOwner(ownerId, hostelId);

    const result = await query(
      `
        SELECT id, owner_id, hostel_id, data, created_at, updated_at
        FROM tenants
        WHERE owner_id = $1 AND hostel_id = $2 AND deleted_at IS NULL
        ORDER BY created_at DESC, id DESC
      `,
      [ownerId, hostelId],
    );

    return res.json({
      hostel_id: hostelId,
      tenants: result.rows.map(mapTenantRow),
    });
  }

  const result = await query(
    `
      SELECT id, owner_id, hostel_id, data, created_at, updated_at
      FROM tenants
      WHERE owner_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC, id DESC
    `,
    [ownerId],
  );

  return res.json({
    tenants: result.rows.map(mapTenantRow),
  });
}

async function getTenantById(req, res) {
  const result = await query(
    `
      SELECT id, owner_id, hostel_id, data, created_at, updated_at
      FROM tenants
      WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
      LIMIT 1
    `,
    [req.params.id, req.user.ownerId],
  );

  if (result.rowCount === 0) {
    throw createHttpError(404, "Tenant not found.");
  }

  return res.json({ tenant: mapTenantRow(result.rows[0]) });
}

async function updateTenant(req, res) {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `
        SELECT id, owner_id, hostel_id, data, created_at, updated_at
        FROM tenants
        WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
        LIMIT 1
      `,
      [req.params.id, req.user.ownerId],
    );

    if (existing.rowCount === 0) {
      throw createHttpError(404, "Tenant not found.");
    }

    const current = existing.rows[0];
    const patch = req.validatedBody && typeof req.validatedBody === "object" ? req.validatedBody : {};
    
    // Conflict check: timestamps are server-generated — strict equality, no tolerance.
    if (patch.expectedUpdatedAt) {
      const expectedTime = new Date(patch.expectedUpdatedAt).getTime();
      const currentTime = new Date(current.updated_at).getTime();
      if (currentTime !== expectedTime) {
        throw createHttpError(409, "This record was updated by another session. Please refresh and try again.");
      }
    }

    const nextData = { ...(current.data || {}), ...patch };
    const nextHostelId = patch.hostel_id ?? current.hostel_id;
    const hostel = await getHostelForOwner(req.user.ownerId, nextHostelId, client);
    const resolvedAssignment = Object.prototype.hasOwnProperty.call(patch, "assignment")
      ? resolveAssignment(hostel, patch.assignment)
      : resolveAssignment(hostel, nextData.assignment);

    if (Object.prototype.hasOwnProperty.call(patch, "assignment")) {
      nextData.assignment = resolvedAssignment
        ? {
            ...(patch.assignment || {}),
            hostelId: String(hostel.id),
            hostelName: hostel.name,
            propertyType: resolvedAssignment.propertyType,
            unitId: resolvedAssignment.unitId,
            bedId: resolvedAssignment.bedId || undefined,
            bedLabel: resolvedAssignment.bedLabel || undefined,
            sharingType: resolvedAssignment.sharingType,
          }
        : undefined;
    }

    if (resolvedAssignment) {
      await replaceAllocation({
        client,
        ownerId: req.user.ownerId,
        tenantId: req.params.id,
        hostelId: nextHostelId,
        assignment: resolvedAssignment,
      });
    } else if (Object.prototype.hasOwnProperty.call(patch, "assignment")) {
      await client.query(
        `
          UPDATE allocations
          SET status = 'ENDED', end_date = CURRENT_DATE
          WHERE owner_id = $1 AND tenant_id = $2 AND status = 'ACTIVE'
        `,
        [req.user.ownerId, req.params.id],
      );
    }

    const result = await client.query(
      `
        UPDATE tenants
        SET hostel_id = $3, data = $4::jsonb, updated_at = NOW()
        WHERE id = $1 AND owner_id = $2
        RETURNING id, owner_id, hostel_id, data, created_at, updated_at
      `,
      [req.params.id, req.user.ownerId, nextHostelId, JSON.stringify(nextData)],
    );

    await client.query("COMMIT");

    return res.json({
      message: "Tenant updated successfully.",
      tenant: mapTenantRow(result.rows[0]),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteTenant(req, res) {
  const {
    moveOutDate,
    advanceRefundAmount,
    refundAdvance,
    advanceRefundEligible,
    settlementNote,
    noticeGivenDate,
    settlementDate,
  } = req.body || {};

  const vacateInfo = {
    vacatedAt: new Date().toISOString(),
    moveOutDate: moveOutDate || settlementDate || new Date().toISOString().slice(0, 10),
    advanceRefundAmount: Number(advanceRefundAmount) || 0,
    refundAdvance: Boolean(refundAdvance),
    advanceRefundEligible: Boolean(advanceRefundEligible),
    settlementNote: (settlementNote || "").trim(),
    noticeGivenDate: noticeGivenDate || null,
  };

  const client = await getClient();

  try {
    await client.query("BEGIN");

    // End active allocations first
    await client.query(
      `
        UPDATE allocations
        SET status = 'ENDED', end_date = CURRENT_DATE
        WHERE owner_id = $1 AND tenant_id = $2 AND status = 'ACTIVE'
      `,
      [req.user.ownerId, req.params.id],
    );

    // Soft delete — merge vacateInfo into data JSONB so it is preserved forever
    const result = await client.query(
      `
        UPDATE tenants
        SET deleted_at = NOW(),
            data = data || $3::jsonb
        WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
        RETURNING id, owner_id, hostel_id, data, created_at, deleted_at
      `,
      [req.params.id, req.user.ownerId, JSON.stringify({ vacateInfo })],
    );

    if (result.rowCount === 0) {
      throw createHttpError(404, "Tenant not found.");
    }

    await client.query("COMMIT");

    return res.json({
      message: "Tenant removed successfully.",
      tenant: mapTenantRow(result.rows[0]),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ── Admin: all vacated tenants across all owners ─────────────────────────────

async function getVacatedTenantsAdmin(req, res) {
  const { period } = req.query;

  let periodFilter = "";
  if (period === "daily") periodFilter = "AND t.deleted_at >= CURRENT_DATE";
  else if (period === "weekly") periodFilter = "AND t.deleted_at >= DATE_TRUNC('week', CURRENT_TIMESTAMP)";
  else if (period === "monthly") periodFilter = "AND t.deleted_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)";

  const result = await query(
    `
      SELECT
        t.id,
        t.owner_id,
        t.hostel_id,
        t.data,
        t.created_at,
        t.deleted_at,
        h.name AS hostel_name,
        o.name AS owner_name,
        o.email AS owner_email
      FROM tenants t
      JOIN hostels h ON h.id = t.hostel_id
      JOIN owners o ON o.id = t.owner_id
      WHERE t.deleted_at IS NOT NULL
      ${periodFilter}
      ORDER BY t.deleted_at DESC
      LIMIT 1000
    `,
  );

  const tenants = result.rows.map((row) => {
    const base = mapTenantRow(row);
    return {
      ...base,
      vacatedAt: row.deleted_at,
      hostelName: row.hostel_name,
      ownerName: row.owner_name,
      ownerEmail: row.owner_email,
      vacateInfo: row.data?.vacateInfo ?? null,
    };
  });

  // Period summaries
  const totalRefund = tenants.reduce((sum, t) => sum + (t.vacateInfo?.advanceRefundAmount ?? 0), 0);

  return res.json({
    period: period || "all",
    count: tenants.length,
    totalAdvanceRefunded: totalRefund,
    tenants,
  });
}

module.exports = {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  getVacatedTenantsAdmin,
  deleteTenant,
};
