# Deploying Hestia — backend + broker on Vultr, exposed via Cloudflare

The **Fastify backend** and the **Mosquitto MQTT broker** run together with
`docker compose` on the Vultr VM (`149.28.119.129`). The backend is put online
over **HTTPS** with a **Cloudflare quick tunnel** (a temporary
`https://<random>.trycloudflare.com` URL), which you paste into the frontend.
The MQTT broker is reached directly by IP from the Raspberry Pi.

| Layer | Address | Exposed how |
|---|---|---|
| Frontend (PWA) | `https://…` (Vercel) | Vercel |
| Backend API | `https://<random>.trycloudflare.com` | Cloudflare quick tunnel → `localhost:3000` |
| MQTT broker | `mqtt://149.28.119.129:1883` | public TCP 1883 (firewalled) |
| DB + Auth | Supabase | hosted |

```
  Frontend (Vercel, HTTPS) ──▶ https://xxxx.trycloudflare.com ──┐
                                                                 │  cloudflared
   ┌─────────────────────────── Vultr VM (149.28.119.129) ──────┼──────────┐
   │  docker compose                                            ▼          │
   │    ┌──────────┐  mqtt://mqtt:1883 / IP   ┌────────────┐  localhost:3000│
   │    │ backend  │◀───────────────────────▶ │ mqtt :1883 │   backend:3000 │
   │    │ :3000    │                          └─────┬──────┘                │
   │    └──────────┘                                │                       │
   └────────────────────────────────────────────────┼───────────────────────┘
                                                     │ public 1883 (firewalled)
                                          Raspberry Pi → mqtt://149.28.119.129:1883
```

**Why the tunnel:** the frontend is HTTPS, and an HTTPS page can't call a plain
`http://IP:3000` API (browser mixed-content block). The quick tunnel puts free
HTTPS in front of the backend. Its URL is **temporary** — it changes every time
the tunnel restarts, so you re-paste it into the frontend each time.

---

## 1. Log in + install Docker

```bash
ssh root@149.28.119.129
curl -fsSL https://get.docker.com | sh
docker compose version
```

## 2. Get the code

```bash
apt-get update && apt-get install -y git tmux
git clone https://github.com/Abluebowobble/jamhacsk-2026
cd jamhacsk-2026
```

## 3. Backend secrets (`backend/.env`)

`backend/.env` is gitignored — copy your local one up
(`scp backend/.env root@149.28.119.129:~/jamhacsk-2026/backend/.env`) or create
it. Minimum:

```ini
NODE_ENV=production
PORT=3000
# Leave empty to allow any browser origin (simplest while the tunnel URL churns),
# or set your frontend origin, e.g. FRONTEND_ORIGIN=https://your-app.vercel.app
FRONTEND_ORIGIN=

# Supabase
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY

# MQTT — same box. user/pass MUST match the broker seed (Step 4). Change the
# password from the weak default before anything real (see the ⚠️ in Step 4).
MQTT_BROKER_URL=mqtt://149.28.119.129:1883
MQTT_USERNAME=backend
MQTT_PASSWORD=hestiadev

# Web Push
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:you@example.com
```

## 4. Start the backend + broker

```bash
docker compose up -d --build      # builds backend, starts mqtt + backend
docker compose ps                 # both "running"
docker compose logs -f backend    # expect "Server listening" + "MQTT connected"
```

The backend listens on **loopback `127.0.0.1:3000`** only (the tunnel reaches it
there) — it is *not* exposed to the internet directly.

> ⚠️ **Change the broker password.** `MQTT_PASSWORD` defaults to `hestiadev`,
> which is published in this repo. The `backend` user can read all telemetry and
> turn any stove on/off, so on a public broker that default = remote stove
> control by anyone. With docker-compose you set it in **one** place — the root
> `.env` — and it both seeds the broker and logs the API in:
> ```bash
> printf 'MQTT_USERNAME=backend\nMQTT_PASSWORD=%s\n' "$(openssl rand -hex 16)" > .env
> docker compose up -d --build
> ```

## 5. Expose the backend with a Cloudflare quick tunnel

Install `cloudflared` (no Cloudflare account needed for a quick tunnel):

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared
```

Run it inside `tmux` so it keeps running after you disconnect:

```bash
tmux new -s tunnel
cloudflared tunnel --url http://localhost:3000
```

It prints a line like:

```
Your quick Tunnel has been created! Visit it at:
https://leone-examination-your-newspaper.trycloudflare.com
```

**Copy that HTTPS URL.** Detach from tmux with **Ctrl-b** then **d** (the tunnel
keeps running). Reattach later with `tmux attach -t tunnel`.

> The URL is regenerated every time you restart the tunnel. After any restart,
> redo Step 6 with the new URL.

## 6. Point the frontend at the tunnel URL

The frontend reads `VITE_API_URL` **at build time**, so it lives in Vercel:

1. Vercel → your project → **Settings → Environment Variables** → set
   `VITE_API_URL` = the `https://…trycloudflare.com` URL from Step 5.
   (Also set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.)
