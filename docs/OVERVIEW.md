# Hestia — Repository Overview

A detailed, code-grounded summary of everything in this repository. For the full
product spec see [prd.md](prd.md); this document describes what actually exists in
the codebase, how the pieces fit together, and where reality diverges from the PRD.

---

## 1. What Hestia is

**Hestia is a smart stove-safety system.** A Raspberry Pi device sits on/near a
stove, uses a camera to detect whether a person is present, and — if a lit stove
is left unattended past a configurable timeout — sounds a warning buzzer and then
automatically cuts stove power. A companion **Progressive Web App (PWA)** gives
households remote visibility and control: live status, device pairing (via NFC),
household/role management, timers, configurable safety thresholds, push
notifications, and an event history.

The guiding principle (PRD §11, §22): **critical safety logic runs locally on the
Pi** so shutoff works even if the cloud is unreachable. The cloud backend + PWA
provide account management, remote visibility, configuration, notifications, and
history — never the safety decision itself.

**Product/brand direction** (see [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md)):
a calm, precise *clinical instrument* — "vigilant, clear, reassuring." Light-theme
only, steel-blue resting palette where amber/red are *earned* (only real warning
or danger). Readable under stress in half a second; every safety state is encoded
as **color + icon + text**, never color alone (WCAG 2.1 AA).

---

## 2. System architecture

```
┌─────────────┐    REST/HTTPS     ┌──────────────────┐    MQTT      ┌──────────────┐
│  Frontend   │ ────────────────▶ │     Backend      │ ◀──────────▶ │   Firmware   │
│  React PWA  │   (Bearer JWT)    │  Fastify (Node)  │  (Mosquitto) │  Raspberry Pi │
│  (Vercel)   │ ◀──────────────── │   (Vultr/Docker) │              │  + Camera +   │
└──────┬──────┘                   └────────┬─────────┘              │  buzzer+relay │
       │                                   │                        └──────────────┘
       │ Supabase Auth (JWT)               │ service-role key
       │ (signup / login / session)        │ (DB reads/writes, bypasses RLS)
       └───────────────┬───────────────────┘
                       ▼
              ┌──────────────────┐
              │     Supabase     │  Postgres + Auth
              │  (DB + Auth +    │  profiles, households, members,
              │   Web Push subs) │  devices, join_requests, timers,
              └──────────────────┘  events, push_subscriptions
```

| Layer | Technology | Hosting | Status |
|---|---|---|---|
| **Frontend** | React 19 + Vite 8 + React Router 7 + Tailwind 4 + vite-plugin-pwa | Vercel | Built; currently in **DEMO mode** (see §6) |
| **Backend** | Fastify 5 (ESM, Node) + `@supabase/supabase-js` + `mqtt` + `web-push` | Vultr VM via Docker Compose | Implemented |
| **Database / Auth** | Supabase (Postgres + Auth) | Supabase cloud | Schema implemented (`001_init.sql`) |
| **Broker** | Eclipse Mosquitto 2.0 | Same Vultr VM (Docker) | Configured with per-device ACLs |
| **Firmware** | Python 3 + paho-mqtt + OpenCV/picamera2 | Raspberry Pi 4 | Fully implemented: MQTT, presence, safety loop, buzzer, servo, camera stream |

The repo is a monorepo with four cooperating parts: [frontend/](../frontend),
[backend/](../backend), [firmware/](../firmware), and [mqtt/](../mqtt) (broker
config + provisioning), tied together by [docker-compose.yml](../docker-compose.yml).

---

## 3. Repository layout

