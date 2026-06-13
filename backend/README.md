# Hestia Backend (Fastify template)

Template API server. Three jobs:

1. **Handle requests from the frontend** — REST routes under `/api`.
2. **Fetch data from the upstream/device backend** — `src/services/upstream.js`.
3. **Push information to the frontend or backend** — SSE (`/api/events`) for the
   frontend, the upstream client for the device backend.

## Run locally

```bash
cd backend
cp .env.example .env      # then edit if needed
npm install
npm run dev               # auto-restart on change  (npm start = no watch)
```

Server prints: `http://127.0.0.1:3000/api`

## Routes

| Method | Path           | Purpose                                            |
| ------ | -------------- | -------------------------------------------------- |
| GET    | `/`            | server info ping                                   |
| GET    | `/api/health`  | health check                                       |
| POST   | `/api/echo`    | echoes posted JSON (wiring test)                   |
| GET    | `/api/status`  | fetches `/status` from the **upstream** backend    |
| POST   | `/api/commands`| forwards body to the **upstream** backend          |
| GET    | `/api/events`  | **SSE stream** — push events to the frontend       |
| POST   | `/api/notify`  | broadcast an event to all SSE clients              |

### Frontend examples

```js
// fetch
const r = await fetch('http://localhost:3000/api/health').then(r => r.json());

// live push (SSE)
const es = new EventSource('http://localhost:3000/api/events');
es.onmessage = (e) => console.log('event', JSON.parse(e.data));
```

Trigger a push from anywhere:
```bash
curl -X POST localhost:3000/api/notify -H 'Content-Type: application/json' \
  -d '{"type":"stove.warning","payload":{"deviceId":"abc"}}'
```

## Switching localhost → Vultr

Edit **`.env` only** — no source changes:

| Var               | Local                   | Vultr                                 |
| ----------------- | ----------------------- | ------------------------------------- |
| `NODE_ENV`        | `development`           | `production`                          |
| `HOST`            | `127.0.0.1`             | `0.0.0.0` (bind public interface)     |
| `PORT`            | `3000`                  | your port / behind reverse proxy      |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | `https://your-frontend-domain`        |
| `UPSTREAM_BASE_URL` | `http://127.0.0.1:8000` | the Pi/device public or internal URL |

Run with `npm start` (or a process manager like `pm2` / a systemd unit).

## Add a real feature

1. Controller in `src/controllers/`.
2. Wire it in `src/routes/index.js`.
3. Talk to the device backend via `upstream` (`src/services/upstream.js`).
4. Push live updates with `eventBus.broadcast(type, payload)`.
