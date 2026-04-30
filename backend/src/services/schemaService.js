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
      email TEXT NOT NULL,
      pg_name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      accepted_at TIMESTAMPTZ
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_owner_invitations_token ON owner_invitations (token)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_owner_invitations_email ON owner_invitations (email)
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

  await query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id BIGSERIAL PRIMARY KEY,
      owner_id BIGINT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
      hostel_id BIGINT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

  // Set billing cycle for existing owners who have none
  await query(`
    UPDATE owners
    SET billing_cycle_start = CURRENT_DATE,
        billing_cycle_end   = (CURRENT_DATE + INTERVAL '1 month')::date
    WHERE billing_cycle_start IS NULL
  `);

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
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_owner_upgrade_requests_owner ON owner_upgrade_requests(owner_id)
  `);

  // Razorpay columns on owner_invoices (idempotent)
  await query(`ALTER TABLE owner_invoices ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT`);
  await query(`ALTER TABLE owner_invoices ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT`);
}

module.exports = { initializeDatabase };