```
jamhacsk-2026/
├── PRODUCT.md            # product brief: users, purpose, brand, a11y principles
├── DESIGN.md             # visual system: "Clinical Precision" tokens, type, motion
├── DEPLOY.md             # step-by-step Vultr deploy (broker + backend via compose)
├── docker-compose.yml    # mqtt (mosquitto) + backend services
├── docs/
│   ├── prd.md            # the full product requirements document
│   └── OVERVIEW.md       # (this file)
│
├── backend/              # Fastify REST API + MQTT bridge + push + timer poller
│   ├── src/
│   │   ├── app.js        # builds the Fastify app (plugins + route registration)
│   │   ├── server.js     # entry: starts app + background services + listens
│   │   ├── lib/          # env, supabase admin client, event logging, device access
│   │   ├── plugins/      # auth (JWT verify), requireRole (household membership)
│   │   ├── routes/       # health, households, members, joinRequests, devices,
│   │   │                 #   stoveControl, safetySettings, timers, events, push
│   │   └── services/     # mqtt (bridge), push (web-push), timerPoller
│   ├── supabase/migrations/001_init.sql   # full schema (PRD §18)
│   ├── Dockerfile, .env.example, README.md (stale template — see §9)
│
├── frontend/             # React PWA
│   ├── src/
│   │   ├── app/          # router, providers (Auth/Session), AppShell, guards
│   │   ├── pages/        # Auth, Onboarding, Pair, Overview, DeviceDetail,
│   │   │                 #   Settings (+ account/notifications/household/about)
│   │   ├── components/   # DeviceCard, StatusPanel, TimerControls, SafetySettings,
│   │   │                 #   HouseholdSwitcher, EventList, ui/* primitives
│   │   └── lib/          # api (REST client), store (data layer), demo (mock api),
│   │                     #   push, supabase, deviceState, roles, format, contexts
│   ├── public/push-sw.js # service-worker push + notificationclick handlers
│   └── vercel.json, vite.config.js, .env.example
│
├── firmware/             # Raspberry Pi device code
│   ├── main.py           # entry: wires MQTT ↔ presence/safety/stove
│   ├── config.py         # loads DEVICE_ID/HOUSEHOLD_ID/broker from .env
│   └── src/
│       ├── mqtt_client.py # COMPLETE — Pi side of the MQTT contract
│       ├── messages.py    # COMPLETE — topic + payload shapes (shared w/ backend)
│       ├── presence.py    # COMPLETE — camera person detection (DNN/HOG)
│       ├── safety.py      # STUB — absence→warning→shutoff state machine
│       ├── buzzer.py      # STUB — buzzer GPIO
│       └── stove.py       # STUB — relay control
│
├── mqtt/                 # Mosquitto broker config + provisioning
│   ├── config/mosquitto.conf  # password + per-user ACL, retained persistence
│   ├── entrypoint.sh          # seeds privileged "backend" user + base ACL
│   ├── provision-device.sh    # creates a per-device MQTT user scoped to its subtree
│   └── provision-household.sh # creates a read-only per-household listener account
│
├── supabase/seed_test_household.sql  # (untracked) seeds 1 user/household/device/timer
├── config/               # Google Flow asset-generation artifacts (logo project,
│                         #   selectors map) — unrelated to the running product
└── graphify-out/         # generated code-graph analysis cache/report (tooling output)
```

---

## 4. Data model (Supabase Postgres)

Defined in [001_init.sql](../backend/supabase/migrations/001_init.sql), matching
PRD §18. Eight tables, all keyed to `auth.users`:

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | editable display name per auth user | `id` (FK→auth.users), `full_name` |
| `households` | a home grouping devices + people | `id`, `name`, `created_by` |
| `household_members` | M:N user↔household with a role | `household_id`, `user_id`, `role` (`admin`\|`member`), unique(hh,user) |
| `devices` | a Hestia unit + its snapshot state | `id`, `household_id` (nullable=unpaired), `device_name`, `pairing_code` (unique), `is_paired`, `online_status`, `stove_status` (`on`\|`off`), `presence_status` (`detected`\|`not_detected`), `absence_timeout_seconds` (300), `warning_delay_seconds` (30) |
| `join_requests` | request to join an already-paired device's household | `household_id`, `user_id`, `status` (`pending`\|`approved`\|`denied`), reviewer fields, unique(hh,user) |
| `timers` | stove timers | `household_id`, `device_id`, `created_by`, `duration_seconds`, `status` (`active`\|`cancelled`\|`completed`), `ends_at` |
| `events` | append-only audit/safety log | `household_id`, `device_id`, `user_id`, `event_type`, `metadata` (jsonb), `created_at` |
| `push_subscriptions` | Web Push endpoints per user | `user_id`, `endpoint` (unique), `p256dh`, `auth` |

