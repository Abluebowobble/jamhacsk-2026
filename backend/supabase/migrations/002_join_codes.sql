-- Hestia join codes — invite codes an admin shares so member accounts can join
-- a household directly (no device pairing, no approval queue). Multi-use until
-- expiry or revocation. Run AFTER 001_init.sql.

create table if not exists join_codes (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  code         text unique not null,            -- normalized: uppercase, no dashes
  created_by   uuid references auth.users(id) on delete set null,
  expires_at   timestamptz,                     -- null = never expires
  revoked      boolean not null default false,
  use_count    integer not null default 0,
  created_at   timestamptz default now()
);

create index if not exists idx_join_codes_household on join_codes (household_id);
create index if not exists idx_join_codes_code on join_codes (code);

-- Note: the backend uses the service-role key and bypasses RLS, enforcing
-- access in application middleware (admin-only create/list/revoke; redeem open
-- to any authenticated user, validated against expiry/revocation).
