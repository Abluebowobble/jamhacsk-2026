-- ============================================================
-- delete_device.sql
-- Removes a single device. Related rows clean up via FK rules from
-- 001_initial_schema.sql: timers.device_id is "on delete cascade"
-- (a device's timers are deleted with it); events.device_id is
-- "on delete set null" (history is kept but de-linked from the device).
-- Run in the Supabase SQL editor or: supabase db execute --file ...
-- ============================================================

delete from public.devices
where id = '33333333-3333-3333-3333-333333333333'
returning id, device_name, pairing_code;
