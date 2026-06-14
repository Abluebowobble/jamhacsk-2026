-- ============================================================
-- create_device.sql
-- Creates a single unpaired device. Only pairing_code is required
-- (unique, not null); all other columns fall back to their table
-- defaults (is_paired=false, online_status=false, stove_status='off',
-- presence_status='not_detected', etc.). The device starts with no
-- household_id — it gets attached when a user pairs with the code.
-- Run in the Supabase SQL editor or: supabase db execute --file ...
-- ============================================================

insert into public.devices (pairing_code)
values ('ABC123')
returning id, pairing_code, created_at;
