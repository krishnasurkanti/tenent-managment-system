-- Migration: 001_unique_active_bed_allocation
-- Prevents concurrent double-assignment of the same bed or RESIDENCE unit.
-- Run once against the live database before deploying the updated backend.

-- Unique index: at most one ACTIVE allocation per bed in a PG hostel
CREATE UNIQUE INDEX IF NOT EXISTS ux_active_bed_allocation
  ON allocations (hostel_id, unit_id, bed_id)
  WHERE status = 'ACTIVE' AND bed_id IS NOT NULL;

-- Unique index: at most one ACTIVE allocation per RESIDENCE unit
CREATE UNIQUE INDEX IF NOT EXISTS ux_active_unit_allocation
  ON allocations (hostel_id, unit_id)
  WHERE status = 'ACTIVE' AND bed_id IS NULL;

-- Unique index: at most one ACTIVE allocation per tenant (can't live in two places)
CREATE UNIQUE INDEX IF NOT EXISTS ux_active_tenant_allocation
  ON allocations (tenant_id)
  WHERE status = 'ACTIVE';
