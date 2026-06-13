-- ============================================================
-- 003_add_camera_stream_url.sql
-- Stores the device's public MJPEG stream base URL (e.g. its Cloudflare
-- Tunnel address). The browser connects there directly with a short-lived
-- HMAC token the backend mints; the backend never proxies the video.
-- Nullable: a device has no stream until its tunnel URL is registered
-- (PATCH /api/devices/:deviceId, admin only). See PRD section 13.
-- ============================================================

alter table public.devices
  add column camera_stream_url text;
