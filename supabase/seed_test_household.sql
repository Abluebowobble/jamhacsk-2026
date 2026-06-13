-- ============================================================
-- seed_test_household.sql
-- Inserts one complete household for testing:
--   1 auth user (+ auto profile) → household → membership (admin)
--   → paired device → an active timer → a couple of events.
--
-- Idempotent: re-running deletes the prior seed rows first.
-- Run in the Supabase SQL editor or: supabase db execute --file ...
-- ============================================================

-- Fixed UUIDs so the seed is predictable and re-runnable.
-- user:      11111111-1111-1111-1111-111111111111
-- household: 22222222-2222-2222-2222-222222222222
-- device:    33333333-3333-3333-3333-333333333333

-- ─── Clean up any previous run ──────────────────────────────
delete from auth.users      where id = '11111111-1111-1111-1111-111111111111';
delete from public.households where id = '22222222-2222-2222-2222-222222222222';

-- ─── 1. auth user ───────────────────────────────────────────
-- Inserting here fires public.handle_new_user(), which creates
-- the matching public.profiles row automatically.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test.user@hestia.local',
  crypt('Password123!', gen_salt('bf')),   -- login: Password123!
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Test User"}',
  now(),
  now()
);

-- ─── 2. household ───────────────────────────────────────────
insert into public.households (id, name, created_by)
values (
  '22222222-2222-2222-2222-222222222222',
  'Test Household',
  '11111111-1111-1111-1111-111111111111'
);

-- ─── 3. household membership (admin) ────────────────────────
insert into public.household_members (household_id, user_id, role)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'admin'
);

-- ─── 4. device (paired & online) ────────────────────────────
insert into public.devices (
  id, household_id, device_name, pairing_code,
  is_paired, online_status, stove_status, presence_status
)
values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'Kitchen Stove',
  'TEST01',
  true, true, 'on', 'detected'
);

-- ─── 5. an active timer ─────────────────────────────────────
insert into public.timers (
  household_id, device_id, created_by,
  duration_seconds, status, started_at, ends_at
)
values (
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  600, 'active', now(), now() + interval '10 minutes'
);

-- ─── 6. a couple of events ──────────────────────────────────
insert into public.events (household_id, device_id, user_id, event_type, metadata)
values
  ('22222222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111',
   'stove_on', '{"source":"seed"}'),
  ('22222222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111',
   'presence_detected', '{"source":"seed"}');
