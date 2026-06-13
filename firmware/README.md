# Hestia Firmware (Raspberry Pi 4)

Local device firmware for a Hestia smart-stove-safety unit. Runs on a
Raspberry Pi 4 with a Pi Camera (presence detection), a buzzer, and a
relay/ESP32 for stove power.

Per the PRD, **critical safety logic runs locally** — the Pi decides on shutoff
even when the cloud is unreachable. The cloud backend is only for remote
visibility, configuration, notifications, and history.

> Status: **MQTT communication is implemented.** Camera presence detection,
> the safety state machine, the buzzer, and stove control are **stubs** — ready
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
    ├── presence.py    # camera presence detection (STUB)
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

## TODO (feature implementation)

- [ ] `presence.py` — camera person detection (picamera2 + OpenCV)
- [ ] `safety.py` — absence-timeout → warning-delay → auto-shutoff state machine
- [ ] `buzzer.py` — buzzer GPIO on/off
- [ ] `stove.py` — relay / ESP32 stove power control
- [ ] Periodic `publish_status` heartbeat from the main loop
- [ ] Camera stream endpoint (PRD section 13)
