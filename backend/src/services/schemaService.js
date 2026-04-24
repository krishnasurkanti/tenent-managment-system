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
    CREATE TABLE IF NOT EXISTS tenants (
      id BIGSERIAL PRIMARY KEY,
      owner_id BIGINT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
      hostel_id BIGINT NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_hostels_owner_id
    ON hostels(owner_id)
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
}

module.exports = { initializeDatabase };