Indexes cover the backend's hot paths (member lookups, device-by-household,
events ordered by time, active timers, pending join requests, push by user).

**Security model:** the backend uses the **service-role key and bypasses RLS
entirely** — *all* access control is enforced in application middleware
(`plugins/requireRole.js`, `lib/deviceAccess.js`). The migration explicitly notes
that RLS policies must be added if Supabase is ever exposed directly to the client.

---

## 5. Backend (Fastify)

**Entry flow:** [server.js](../backend/src/server.js) builds the app
([app.js](../backend/src/app.js)), starts three background services (push, MQTT
bridge, timer poller — all degrade gracefully if unconfigured), listens on
`PORT` (default 3001, 3000 in Docker), and installs SIGINT/SIGTERM graceful
shutdown. `buildApp()` is separated from listening so it can be imported by tests
without opening a port or connecting to MQTT.

### 5.1 Auth & authorization

- **`plugins/auth.js`** decorates `app.authenticate`: requires a
  `Authorization: Bearer <jwt>`, verifies it with a Supabase anon client via
  `auth.getUser(token)` (validates against JWKS incl. revocation), and attaches
  `request.user` / `request.token`. Invalid/missing → 401.
- **`plugins/requireRole.js`** → `makeRoleCheck(...roles)`: confirms `request.user`
  is a member of the target household (from `params.householdId` or
  `body.householdId`) with an allowed role; attaches `request.membership`.
- **`lib/deviceAccess.js`** → `requireDeviceAccess(...roles)`: loads the device,
  resolves its household, confirms membership + role, attaches `request.device` and
  `request.membership`. Returns 404 (no device), 409 (unpaired), 403 (not a member /
  wrong role).

Permissions enforce the PRD §9 table: members can operate the stove (turn on/off,
timers, safety settings, view), admins can additionally rename/remove devices,
manage members, and rename/delete households.

### 5.2 REST endpoints (mirrors PRD §19)

| Area | Routes | Notes |
|---|---|---|
| **Me** | `GET/PATCH /api/me` | profile (display name), upsert on first edit |
| **Health** | `GET /health`, `GET /health/ready` | public; readiness pings Supabase, reports MQTT/push state, 503 if DB down |
| **Households** | `GET/POST /api/households`, `PATCH/DELETE /:id`, `POST /:id/leave` | create→creator becomes admin; rename/delete admin-only; "last admin" guards on leave |
| **Members** | `GET /:id/members`, `PATCH/DELETE /:id/members/:userId` | role change + remove admin-only; guards against demoting/removing the last admin or self |
| **Join requests** | `POST/GET /api/households/:id/join-requests`, `POST /api/join-requests/:reqId/approve\|deny` | upsert pending request; approve adds member; pushes to admins/requester |
| **Device pairing** | `GET /:id/pairing-status`, `POST /:id/pair`, (request-access via join-requests) | pairing-status is any-authed (drives NFC flow); pair guards against races with `is('household_id', null)` |
| **Devices** | `GET /api/households/:id/devices`, `GET/PATCH/DELETE /api/devices/:id` | rename/remove admin-only; **delete = unpair** (keeps the row so hardware re-pairs) |
| **Stove control** | `POST /:id/turn-on\|turn-off`, `GET /:id/status` | publishes MQTT command, updates snapshot, logs event |
| **Safety settings** | `PATCH /:id/safety-settings` | validates `warning_delay < absence_timeout`; publishes to device; logs |
| **Timers** | `GET/POST /api/devices/:id/timers`, `DELETE /api/timers/:timerId` | create publishes `TIMER_STARTED`; cancel publishes `TIMER_CANCELLED` + notifies creator |
| **Events** | `GET /api/households/:id/events`, `GET /api/devices/:id/events` | paginated (limit/offset) |
| **Push** | `POST /api/push/subscribe`, `DELETE /api/push/unsubscribe` | re-subscribe by deleting any prior row for the endpoint, then insert |

