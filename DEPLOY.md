# Deploying Hestia (broker + backend) on one Vultr VM

This runs the **Mosquitto MQTT broker** and the **Fastify backend** together via
`docker compose` on a single Vultr server. The Raspberry Pi firmware connects to
the broker remotely.

```
                          Vultr VM (one IP)
   ┌────────────────────────────────────────────────────────┐
   │  docker compose                                         │
   │   ┌───────┐    ┌──────────┐    ┌────────────────┐       │
   │   │ caddy │◀──▶│ backend  │◀──▶│ mqtt (mosquitto)│      │  internal:
   │   │:80/443│    │ :3000    │    │ :1883          │       │  backend→mqtt:1883
   │   └───┬───┘    └──────────┘    └───────┬────────┘       │  caddy→backend:3000
   └───────┼────────────────────────────────┼───────────────┘
       :443 (HTTPS)                      :1883 (MQTT)
           │                                 │
   api.hestia.my  ← your PWA          Raspberry Pi firmware → mqtt://VULTR_IP:1883
```

Caddy terminates HTTPS for `api.hestia.my` and proxies to the backend, which is
no longer published on the host directly. MQTT is still exposed on 1883.

> ⚠️ This exposes 1883 (MQTT) on the public internet with password auth only —
> fine for a demo. Lock the firewall to known IPs, or add MQTT TLS, before
> production. The API is HTTPS via Caddy.

---

## 1. Create the Vultr server

1. Sign up at <https://www.vultr.com/> and add a payment method.
2. **Deploy** → *Cloud Compute – Shared CPU*.
3. **OS:** Ubuntu 24.04 LTS. **Plan:** smallest (1 vCPU / 1 GB, ~$5–6/mo) is enough.
4. (Optional but nice) add your SSH key under "SSH Keys".
5. Deploy. When it's up, copy the **public IP** — referred to below as `VULTR_IP`.

## 2. Log in and install Docker

```bash
ssh root@VULTR_IP        # password is in the Vultr dashboard if you didn't add a key

curl -fsSL https://get.docker.com | sh
docker compose version   # confirm the compose plugin is present
```

## 3. Get the code onto the server

```bash
apt-get update && apt-get install -y git
git clone https://github.com/BlueBokChoy/jamhacsk-2026.git
cd jamhacsk-2026
```

*(If the repo is private/unpushed, from your laptop instead:
`scp -r backend mqtt docker-compose.yml root@VULTR_IP:~/hestia/` then `cd ~/hestia`.)*

## 4. Create the backend secrets file

`backend/.env` is gitignored, so create it on the server. The simplest path is to
copy your working local one up from your laptop:

```bash
# from your LAPTOP
scp backend/.env root@VULTR_IP:~/jamhacsk-2026/backend/.env
```

Or create it by hand on the server (`nano backend/.env`) with at least:

```
NODE_ENV=production
PORT=3000
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:you@example.com
```

> You do NOT need to set `MQTT_BROKER_URL`/`MQTT_USERNAME`/`MQTT_PASSWORD` here —
> docker-compose overrides them so the backend reaches the broker internally at
> `mqtt://mqtt:1883`.

## 5. Start everything

```bash
docker compose up -d --build      # builds the backend image, starts both services
docker compose ps                 # both should be "running"
docker compose logs -f backend    # expect: "Server listening" + "MQTT connected"
```

To change broker credentials from the defaults (`hestia`/`hestiadev`):

```bash
MQTT_USERNAME=hestia MQTT_PASSWORD='a-strong-password' docker compose up -d --build
```

## 6. Open the firewall

**Two layers — do both.**

