-- ============================================================
-- set_camera_url.sql
-- Registers the device's public MJPEG stream BASE url (its Cloudflare
-- Tunnel address) so the camera-token endpoint can hand it to the browser.
-- The backend appends "/stream" itself — paste the BASE url only, no path
-- and no trailing slash, e.g. https://abc-def-ghi.trycloudflare.com
--
-- The quick-tunnel url changes every time `cloudflared tunnel --url ...`
-- restarts, so re-run this with the new url whenever that happens.
-- Run in the Supabase SQL editor or: supabase db execute --file ...
-- ============================================================

update public.devices
set camera_stream_url = 'https://PASTE-TUNNEL-URL-HERE.trycloudflare.com'  -- <-- paste tunnel URL here
where id = '44444444-4444-4444-4444-444444444444'
returning id, device_name, camera_stream_url, updated_at;
