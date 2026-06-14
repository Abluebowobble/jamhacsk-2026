-- ============================================================
-- update_device_settings.sql
-- Updates a device's safety timings (the same fields the onboarding
-- "safety defaults" step and the per-device SafetySettings form write):
--   absence_timeout_seconds — time with no one detected before the buzzer
--   warning_delay_seconds   — buzzer time before the stove auto-shuts off
-- Constraint (PRD §15): both > 0, and warning < absence.
-- updated_at is refreshed automatically by the devices_updated_at trigger.
-- Run in the Supabase SQL editor or: supabase db execute --file ...
-- ============================================================

update public.devices
set absence_timeout_seconds = 300,
    warning_delay_seconds   = 30
where id = '33333333-3333-3333-3333-333333333333'
returning id, device_name, absence_timeout_seconds, warning_delay_seconds, updated_at;
