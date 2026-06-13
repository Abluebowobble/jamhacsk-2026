# Hestia Firmware (Raspberry Pi 4)

Local device firmware for a Hestia smart-stove-safety unit. Runs on a
Raspberry Pi 4 with a Pi Camera (presence detection), a buzzer, and a
relay/ESP32 for stove power.

Per the PRD, **critical safety logic runs locally** — the Pi decides on shutoff
even when the cloud is unreachable. The cloud backend is only for remote
visibility, configuration, notifications, and history.

> Status: **MQTT communication and camera presence detection are implemented.**
> The safety state machine, the buzzer, and stove control are **stubs** — ready
> to implement, not done yet.

## Layout

```
firmware/
├── main.py            # entry point: wires MQTT to device logic
├── config.py          # loads config from .env
├── requirements.txt
├── .env.example       # copy to .env
└── src/
    ├── mqtt_client.py # MQTT client (COMPLETE)
    ├── messages.py    # topic + payload contract (shared shape w/ backend)
    ├── presence.py    # camera presence detection (COMPLETE)
    ├── safety.py      # absence/warning/shutoff state machine (STUB)
    ├── buzzer.py      # warning buzzer GPIO (STUB)
    └── stove.py       # stove relay / ESP32 control (STUB)
```

## Setup

```bash
cd firmware
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then fill in DEVICE_ID + MQTT_BROKER_URL
python main.py
```

`DEVICE_ID` must match a row in the Supabase `devices` table. `MQTT_BROKER_URL`
must point at the **same broker the backend uses**.

## MQTT contract

Topics are `hestia/devices/{DEVICE_ID}/<kind>` (PRD section 20).

| Direction | Topic kind | Purpose |
|---|---|---|
| Pi → backend | `status` | online, stoveStatus, presence, buzzer, activeTimerSecondsRemaining (retained) |
| Pi → backend | `presence` | `detected` / `not_detected` |
| Pi → backend | `events` | safety events (e.g. `WARNING_BUZZER_STARTED`, `AUTO_SHUTOFF_TRIGGERED`) |
| backend → Pi | `commands` | `TURN_ON` / `TURN_OFF` |
| backend → Pi | `settings` | `absenceTimeoutSeconds`, `warningDelaySeconds` |
| backend → Pi | `timers` | `TIMER_STARTED` / `TIMER_CANCELLED` |

The Pi sets an MQTT **Last Will** on `status` (`online:false`), so an
unexpected drop automatically marks the device offline in the dashboard.

### Publishing from device code

```python
client.publish_status(online=True, stove_status="on", presence="detected")
client.publish_presence(True)                 # person detected
client.publish_event("WARNING_BUZZER_STARTED")
```

### Receiving from the backend

`main.py` registers `handle_command`, `handle_settings`, and `handle_timer`.
Fill those in (and the stubs they call) to drive real hardware.

## Connecting to the backend end-to-end

Both sides need a running MQTT broker (e.g. Mosquitto).

1. Start a broker reachable by both the Pi and the backend host.
2. Set the Pi's `MQTT_BROKER_URL` in `firmware/.env`.
3. Set the backend's `MQTT_BROKER_URL` in `backend/.env` (it currently ships
   as `off`).
4. Run the backend, then `python main.py` here.

## Presence detection (vision)

`presence.py` decides whether a **person** (not a pet — animal classes are
ignored) is near the stove and publishes it over MQTT (`presence` topic), and
feeds `safety.on_presence()` for the future safety loop. **Presence-only for
now**, but built to extend.

- **Detector:** OpenCV DNN MobileNet-SSD ("person" class). Falls back to OpenCV
  HOG automatically if the model files are absent — see
  [models/README.md](models/README.md) to download the model for full accuracy.
- **Camera:** picamera2 on the Pi; OpenCV `VideoCapture` fallback so you can dev
  against a laptop webcam.
- **Debounced:** a presence change must persist for N frames before it's trusted
  (avoids flicker / event spam). Publishes presence only on a stable flip, plus
  a periodic retained `status` heartbeat.
- **Graceful:** if no camera / vision libs are available, the firmware logs a
  warning and keeps MQTT running (commands/settings still work).
- **Tunable** via env (confidence, ROI, min box size, debounce) — see
  `.env.example`.

### Verify the vision (no MQTT broker needed)

```bash
pip install opencv-python numpy        # vision deps
python -m src.presence                 # live webcam: draws boxes + prints state
python -m src.presence --image cat.jpg # person vs pet check (deterministic)
```

## TODO (feature implementation)

- [x] `presence.py` — camera person detection (OpenCV DNN MobileNet-SSD / HOG)
- [ ] `safety.py` — absence-timeout → warning-delay → auto-shutoff state machine
      (hook ready: `safety.on_presence()`)
- [ ] `buzzer.py` — buzzer GPIO on/off
- [ ] `stove.py` — relay / ESP32 stove power control
- [x] Periodic `publish_status` heartbeat from the main loop
- [ ] Camera stream endpoint (PRD section 13)
