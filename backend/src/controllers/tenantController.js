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
    fullName: data.fullName || "",
    fatherName: data.fatherName || undefined,
    dateOfBirth: data.dateOfBirth || undefined,
    phone: data.phone || "",
    email: data.email || "",
    monthlyRent: Number(data.monthlyRent || 0),
    rentPaid: Number(data.rentPaid || 0),
    paidOnDate: data.paidOnDate || "",
    billingAnchorDate: data.billingAnchorDate || "",
    nextDueDate: data.nextDueDate || "",
    billingCycle,
    idType: data.idType || undefined,
    idNumber: data.idNumber || "",
    emergencyContactName: data.emergencyContactName || undefined,
    emergencyContactRelation: data.emergencyContactRelation || undefined,
    emergencyContactPhone: data.emergencyContactPhone || undefined,
    createdAt: row.created_at,
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
  const floorNumber = Number(assignment.floorNumber || 0);
  const roomNumber = String(assignment.roomNumber || "").trim();
  const floor = floors[floorNumber - 1];

  if (!floor) {
    throw createHttpError(400, "Selected floor was not found.");
  }

  const room = floor.rooms.find((item) => item.roomNumber === roomNumber);

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
      floorNumber,
      roomNumber,
      moveInDate: assignment.moveInDate || "",
    };
  }

  return {
    propertyType,
    unitId: room.unitId,
    bedId: null,
    bedLabel: "",
    sharingType: room.sharingType,
    floorNumber,
    roomNumber,
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

  await getHostelForOwner(ownerId, hostelId);

  const result = await query(
    `
      SELECT id, owner_id, hostel_id, data, created_at
      FROM tenants
      WHERE owner_id = $1 AND hostel_id = $2
      ORDER BY created_at DESC, id DESC
    `,
    [ownerId, hostelId],
  );

  return res.json({
    hostel_id: hostelId,
    tenants: result.rows.map(mapTenantRow),
  });
}

async function getTenantById(req, res) {
  const result = await query(
    `
      SELECT id, owner_id, hostel_id, data, created_at
      FROM tenants
      WHERE id = $1 AND owner_id = $2
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
        SELECT id, owner_id, hostel_id, data, created_at
        FROM tenants
        WHERE id = $1 AND owner_id = $2
        LIMIT 1
      `,
      [req.params.id, req.user.ownerId],
    );

    if (existing.rowCount === 0) {
      throw createHttpError(404, "Tenant not found.");
    }

    const current = existing.rows[0];
    const patch = req.body && typeof req.body === "object" ? req.body : {};
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
        SET hostel_id = $3, data = $4::jsonb
        WHERE id = $1 AND owner_id = $2
        RETURNING id, owner_id, hostel_id, data, created_at
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
  const client = await getClient();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        UPDATE allocations
        SET status = 'ENDED', end_date = CURRENT_DATE
        WHERE owner_id = $1 AND tenant_id = $2 AND status = 'ACTIVE'
      `,
      [req.user.ownerId, req.params.id],
    );

    const result = await client.query(
      `
        DELETE FROM tenants
        WHERE id = $1 AND owner_id = $2
        RETURNING id, owner_id, hostel_id, data, created_at
      `,
      [req.params.id, req.user.ownerId],
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

module.exports = {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
};
