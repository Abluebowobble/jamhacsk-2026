-- ============================================================
-- reset_with_one_device.sql
-- Wipes ALL data from the Hestia database and re-adds a single
-- "NFC tag" — i.e. one fresh, unpaired Hestia device.
--
-- Each physical Hestia unit's NFC sticker encodes:
--   <app origin>/pair?device_id=<device uuid>
-- so a predictable device id lets you re-program / re-test one tag.
--
-- DESTRUCTIVE: deletes every household, member, device, timer,
-- event, push subscription, profile and auth user.
--
-- Run in the Supabase SQL editor or:
--   supabase db execute --file supabase/reset_with_one_device.sql
-- ============================================================

-- Fixed device UUID so the NFC pairing URL is stable across resets.
--   device:  44444444-4444-4444-4444-444444444444
--   NFC URL: <app origin>/pair?device_id=44444444-4444-4444-4444-444444444444

begin;

-- ─── 1. Wipe everything ─────────────────────────────────────
-- Order matters only where ON DELETE is RESTRICT/SET NULL; TRUNCATE
-- ... CASCADE clears dependents in one shot regardless.
truncate table
  public.timers,
  public.events,
  public.join_requests,
  public.household_members,
  public.push_subscriptions,
  public.devices,
  public.households,
  public.profiles
restart identity cascade;

-- Removing auth users also clears profiles via the FK cascade, but
-- profiles was already truncated above. Deleting users last avoids
-- leaving orphaned auth rows behind.
delete from auth.users;

-- ─── 2. Re-add a single NFC tag (unpaired device) ───────────
insert into public.devices (
  id,
  device_name,
  pairing_code,
  is_paired,
  online_status,
  stove_status,
  presence_status
)
values (
  '44444444-4444-4444-4444-444444444444',
  'Kitchen Stove',
  'TAG001',
  false,            -- unpaired: ready for a fresh pairing flow
  false,            -- offline until the firmware connects
  'off',
  'not_detected'
);

commit;