### 5.3 Background services

- **`services/mqtt.js`** — the device bridge. Connects to `MQTT_BROKER_URL` (can be
  disabled with `off`/empty), subscribes to **household-keyed** topics
  `hestia/households/{householdId}/devices/{deviceId}/{status|presence|events}`,
  and on inbound messages updates the device snapshot, logs presence/safety events,
  and fires push notifications for `WARNING_BUZZER_STARTED` / `AUTO_SHUTOFF_TRIGGERED`.
  Exposes `publishToDevice(deviceId, payload, kind)` for `commands`/`settings`/`timers`.
  Tolerant of a dead broker (warns once, auto-reconnects, API keeps running).
- **`services/push.js`** — `web-push` wrapper. `initPush` configures VAPID (disabled
  if keys absent). `sendToUser` fans out to a user's subscriptions and prunes
  stale (410/404) ones. Helpers: `sendToHouseholdMembers`, `sendToHouseholdAdmins`.
- **`services/timerPoller.js`** — every 10s, finds `active` timers past `ends_at`,
  atomically marks them `completed` (race-guarded), publishes `TURN_OFF`, logs
  `TIMER_COMPLETED`, and notifies the creator ("Timer finished — stove turned off").
  This realizes the PRD's "timer end → notify + turn off" safety-first behavior.

- **`lib/events.js`** — `logEvent(...)`: fire-and-forget insert into `events`; errors
  are logged, never thrown, so logging can't break a request path.

---

## 6. Frontend (React PWA)

A phone-first PWA implementing the "Clinical Precision" design system. React 19,
React Router 7 (data router), Tailwind 4, Lucide icons, vite-plugin-pwa.

### 6.1 Providers & routing

[router.jsx](../frontend/src/app/router.jsx) nests:
`AppProviders` → `RequireAuth` → onboarding/pair → `RequireOnboarded` → `AppShell`
(the dashboard with header, household switcher, account menu).

- **`AuthProvider`** owns the Supabase session (`getSession` + `onAuthStateChange`),
  exposing `status` (`loading`/`authed`/`anon`) so guards show a splash instead of
  flashing the login screen.
- **`SessionProvider`** loads the user's households once authed, tracks the *active*
  household (derived so a stale pick self-heals), and loads that household's devices.
  The household gate is hard; the device gate is a deferrable prompt.
- **`store.js`** is the dashboard data layer: a tiny reactive cache
  (`useSyncExternalStore`) exposing `useDevices`, `useDevice`, `useDeviceEvents`,
  `useMembers`, and an `actions` object (toggle stove, timers, settings, rename/remove,
  member role/remove). Adapts backend `snake_case` → UI `camelCase`. It notes that
  the backend stores only a *snapshot* (online/stove/presence/thresholds) — the live
  absence→warning→shutoff countdown lives on the Pi, so those fields stay `null` and
  the ticking readout is suppressed rather than showing a frozen timer.

### 6.2 Key flows / pages

- **AuthPage** — Supabase email/password signup + login.
- **OnboardingPage** — two-step gate: (1) no household → create one (you become
  admin); (2) household but no device → prompt to pair (skippable for the session).
- **PairPage** — NFC deep-link target (`/pair?device_id=…`, PRD §6.2). Resolves
  pairing status, then **Case A** (unpaired → choose/create a household and pair) or
  **Case B** (already paired → request access; an admin approves). Also supports
  manual device-ID entry (UUID-validated).
- **OverviewPage** — device grid for the active household, with skeletons + empty state.
- **DeviceDetailPage** — per-device status block, stove control, timers, safety
  settings, recent events.
- **SettingsPage** — nested sections: Account (display name), Notifications (Web Push
  toggle), Household (members, roles, rename/delete, leave), About.

### 6.3 Web Push

