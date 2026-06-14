# Running Hestia locally

How to bring up the three services that make up the app on your own machine: the
**MQTT broker**, the **backend**, and the **frontend**. Everything is already
configured to talk to `localhost`, so this is mostly "start them in the right
order."

## Architecture (local)

```
frontend (Vite :5173) ──HTTP──▶ backend (Fastify :3000) ──MQTT──▶ broker (Mosquitto :1883)
        │                              │                                  ▲
        └──────────── Supabase ────────┘                                  │
                                                          firmware / device ┘
```

- **Broker** runs in Docker (Mosquitto 2.0).
- **Backend** runs on the **host** with Node — *not* in Docker. Its
  `MQTT_BROKER_URL` is `mqtt://localhost:1883`, which resolves correctly from the
  host but would point at the wrong place from inside a container.
- **Frontend** runs on the host with Vite and talks to the backend at
  `http://localhost:3000` (`VITE_API_URL` in `frontend/.env.local`).

## Prerequisites

- **Docker Desktop** running (for the broker).
- **Node** (v24+ is what this was tested on).
- Env files present (they already are in this repo):
  - `backend/.env` — has `PORT=3000`, `MQTT_BROKER_URL=mqtt://localhost:1883`,
    Supabase + VAPID keys.
  - `firmware/.env` — `MQTT_BROKER_URL=mqtt://localhost:1883`, device credentials.
  - `frontend/.env.local` — `VITE_API_URL=http://localhost:3000`, Supabase URL.

  If any are missing, copy the matching `.env.example` and fill it in.

## 1. Start the MQTT broker

From the repo root:

```bash
docker compose up -d mqtt
```

Only the `mqtt` service — leave the compose `backend` service alone, since we run
the backend on the host (see above).

Verify it's up and watch broker traffic:

```bash
docker compose ps mqtt
docker logs -f hestia-mqtt
```

You should see clients connect as `backend` and
`hestia-device-…` (the firmware).

## 2. Start the backend

```bash
cd backend
npm install   # first time only
npm run dev   # node --watch, auto-reloads on changes
```

Healthy startup logs look like:

```
Server listening at http://127.0.0.1:3000
MQTT connected: mqtt://localhost:1883
Reconciled N device assignment(s) from DB
Timer poller started
```

## 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm install   # first time only
npm run dev   # Vite on http://localhost:5173
```

Open **http://localhost:5173**.

## 4. (Optional) Start the firmware in simulated mode

On a non-Pi machine the firmware falls back to simulated buzzer/stove/presence,
so you can run the full loop without hardware:

```bash
cd firmware
pip install -r requirements.txt   # first time only
python main.py
```

It connects to the same local broker and shows up in the device grid.

## Quick start (all at once)

```bash
# from repo root
docker compose up -d mqtt
(cd backend  && npm run dev > /tmp/hestia-backend.log 2>&1 &)
(cd frontend && npm run dev > /tmp/hestia-frontend.log 2>&1 &)
# logs: tail -f /tmp/hestia-backend.log /tmp/hestia-frontend.log
```

## Stopping

```bash
# stop host dev servers
pkill -f 'src/server.js'   # backend
pkill -f 'vite'            # frontend

# stop the broker
docker compose stop mqtt
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| Backend: `MQTT … ECONNREFUSED` | Broker isn't up. Run `docker compose up -d mqtt`. |
| Backend won't reach broker from inside Docker | Don't run the backend in Docker locally — use `npm run dev` on the host. |
| Frontend can't reach API / CORS errors | Check `VITE_API_URL` in `frontend/.env.local` is `http://localhost:3000`, and that `FRONTEND_ORIGIN` in `backend/.env` includes `http://localhost:5173`. |
| Port already in use | Something's already running: `lsof -iTCP:3000 -iTCP:5173 -sTCP:LISTEN -nP`. |
| Broker logs show repeated device timeouts | Normal when no firmware is running — the device retries connecting. |
