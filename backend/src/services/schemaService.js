const { query } = require("../config/db");

async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS owners (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Idempotent column additions — safe to run on every boot
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS username TEXT UNIQUE`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS phone_number TEXT`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter'`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'trial'`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS updated_by TEXT`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS created_by TEXT`);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_owners_username ON owners (username)
    WHERE username IS NOT NULL
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_owners_phone_number ON owners (phone_number)
    WHERE phone_number IS NOT NULL
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS owner_invitations (
      id BIGSERIAL PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      email TEXT,
      pg_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      accepted_at TIMESTAMPTZ
    )
  `);

  // Drop NOT NULL on email/pg_name for existing DBs created before invite-link flow
  await query(`ALTER TABLE owner_invitations ALTER COLUMN email DROP NOT NULL`);
  await query(`ALTER TABLE owner_invitations ALTER COLUMN pg_name DROP NOT NULL`);
  await query(`ALTER TABLE owner_invitations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`);
  await query(`ALTER TABLE owner_invitations ADD COLUMN IF NOT EXISTS created_by TEXT`);
  await query(`ALTER TABLE owner_invitations ADD COLUMN IF NOT EXISTS updated_by TEXT`);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_owner_invitations_token ON owner_invitations (token)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_owner_invitations_email ON owner_invitations (email)
    WHERE email IS NOT NULL
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS signup_keys (
      id BIGSERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      used_at TIMESTAMPTZ,
      used_by_owner_id BIGINT REFERENCES owners(id) ON DELETE SET NULL
    )
  `);

  await query(`ALTER TABLE signup_keys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`);
  await query(`ALTER TABLE signup_keys ADD COLUMN IF NOT EXISTS created_by TEXT`);
  await query(`ALTER TABLE signup_keys ADD COLUMN IF NOT EXISTS updated_by TEXT`);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_signup_keys_key ON signup_keys (key)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS hostels (
      id BIGSERIAL PRIMARY KEY,
      owner_id BIGINT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    ALTER TABLE hostels
    ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''
  `);

  await query(`
    ALTER TABLE hostels
    ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb
  `);

  await query(`
    ALTER TABLE hostels
    ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'PG'
  `);
  await query(`ALTER TABLE hostels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`);
  await query(`ALTER TABLE hostels ADD COLUMN IF NOT EXISTS created_by TEXT`);
  await query(`ALTER TABLE hostels ADD COLUMN IF NOT EXISTS updated_by TEXT`);

  await query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id BIGSERIAL PRIMARY KEY,
      owner_id BIGINT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
      hostel_id BIGINT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_tenants_owner_id
    ON tenants(owner_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_tenants_hostel_id
    ON tenants(hostel_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_tenants_owner_hostel_id
    ON tenants(owner_id, hostel_id)
  `);

  // Soft-delete support — idempotent
  await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_by TEXT`);
  await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_by TEXT`);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at
    ON tenants(deleted_at)
    WHERE deleted_at IS NULL
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS allocations (
      id BIGSERIAL PRIMARY KEY,
      owner_id BIGINT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      hostel_id BIGINT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
      unit_id TEXT NOT NULL,
      bed_id TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      start_date DATE NOT NULL,
      end_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`ALTER TABLE allocations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`);
  await query(`ALTER TABLE allocations ADD COLUMN IF NOT EXISTS created_by TEXT`);
  await query(`ALTER TABLE allocations ADD COLUMN IF NOT EXISTS updated_by TEXT`);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_hostels_owner_id
    ON hostels(owner_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_allocations_tenant_id
    ON allocations(tenant_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_allocations_hostel_id
    ON allocations(hostel_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_allocations_status
    ON allocations(status)
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_allocation_bed
    ON allocations(owner_id, hostel_id, unit_id, bed_id)
    WHERE status = 'ACTIVE' AND bed_id IS NOT NULL
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_allocation_unit
    ON allocations(owner_id, hostel_id, unit_id)
    WHERE status = 'ACTIVE' AND bed_id IS NULL
  `);

  // Billing columns on owners (idempotent)
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS billing_cycle_start DATE`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS billing_cycle_end DATE`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS auto_pay_enabled BOOLEAN NOT NULL DEFAULT false`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS free_months_remaining INTEGER NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS billing_plan_override TEXT`);
  await query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS billing_tenants_override INTEGER`);

  // Billing cycle set manually by super admin — no auto-start

  await query(`
    CREATE TABLE IF NOT EXISTS owner_invoices (
      id               BIGSERIAL PRIMARY KEY,
      owner_id         BIGINT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
      cycle_start      DATE NOT NULL,
      cycle_end        DATE NOT NULL,
      effective_tenants INTEGER NOT NULL DEFAULT 0,
      plan_applied     TEXT NOT NULL DEFAULT 'starter',
      extra_tenants    INTEGER NOT NULL DEFAULT 0,
      total_amount     INTEGER NOT NULL DEFAULT 0,
      status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
      payment_provider TEXT,
      payment_note     TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (owner_id, cycle_start)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_owner_invoices_owner_id ON owner_invoices(owner_id)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS owner_tenant_logs (
      id                  BIGSERIAL PRIMARY KEY,
      owner_id            BIGINT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
      date                DATE NOT NULL,
      active_tenant_count INTEGER NOT NULL DEFAULT 0,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (owner_id, date)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_owner_tenant_logs_owner_date ON owner_tenant_logs(owner_id, date)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS owner_upgrade_requests (
      id             BIGSERIAL PRIMARY KEY,
      owner_id       BIGINT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
      current_plan   TEXT NOT NULL,
      requested_plan TEXT NOT NULL,
      note           TEXT NOT NULL DEFAULT '',
      status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ,
      created_by     TEXT,
      updated_by     TEXT
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_owner_upgrade_requests_owner ON owner_upgrade_requests(owner_id)
  `);

  // Razorpay columns on owner_invoices (idempotent)
  await query(`ALTER TABLE owner_invoices ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT`);
  await query(`ALTER TABLE owner_invoices ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT`);

  await query(`
    CREATE TABLE IF NOT EXISTS admin_backups (
      id           BIGSERIAL PRIMARY KEY,
      triggered_by TEXT NOT NULL DEFAULT 'auto',
      snapshot     JSONB NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_admin_backups_created_at ON admin_backups(created_at DESC)
  `);

  // Soft-delete support for owners
  await query(`
    CREATE INDEX IF NOT EXISTS idx_owners_deleted_at
    ON owners(deleted_at)
    WHERE deleted_at IS NULL
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id           BIGSERIAL PRIMARY KEY,
      actor        TEXT NOT NULL,
      action       TEXT NOT NULL,
      target_type  TEXT,
      target_id    TEXT,
      details      JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON admin_audit_log(actor)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON admin_audit_log(created_at DESC)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_target ON admin_audit_log(target_type, target_id)
  `);

  // Complaints per hostel — complaints_enabled flag
  await query(`ALTER TABLE hostels ADD COLUMN IF NOT EXISTS complaints_enabled BOOLEAN NOT NULL DEFAULT true`);

  await query(`
    CREATE TABLE IF NOT EXISTS complaints (
      id          BIGSERIAL PRIMARY KEY,
      hostel_id   BIGINT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
      owner_id    BIGINT NOT NULL REFERENCES owners(id)  ON DELETE CASCADE,
      category    TEXT NOT NULL,
      message     TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'new',
      notes       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_complaints_owner_id ON complaints(owner_id)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_complaints_hostel_id ON complaints(hostel_id)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)
  `);

  // ── SECURITY: Enable RLS on all tables (migration 002) ──────────────────
  // Direct pg connections (postgres superuser) bypass RLS — backend unaffected.
  // This blocks all PostgREST / Supabase Data API access which was fully open.
  const rlsTables = [
    "owners", "owner_invitations", "signup_keys", "hostels", "tenants",
    "allocations", "owner_invoices", "owner_tenant_logs",
    "owner_upgrade_requests", "admin_backups", "admin_audit_log", "complaints",
  ];
  for (const t of rlsTables) {
    await query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    // Revoke table-level grants from Supabase anon/authenticated roles.
    // These roles may not exist on non-Supabase Postgres — ignore gracefully.
    try {
      await query(`REVOKE ALL ON TABLE public.${t} FROM anon, authenticated`);
    } catch {
      // Non-Supabase environment or roles already revoked — safe to ignore.
    }
  }
}

module.exports = { initializeDatabase };