`lib/push.js` manages the subscription lifecycle (permission → `PushManager.subscribe`
with the VAPID key → mirror to backend via `/api/push/subscribe`). The generated
service worker imports `public/push-sw.js` for `push` + `notificationclick`
handling. Defensive throughout — push may be unsupported or blocked, and the UI
reflects that plainly.

### 6.4 ⚠️ DEMO mode (currently ON)

`lib/demo.js` exports `DEMO = true`. While on:
- `AuthProvider` short-circuits to a fake signed-in `demo@hestia.app` user.
- `api.js` swaps the real REST client for `demoApi`, which serves canned,
  mutable-in-memory, backend-shaped data (two households, several devices, timers,
  events, members) so the **entire app shell renders with no backend or login**.

To return to the real Supabase/REST path: set `DEMO = false` (and the two `if (DEMO)`
branches in `AuthProvider.jsx` / `api.js` fall away). There is also a temporary
public `/preview` route (`SummaryPreview`) flagged for removal after review.

---

## 7. Firmware (Raspberry Pi)

Python firmware for the local device. **Design intent:** safety logic must run
locally (PRD §12, §22).

**All modules are complete:**

- **`mqtt_client.py`** — full Pi side of the MQTT contract. Authenticates as
  `username = DEVICE_ID`; subscribes to `commands`/`settings`/`timers`; publishes
  `status`/`presence`/`events`. Sets a retained **Last Will** on `status`
  (`online:false`) so an unexpected drop marks the device offline automatically.
  Auto-reconnects with backoff.
- **`messages.py`** — single source of truth for topics + payload shapes, mirroring
  what `backend/src/services/mqtt.js` parses. Topics are **household-keyed**:
  `hestia/households/{householdId}/devices/{deviceId}/{kind}`.
- **`presence.py`** — camera person detection. Primary backend is OpenCV DNN
  MobileNet-SSD ("person" class only, so pets are ignored); auto-falls back to
  OpenCV HOG if model files are absent. Capture via picamera2 on the Pi, OpenCV
  `VideoCapture` for laptop dev. Debounced (N agreeing frames) to avoid flicker /
  event spam; fires an `on_change` callback on a stable flip. Exposes
  `latest_jpeg(quality)` (thread-safe) so the MJPEG stream server re-uses the same
  captured frames without opening the camera twice. Degrades gracefully (raises
  `PresenceUnavailable`) when no camera/vision libs exist, so MQTT keeps running.
  Includes a broker-free self-test (`python -m src.presence [--image|--video]`).
- **`safety.py`** — the absence-timeout → warning-delay → auto-shutoff state machine
  (PRD §12.1). Tick-driven (`tick(now)` called every loop iteration); event-driven
  inputs via `on_presence()` and `set_stove()`. Drives the buzzer and stove relay
  directly without any MQTT round-trip. Also handles `snooze()` (postpones
  auto-shutoff by N seconds). Emits named events (`WARNING_BUZZER_STARTED`,
  `WARNING_CANCELLED`, `AUTO_SHUTOFF_TRIGGERED`) via an `on_event` callback that
  the loop forwards to MQTT.
- **`actuator.py`** — shared base for on/off GPIO actuators: lazy init, idempotent
  transitions, `SimulatedBackend` log-only fallback for dev machines without GPIO.
- **`buzzer.py`** — warning buzzer via gpiozero (`Buzzer` for active, `TonalBuzzer`
  for passive). Falls back to `SimulatedBackend` when GPIO is unavailable.
  Self-test: `python -m src.buzzer`.
- **`stove.py`** — stove knob driven by an SG90 servo via gpiozero `AngularServo`
  (0° = off, `STOVE_ON_ANGLE` = on). `turn_off()` deliberately re-asserts 0° every
  time (non-idempotent) because the servo's physical angle is unknown after power-up.
  Falls back to `SimulatedBackend` off-Pi.
