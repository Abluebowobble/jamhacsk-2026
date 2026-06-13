# Hestia Firmware (Raspberry Pi 4)

Local device firmware for a Hestia smart-stove-safety unit. Runs on a
Raspberry Pi 4 with a Pi Camera (presence detection), a buzzer, and a
relay for stove power.

Per the PRD, **critical safety logic runs locally** — the Pi decides on shutoff
even when the cloud is unreachable. The cloud backend is only for remote
visibility, configuration, notifications, and history.

> Status: **Implemented** — MQTT, camera presence detection, the local safety
> state machine (absence → warning → auto-shutoff), the buzzer, stove control,
> and the firmware logic loop that ties them together. Buzzer + stove fall back
> to a simulated backend off-Pi, so the whole thing runs on a dev machine.

## Layout

```
firmware/
├── main.py            # entry point: wires MQTT to device logic
├── config.py          # loads config from .env
├── requirements.txt
├── .env.example       # copy to .env
└── src/
    ├── loop.py        # firmware logic loop: sync MQTT → run safety → publish
    ├── mqtt_client.py # MQTT client
    ├── messages.py    # topic + payload contract (shared shape w/ backend)
    ├── presence.py    # camera presence detection
    ├── safety.py      # absence/warning/shutoff state machine (local, tick-driven)
    ├── buzzer.py      # warning buzzer GPIO (real or simulated)
    └── stove.py       # stove relay / ESP32 control (real or simulated)
```

## Logic loop

`main.py` builds the device and runs `src/loop.py`, whose every tick does three
things **in order**:

1. **Sync** — drain inbound MQTT requests (`commands` / `settings` / `timers`)
   that arrived since the last tick and apply them.
2. **Logic** — run the firmware's own evaluation: read the camera, advance the
   absence → warning → auto-shutoff state machine, tick the cooking timer. This
   drives the buzzer + stove **locally**, with no cloud round-trip.
3. **Publish** — send results *back* to MQTT, best-effort: **action logs** (each
   tagged with this `deviceId` — "which device did what") plus **sensor data**
   (presence on change + a periodic status heartbeat).

The loop **never breaks without MQTT**: the broker connects asynchronously, and
publishing is best-effort, so a broker outage just means the device keeps
running its safety logic locally and reports nothing until the broker is back.

## Setup

Target hardware is a **Raspberry Pi 4B** running Raspberry Pi OS (Bookworm),
with the Pi Camera, a buzzer on a GPIO pin, and a relay/ESP32 for stove power.

```bash
cd firmware
python3 -m venv .venv --system-site-packages   # so the apt-installed picamera2 is visible
source .venv/bin/activate                       # Windows dev: .venv\Scripts\activate
sudo apt install -y python3-picamera2 python3-lgpio   # Pi camera + GPIO backend
pip install -r requirements.txt
cp .env.example .env                            # then fill in DEVICE_ID + MQTT_BROKER_URL
python main.py
```

On the Pi 4B, gpiozero auto-selects the **lgpio** pin factory (installed above),
so the buzzer + stove GPIO work with no extra configuration. On a dev machine
(no GPIO/camera) the firmware logs and uses simulated backends, so the same
`python main.py` runs anywhere.

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
- [x] `safety.py` — absence-timeout → warning-delay → auto-shutoff state machine
      (tick-driven `SafetyController`)
- [x] `buzzer.py` — buzzer GPIO on/off (real or simulated)
- [x] `stove.py` — relay / ESP32 stove power control (real or simulated)
- [x] `loop.py` — firmware logic loop (sync → safety → publish)
- [x] Periodic `publish_status` heartbeat from the main loop
- [ ] Camera stream endpoint (PRD section 13)
- [ ] Swap stove's `_GpioRelay` for the real ESP32 transport (PRD open Q#4)
