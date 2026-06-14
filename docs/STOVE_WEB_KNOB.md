# Virtual Web Stove Knob

A browser-based stove knob that **replaces the SG90 servo** as the stove actuator.
Built for demos and development where there's no physical knob/servo, but it behaves
exactly like the real hardware from the rest of the system's point of view.

> **The Raspberry Pi is unchanged in every other respect.** Camera vision, presence
> detection, the local safety state machine, the buzzer, and the camera stream all
> keep running on the Pi. Only the stove *actuator* is virtualized — a servo becomes
> a web page.

---

## What it is

When `STOVE_WEB_ENABLED=1`, the firmware serves a small interactive knob page directly
from the device (a stdlib HTTP server in a daemon thread, mirroring the camera stream).
The knob stays in sync with the real stove state **both ways**:

- **Knob → backend.** A user turns the knob in the browser. The firmware drives the
  stove on/off, publishes updated MQTT `status` (`stoveStatus: on|off`) so the
  dashboard reflects it, and emits a `STOVE_TURNED_ON` / `STOVE_TURNED_OFF` event into
  history.
- **Backend → knob.** Any cloud-side turn — a manual toggle from the app, a timer
  auto-off, or the **local safety auto-shutoff** — turns the stove and every open knob
  page rotates to match. Auto-shutoff visibly snaps the knob to OFF.

The page is dependency-free (inline HTML/CSS/JS, no build step) and uses the Hestia
"Clinical Precision" light theme: calm steel-blue at rest, amber when the stove is ON,
with state shown as **color + icon + text** (never color alone).

---

## How it works

```
 Browser knob page                Firmware (Raspberry Pi)                 Backend / App
 ┌───────────────┐                ┌──────────────────────┐               ┌────────────┐
 │  drag / tap   │  POST /knob    │  WebKnobBackend       │   MQTT status │            │
 │      ◑        │ ─────────────▶ │   → loop.on_command   │ ────────────▶ │  dashboard │
 │               │                │   → Stove on/off      │   + event log │  + history │
 │   rotates ◑   │ ◀───────────── │   → safety arm/disarm │               │            │
 └───────────────┘   SSE /events  └──────────────────────┘ ◀──────────── │  TURN_ON / │
        ▲                                    ▲              MQTT commands  │  TURN_OFF  │
        └──── auto-shutoff / timer / app turn ┘                           └────────────┘
```

- The knob page serves at `GET /`, pushes live state over `GET /events`
  (Server-Sent Events), and accepts a user turn at `POST /knob` (`{"on": bool}`).
- A browser turn calls `WebKnobBackend.on_manual(on)`, wired in `main.py` to
  `loop.on_command({"command": "TURN_ON"|"TURN_OFF", "source": "knob"})` — so it travels
  the **exact same path** as a backend MQTT command (arms/disarms safety, publishes
  status). The `"knob"` source tag is what makes the firmware log the history event for
  a manual turn (cloud turns are already logged by the backend, so they're not
  double-counted).
- Internally, the knob is injected as the `Stove` actuator backend
  (`Stove(backend=web_knob)`), which bypasses the SG90 servo entirely. Shutting the
  firmware down stops the web server automatically (`stove.close()`).

**Relevant code:** [`firmware/src/stove_web.py`](../firmware/src/stove_web.py) (the
server), [`firmware/web/knob.html`](../firmware/web/knob.html) (the page),
[`firmware/main.py`](../firmware/main.py) (wiring),
[`firmware/src/loop.py`](../firmware/src/loop.py) (event emission).

---

## Setup

### 1. Configure the firmware

In `firmware/.env` (copy from [`.env.example`](../firmware/.env.example) if you haven't):

```bash
# Required device identity + broker (as usual)
DEVICE_ID=<your-device-uuid>          # matches the row in Supabase `devices`
MQTT_BROKER_URL=mqtt://localhost:1883 # local Mosquitto, or mqtt://VULTR_IP:1883

# Turn on the virtual web knob (replaces the servo)
STOVE_WEB_ENABLED=1
STOVE_WEB_HOST=0.0.0.0                 # bind address (0.0.0.0 = reachable on the LAN)
STOVE_WEB_PORT=8090                    # the knob page port
# STOVE_WEB_TOKEN=                     # optional shared secret; leave blank = open
```

| Variable | Default | Meaning |
|---|---|---|
| `STOVE_WEB_ENABLED` | `0` | `1` serves the web knob and uses it instead of the servo. |
| `STOVE_WEB_HOST` | `0.0.0.0` | Bind address. `127.0.0.1` for localhost-only. |
| `STOVE_WEB_PORT` | `8090` | Port the knob page listens on. |
| `STOVE_WEB_TOKEN` | _(blank)_ | Optional secret. When set, `/events` and `/knob` require `?token=…` (or an `X-Knob-Token` header). Blank = open access, which is fine on localhost/LAN. |

### 2. Run the firmware

```bash
cd firmware
python main.py
```

The log prints `Stove knob web UI serving on 0.0.0.0:8090`.

### 3. Open the knob

Visit **`http://localhost:8090/`** (or `http://<device-ip>:8090/` from another device
on the LAN). Tap or drag the knob to turn the stove on/off.

If you set `STOVE_WEB_TOKEN`, open `http://localhost:8090/?token=YOUR_TOKEN` instead.

### Exposing it publicly (optional)

Like the camera stream, point a tunnel (e.g. Cloudflare Tunnel) at the knob port. When
exposed beyond your LAN, **set `STOVE_WEB_TOKEN`** so the knob isn't an open stove
switch, and share the `?token=…` URL.

---

## Verify it end to end

1. **Page loads.** `http://localhost:8090/` shows the knob; the status reads OFF.
2. **Knob → backend.** Turn the knob ON. The firmware log shows a `status` publish with
   `stoveStatus: on` and a `STOVE_TURNED_ON` event; the device's `stove_status` flips
   to `on` in the dashboard and the event appears in its history.
3. **Backend → knob.** Turn the stove off from the app (or `POST
   /api/devices/:deviceId/turn-off`). The open knob page rotates to OFF on its own.
4. **Auto-shutoff.** With the stove ON and no one detected, let the safety timer fire —
   the knob snaps to OFF and an `AUTO_SHUTOFF_TRIGGERED` event is logged.
5. **Multi-tab.** Open two tabs; a turn in one (or any device-driven change) updates both.

---

## Notes

- **Vision unchanged:** presence detection, camera stream, safety, and buzzer all stay
  on the Pi. Only the stove actuator is virtual.
- **Switching back to the servo:** set `STOVE_WEB_ENABLED=0`. The firmware falls back to
  the SG90 servo (or the simulated log-only backend off-Pi / when `STOVE_SIMULATED=1`).
- **Events:** manual knob turns are logged as `STOVE_TURNED_ON`/`STOVE_TURNED_OFF`;
  cloud turns are logged once by the backend (no duplicates).