- **`camera_stream.py`** — token-gated MJPEG stream server (PRD §13). Runs as a
  background daemon thread; serves frames from `PresenceMonitor.latest_jpeg()` so
  the camera is never opened twice. Access is gated by a short-lived HMAC token
  the backend mints (shared `CAMERA_STREAM_SECRET`). Endpoints: `GET /stream?token=…`
  (multipart MJPEG, 401 on bad/expired token) and `GET /healthz` (no auth).
- **`loop.py`** — the main 3-phase tick orchestrator: (1) drain inbound MQTT
  requests, (2) run safety logic + timer, (3) publish outbound sensor data and
  event logs. Handles `assignment` messages (pair/unpair at runtime), cooking timer
  elapse, and status heartbeats.
- **`main.py`** — entry point: wires everything together, runs the firmware loop.

Model files live in `firmware/models/` (gitignored binaries; see its README for the
MobileNet-SSD download). Presence is tunable via env (confidence, ROI, min box size,
debounce, camera index, frame size).

---

## 8. MQTT broker & messaging contract

**Broker:** Mosquitto 2.0 in Docker ([mqtt/config/mosquitto.conf](../mqtt/config/mosquitto.conf)):
plain TCP `1883`, `allow_anonymous false`, password + per-user ACL files persisted in
the data volume, retained-message persistence on.

**Identity & isolation:**
- `entrypoint.sh` seeds a privileged **`backend`** user (full `hestia/#` access) and
  the base ACL — without `-c`-wiping provisioned device users on restart.
- `provision-device.sh <deviceId> <householdId>` creates a per-device MQTT user
  scoped to *only* its own subtree: it may **write** `status`/`presence`/`events`
  and **read** `commands`/`settings`/`timers` for `hestia/households/<hh>/devices/<dev>/*`,
  then hot-reloads the broker (SIGHUP). Prints the `firmware/.env` to copy.
- `provision-household.sh <householdId>` creates a read-only listener account
  (username = householdId) that can subscribe to every device in that household
  (`pattern read hestia/households/%u/#`) — for hubs/services/debugging.

**Topic & payload contract** (household-keyed; `messages.py` ↔ `services/mqtt.js`):

| Direction | Topic kind | Payload |
|---|---|---|
| Pi → backend | `status` | `{online, stoveStatus, presence, buzzer, activeTimerSecondsRemaining}` (retained) |
| Pi → backend | `presence` | `{presence: detected\|not_detected}` |
| Pi → backend | `events` | `{eventType, …metadata}` (e.g. `WARNING_BUZZER_STARTED`, `AUTO_SHUTOFF_TRIGGERED`) |
| backend → Pi | `commands` | `{command: TURN_ON\|TURN_OFF, source}` |
| backend → Pi | `settings` | `{absenceTimeoutSeconds, warningDelaySeconds}` |
| backend → Pi | `timers` | `{action: TIMER_STARTED\|TIMER_CANCELLED, …}` |

---

## 9. Deployment

[DEPLOY.md](../DEPLOY.md) is the authoritative runbook. The **broker + backend run
together on one Vultr VM** via `docker compose` ([docker-compose.yml](../docker-compose.yml)):

- `mqtt` (Mosquitto) exposes `1883`; backend reaches it internally at `mqtt://mqtt:1883`.
- `backend` builds from `./backend/Dockerfile`, reads `backend/.env`, listens on `3000`
  (bound to `127.0.0.1` in compose — front it with a tunnel/reverse proxy for HTTPS).
- The **Raspberry Pi connects to the broker remotely** at `mqtt://VULTR_IP:1883`.
- The **frontend** deploys to Vercel ([vercel.json](../frontend/vercel.json)); an HTTPS
  frontend must call an HTTPS backend (the `.env.example` suggests a Cloudflare Tunnel
  URL for `VITE_API_URL`).

The backend is **stateless** (all real data in Supabase); the only local state is the
broker's `mqtt-data` volume (retained messages + generated passwords). DEPLOY.md also
includes a prominent **Vultr cost-control** section (you must *destroy*, not just power
off, to stop billing — relevant for a hackathon).

