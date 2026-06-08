-- Migration: 002_enable_rls_all_tables
-- SECURITY FIX: Enable Row-Level Security on all public tables.
--
-- Context: This app connects to Supabase via direct pg pool as the postgres
-- superuser (DATABASE_URL). That connection BYPASSES RLS entirely, so the
-- backend is unaffected by this migration.
--
-- Without RLS, Supabase's Data API (PostgREST) lets anyone with the project
-- URL read, insert, update, and delete every row in every table. Enabling RLS
-- with zero permissive policies closes that hole completely.
--
-- Run once against the live database. Safe to re-run (IF NOT EXISTS guards
-- on policies; ALTER TABLE ... ENABLE ROW LEVEL SECURITY is idempotent).

-- ── Enable RLS ────────────────────────────────────────────────────────────────

ALTER TABLE owners                ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_invitations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_keys           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostels               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_invoices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_tenant_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_upgrade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_backups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints            ENABLE ROW LEVEL SECURITY;

-- ── Revoke all PostgREST / anon access ───────────────────────────────────────
-- RLS with no permissive policies = implicit DENY for all PostgREST roles.
-- No explicit policies are needed. If you ever need Supabase Auth users or
-- edge functions to query these tables via the Data API, add policies here.

-- Belt-and-suspenders: revoke table-level grants from the anon and
-- authenticated roles so PostgREST cannot even attempt a query.
-- The "anon" and "authenticated" roles are Supabase-managed and exist on
-- every project.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'owners', 'owner_invitations', 'signup_keys', 'hostels', 'tenants',
    'allocations', 'owner_invoices', 'owner_tenant_logs',
    'owner_upgrade_requests', 'admin_backups', 'admin_audit_log', 'complaints'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM anon, authenticated',
      t
    );
  END LOOP;
END $$;