The API is now served over HTTPS at `api.hestia.my` by the Caddy reverse proxy
(ports **80**/**443**), not directly on 3000 — so open 80/443 instead of 3000.

1. **Vultr Cloud Firewall** (dashboard → Firewall → create group, attach to server):
   allow inbound TCP **22** (SSH), **80** + **443** (HTTP/HTTPS for the API),
   **1883** (MQTT).
2. **Server UFW:**
   ```bash
   ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 1883/tcp
   ufw --force enable
   ufw status
   ```

## 6b. Point api.hestia.my at the server (Cloudflare)

Caddy can only obtain its HTTPS certificate once the DNS name resolves to this
server. In the **Cloudflare dashboard** for `hestia.my`:

1. **DNS → Records → Add record:** Type `A`, Name `api`, IPv4 address =
   `VULTR_IP`, Proxy status **Proxied** (orange cloud). Save.
2. **SSL/TLS → Overview:** set encryption mode to **Full (strict)** so the
   browser↔Cloudflare↔server path is encrypted end-to-end.

DNS usually propagates within a minute or two. Caddy then fetches a Let's Encrypt
certificate automatically the first time it starts (`docker compose logs -f caddy`
shows `certificate obtained`).

## 7. Verify from your laptop

```bash
# API health over HTTPS at the real domain
curl https://api.hestia.my/health          # {"status":"ok",...}
curl https://api.hestia.my/health/ready     # services status

# (debug only) hit the backend container directly from the server:
#   docker compose exec backend wget -qO- http://localhost:3000/health

# MQTT port reachable (PowerShell)
Test-NetConnection VULTR_IP -Port 1883     # TcpTestSucceeded : True
```

## 8. Point the firmware at the server

On the Pi (or your laptop) edit `firmware/.env`:

```
MQTT_BROKER_URL=mqtt://VULTR_IP:1883
MQTT_USERNAME=hestia
MQTT_PASSWORD=hestiadev
```

Run it:

```bash
cd firmware
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py        # expect "MQTT connected as device test-device-001"
```

## 9. Test firmware ↔ backend end-to-end

**Watch broker traffic** (on the server):
```bash
docker exec -it hestia-mqtt mosquitto_sub -h localhost -u hestia -P hestiadev -t 'hestia/#' -v
```

- **Pi → backend:** when `main.py` connects it publishes a retained `status`
  message — you'll see it in the sub above, and the backend log will show it
  received the status (and write to Supabase).
- **Backend → Pi:** send a command (on the server):
  ```bash
  docker exec hestia-mqtt mosquitto_pub -h localhost -u hestia -P hestiadev \
    -t hestia/devices/test-device-001/commands -m '{"command":"TURN_OFF","source":"test"}'
  ```
  The firmware terminal logs `Command: TURN_OFF` → `stove.turn_off() not implemented yet`.

That round-trip is the firmware↔backend link working over Vultr.

---

## Updating after code changes

```bash
cd jamhacsk-2026
git pull
docker compose up -d --build
```

## Handy commands

```bash
docker compose logs -f             # all logs
docker compose logs -f backend     # backend only
docker compose restart backend     # restart one service
docker compose down                # stop everything (volumes/data kept)
```

## Hardening (later)

- Restrict the Vultr firewall's 1883 rule to your laptop + Pi IPs instead of `0.0.0.0/0`.
- ~~Put the API behind Caddy/Nginx with HTTPS~~ — done: Caddy serves `api.hestia.my` with auto Let's Encrypt.
- Add MQTT TLS: `listener 8883` with `cafile/certfile/keyfile` in `mqtt/config/mosquitto.conf`, then use `mqtts://VULTR_IP:8883`.
- Run as a non-root user on the server.

---

# Using the server day-to-day

SSH in first: `ssh root@VULTR_IP`, then `cd jamhacsk-2026`.

| Goal | Command |
|---|---|
| See what's running | `docker compose ps` |
| Tail all logs | `docker compose logs -f` |
| Tail backend only | `docker compose logs -f backend` |
| Restart after editing `backend/.env` | `docker compose up -d` |
| Deploy new code | `git pull && docker compose up -d --build` |
| Stop the apps (server still bills) | `docker compose down` |
| Start them again | `docker compose up -d` |
| Reboot the box | `reboot` (containers auto-start: `restart: unless-stopped`) |
| Reclaim disk from old images | `docker system prune -f` |
| Check disk / memory | `df -h` / `free -m` |

**Where data lives:** the backend is stateless (all real data is in Supabase).
The only local state is the broker's `mqtt-data` volume (retained messages +
the generated password file). `docker compose down` keeps it;
`docker compose down -v` deletes it.

---

# ⚠️ Avoiding accidental charges (Vultr)

**The #1 trap:** Vultr bills an instance **for as long as it EXISTS**, hourly up
to the monthly cap. **Powering it off in the dashboard does NOT stop billing** —
you keep paying for the reserved resources. To actually stop charges you must
**Destroy** the instance (Dashboard → the server → ⋯ → *Destroy*).

So for a hackathon: **destroy the server when you're done demoing.** Re-deploy
later by repeating this guide (it takes ~10 min).

### Things that quietly add cost
- **Idle / forgotten instances** — the big one. A server left running all month
  bills the full monthly rate even if nobody uses it. Delete test servers.
- **Auto Backups** — an opt-in ~20% surcharge on the instance price. Leave it
  OFF unless you need it.
- **Snapshots & extra Block Storage** — these persist (and bill) even after you
  destroy the instance. Delete them separately when done.
- **Reserved / Floating IPs** — a reserved IP keeps billing even while not
  attached to a server. Release it if you destroy the instance.
- **Bandwidth overage** — each plan includes a transfer allowance (e.g. ~1–2 TB);
  traffic beyond it is billed per GB. A demo won't get close, but a runaway
  loop or public abuse could.
- **Bigger plans "just in case"** — the smallest shared-CPU plan is enough for
  this broker + backend. Don't oversize.

### Guardrails to set up now
1. **Billing alert:** Dashboard → *Billing* → enable a balance/usage alert so you
   get emailed before a surprise.
2. **Cap your account:** keep a small prepaid balance / low limit rather than a
   high auto-charge ceiling.
3. **Calendar reminder:** "destroy Vultr server" for the day after the event.
4. **Check the dashboard** periodically — it shows current month-to-date usage.

### Stop billing checklist (when finished)
- [ ] Back up anything you need (data is in Supabase, so usually nothing).
- [ ] **Destroy** the instance (not just power off).
- [ ] Delete any **snapshots** and **block storage** volumes.
- [ ] Release any **reserved IPs**.
- [ ] Confirm the dashboard shows no active billable resources.