**Environment configuration:**
- `backend/.env` — `SUPABASE_URL`/`ANON`/`SERVICE_ROLE_KEY` (also accepts `VITE_*`
  names via `lib/env.js`), `MQTT_BROKER_URL`/`USERNAME`/`PASSWORD`, `VAPID_*`,
  `FRONTEND_URL`/CORS. Ships with MQTT effectively `off` by default.
- `frontend/.env` — `VITE_SUPABASE_URL`/`ANON_KEY`, `VITE_API_URL`, `VITE_VAPID_PUBLIC_KEY`.
- `firmware/.env` — `DEVICE_ID`, `HOUSEHOLD_ID`, `MQTT_BROKER_URL`/`PASSWORD`, plus
  presence-tuning vars. Username is the `DEVICE_ID` automatically.

---

## 10. Notable divergences & current status

Things to be aware of when reading the PRD against the code:

1. **Backend framework:** PRD §11.2 says *Express*; the implementation is **Fastify**.
2. **MQTT topic scheme:** PRD §20 shows device-keyed `hestia/devices/{deviceId}/…`;
   the implementation is **household-keyed** `hestia/households/{householdId}/devices/{deviceId}/…`
   (backend, firmware `messages.py`, and broker ACLs all agree on this) — done so the
   broker ACL can isolate families.
3. **Frontend demo mode is off** (`DEMO = false`). A temporary `/preview` route
   (`SummaryPreview`) is still present and flagged for removal after review.
4. **Firmware is fully implemented.** `safety.py`, `buzzer.py`, `stove.py`,
   `camera_stream.py`, and `loop.py` are all complete — the absence→warning→
   auto-shutoff state machine, buzzer GPIO, SG90 servo, and token-gated MJPEG
   stream all work (with simulated fallbacks on non-Pi hardware).
5. **`camera_stream_url` column is missing from the DB schema.** The backend's
   device PATCH route accepts it and `camera.js` reads it, but `001_init.sql`
   doesn't define the column. A migration adding
   `alter table devices add column camera_stream_url text;` is needed before the
   camera token endpoint can return a URL.
6. **Stale README templates:** `backend/README.md` describes an old generic template
   (controllers, `upstream.js`, SSE `/api/events`, `/api/echo`) that **does not match**
   the current Fastify+Supabase implementation. `frontend/README.md` is the stock Vite
   template. Treat both as out of date.
7. **RLS is off by design** — security lives entirely in backend middleware (service-role
   key bypasses RLS).
8. **Event-type casing:** the backend/firmware emit UPPER_SNAKE event types
   (`STOVE_TURNED_ON`, …); the untracked seed file uses lower_snake (`stove_on`,
   `presence_detected`) — a minor inconsistency in seed data only.
9. **Unrelated tooling artifacts:** `config/` (Google Flow logo project + a large
   scraped `selectors.map.json`) and `graphify-out/` (a code-graph analysis cache) are
   generated/tooling output, not part of the running product.

### Implemented vs. remaining (against the MVP scope, PRD §10)

| Capability | Status |
|---|---|
| Signup / login / session (Supabase) | ✅ backend + frontend (demo-gated) |
| Household creation + membership model | ✅ |
| NFC pairing (Case A / Case B + join requests) | ✅ |
| Role-based permissions (backend-enforced) | ✅ |
| Device dashboard + safety settings + timers UI | ✅ |
| Timer poller (auto-off on expiry) | ✅ backend |
| MQTT bridge (commands/settings/timers ↔ status/presence/events) | ✅ |
| Push notifications (Web Push + VAPID) | ✅ plumbing |
| Event logging | ✅ |
| Presence detection (camera, person vs. pet) | ✅ firmware |
| Local safety state machine (absence→warning→shutoff) | ✅ firmware |
| Buzzer + servo control | ✅ firmware |
| Camera stream (MJPEG, token-gated) | ✅ firmware + backend |
| Camera stream display (frontend) | ✅ frontend |
| Real (non-demo) frontend wiring | ✅ demo flag off |
| `camera_stream_url` DB column | ⛔ missing from migration |