2. **Redeploy** the frontend (Deployments → Redeploy) so the new URL is baked in.
3. For local dev, mirror it in `frontend/.env.local` (`VITE_API_URL=https://…`).

## 7. Firewall

The API is reached through the tunnel (outbound), so **3000 stays closed**. Open
SSH + MQTT only:

1. **Vultr Cloud Firewall:** allow inbound TCP **22** and **1883**.
2. **Server UFW:**
   ```bash
   ufw allow 22/tcp && ufw allow 1883/tcp
   ufw --force enable && ufw status
   ```
   *(Best practice: scope 1883 to the Pi's IP rather than `0.0.0.0/0`.)*

## 8. Verify

```bash
# From anywhere — the API over the tunnel:
curl https://<your-url>.trycloudflare.com/health         # {"status":"ok",...}
curl https://<your-url>.trycloudflare.com/health/ready    # supabase ok, mqtt connected

# On the box — backend reachable locally:
curl http://localhost:3000/health
```
Then open the Vercel frontend: sign in, and in DevTools → Network confirm API
calls go to the `trycloudflare.com` URL with no CORS/mixed-content errors.

## 9. Provision + run a device (firmware)

On the **server**, create the device's MQTT account:
```bash
./mqtt/provision-device.sh <device-UUID> <household-UUID>
```
It prints `DEVICE_ID`, `HOUSEHOLD_ID`, and a generated `MQTT_PASSWORD`. Both UUIDs
must match the device's row in Supabase `devices` (create + pair it first).

On the **Pi**, set `firmware/.env` (use the device's *own* password — never the
`backend` one):
```ini
DEVICE_ID=<device-UUID>
HOUSEHOLD_ID=<household-UUID>
MQTT_BROKER_URL=mqtt://149.28.119.129:1883
MQTT_PASSWORD=<password from provisioning>
MQTT_KEEPALIVE=60
```
Run it (fresh venv — never copy the dev `.venv`, it's Windows-only):
```bash
cd firmware
python3 -m venv .venv --system-site-packages && source .venv/bin/activate
sudo apt install -y python3-picamera2 python3-lgpio
pip install -r requirements.txt
python main.py        # expect "MQTT connected as device <DEVICE_ID>"
```

---

## Restart / update / day-to-day

```bash
# update code
cd jamhacsk-2026 && git pull && docker compose up -d --build

# if the tunnel died, restart it and redo Step 6 with the new URL
tmux attach -t tunnel        # or: tmux new -s tunnel; cloudflared tunnel --url http://localhost:3000
```

| Goal | Command |
|---|---|
| What's running | `docker compose ps` |
| Tail logs | `docker compose logs -f backend` |
| Restart after editing `backend/.env` | `docker compose up -d` |
| Stop apps (VM still bills) | `docker compose down` |
| See the tunnel URL again | `tmux attach -t tunnel` |

## Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend can't reach API / mixed-content error | `VITE_API_URL` must be the **https** tunnel URL, set in Vercel, then **redeployed**. |
| `trycloudflare.com/health` fails but `localhost:3000/health` works | Tunnel died — reattach/restart it (Step 5) and re-paste the new URL (Step 6). |
| CORS error | Set `FRONTEND_ORIGIN` to your frontend origin (or leave empty to allow any), restart backend. |
| API log: MQTT auth refused | `backend/.env` creds ≠ the broker seed (root `.env` / default `backend`/`hestiadev`). |
| Pi can't reach broker | Firewall must allow 1883; firmware uses the device's own password, not `backend`. |
| Pi firmware exits at startup | `HOUSEHOLD_ID` missing in `firmware/.env` (required). |

---

# ⚠️ Avoiding accidental charges (Vultr)

**Vultr bills an instance for as long as it EXISTS** — powering it off does **not**
stop billing. To actually stop charges, **Destroy** the instance (Dashboard → the
server → ⋯ → *Destroy*). For a hackathon: destroy the VM when done; redeploy later
by repeating this guide (~10 min). Cloudflare quick tunnels, Vercel (hobby), and
Supabase (free) don't bill for a demo — only the Vultr VM does.

### Stop-billing checklist
- [ ] Back up anything you need (usually nothing — data is in Supabase).
- [ ] **Destroy** the instance (not just power off).
- [ ] Delete snapshots / block storage; release reserved IPs.
- [ ] Confirm the dashboard shows no active billable resources.
