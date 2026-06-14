# Firmware Setup — Raspberry Pi

## 1. Push latest changes to GitHub (from your Mac)

```bash
cd /Users/Isabe/Documents/jamhacsk-2026
git add -A
git commit -m "your message here"
git push origin main
```

## 2. Pull the latest code on the Pi

SSH into the Pi, then:

```bash
cd ~/jamhacsk-2026
git pull origin main
```

## 3. First-time setup

```bash
cd firmware
python3 -m venv .venv --system-site-packages
source .venv/bin/activate
sudo apt install -y python3-picamera2 python3-lgpio
pip install -r requirements.txt
cp .env.example .env
nano .env
```

## 4. .env values to fill in

```
DEVICE_ID=44444444-4444-4444-4444-444444444444
MQTT_BROKER_URL=mqtt://216.128.154.60:1883
MQTT_USERNAME=device
MQTT_PASSWORD=hestiadevice
```

## 5. Run the firmware

```bash
python main.py
```

## Notes

- Re-running `pip install -r requirements.txt` is safe but unnecessary unless `requirements.txt` changed since you last installed.
- To check: `git diff HEAD~1 firmware/requirements.txt`

## 6. Camera stream secret + URL

The stream is gated by a shared HMAC secret that **must be identical** on the
backend and the Pi, and the device row must know the Pi's public tunnel URL.

### 6a. Set the shared secret (both sides)

Generate one value (`openssl rand -hex 32`) and put the SAME line in both:

- `backend/.env` on the Vultr VM, then restart: `docker compose up -d --force-recreate backend`
- `firmware/.env` on the Pi, then restart `python main.py`

```
CAMERA_STREAM_SECRET=<same value on both>
```

If it's blank the backend returns `503 "Camera streaming is not configured"`; if
the two values differ the Pi rejects every token with `401`. On a correct start
the Pi logs `Camera stream serving on :8089` (not the "disabled" warning).

### 6b. Start the camera tunnel

```bash
cloudflared tunnel --url http://localhost:8089
```

The camera stream server runs on port 8089 over plain HTTP; Cloudflare wraps it in
HTTPS externally. Sanity check on the Pi: `curl http://localhost:8089/healthz` → `ok`.
Copy the printed `https://<random>.trycloudflare.com` URL and keep this process running.

### 6c. Register the tunnel URL on the device

Paste the BASE url (no `/stream`, no trailing slash) into
[`supabase/set_camera_url.sql`](../supabase/set_camera_url.sql) and run it in the
Supabase SQL editor. Without it the backend returns `409 "no camera stream configured"`.
Re-run with the new url every time the quick tunnel restarts (the url changes).

