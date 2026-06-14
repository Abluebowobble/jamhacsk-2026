-- ============================================================
-- 004_join_codes.sql
-- Invite codes a household admin generates and shares so member
-- accounts can join the household directly — no device pairing and
-- no admin-approval queue (the code itself is the authorization).
-- Complements join_requests (Case B: request access to a paired
-- device's household). A code is multi-use until it expires or an
-- admin revokes it. Run AFTER 001_initial_schema.sql.
-- ============================================================

create table public.join_codes (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code         text unique not null,                  -- normalized: upper, no dashes
  created_by   uuid references auth.users(id) on delete set null,
  expires_at   timestamp with time zone,              -- null = never expires
  revoked      boolean not null default false,
  use_count    integer not null default 0,
  created_at   timestamp with time zone default now()
);

create index on public.join_codes (household_id);
create index on public.join_codes (code);

-- RLS: enable to match the rest of the schema. The backend uses the
-- service-role key and bypasses these; they only constrain any future
-- direct-from-client access. Writes (create/redeem/revoke) go through the
-- backend, so no client INSERT/UPDATE policy is granted here.
alter table public.join_codes enable row level security;

create policy "join_codes: household admins can view"
  on public.join_codes for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = join_codes.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'admin'
    )
  );
