"""Hestia Raspberry Pi firmware entry point.

Assembles the device and runs the firmware logic loop (see src/loop.py). Each
loop tick: sync inbound MQTT requests -> run the local safety logic -> publish
action logs + sensor data back. The loop keeps running even with no broker, and
all critical safety decisions (buzzer + auto-shutoff) happen locally.

The camera presence vision is also re-served as a token-gated MJPEG stream
(src/camera_stream.py) when a camera + shared secret are available.

Run with:  python main.py
"""
import logging

from config import load_config
from src import camera_stream, presence, stove_web
from src.buzzer import Buzzer
from src.loop import FirmwareLoop
from src.mqtt_client import MqttClient
from src.safety import SafetyController
from src.state import AssignmentStore
from src.stove import Stove

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("hestia.main")

# How often to capture + run presence detection and advance the safety logic
# (seconds). ~2 Hz keeps Pi 4 CPU comfortable while staying responsive.
POLL_INTERVAL_SECONDS = 0.5
# How often to publish a full status heartbeat regardless of changes.
STATUS_HEARTBEAT_SECONDS = 30


def main():
    config = load_config()
    log.info("Starting Hestia firmware for device %s", config.device_id)

    # The household this device belongs to is learned at runtime (the backend
    # publishes it to the retained assignment topic on pair/unpair) and persisted
    # locally. Prefer the persisted value; fall back to the optional .env seed.
    state = AssignmentStore(config.state_file)
    household_id = state.load() or config.household_id
    if household_id:
        log.info("Loaded household assignment: %s", household_id)
    else:
        log.info("No household assignment yet — idle until paired")

    # Actuators (lazy hardware init; simulated automatically off-Pi).
    buzzer = Buzzer()
    # The stove actuator is either the SG90 servo (default) or a virtual web knob.
    # When STOVE_WEB_ENABLED, we inject a WebKnobBackend so the stove is driven by
    # an interactive browser page instead of a servo — the injected backend bypasses
    # _make_backend() entirely, so no GPIO/servo is touched. on_manual is wired to
    # the loop below (after it exists) so a browser turn travels the same path as an
    # MQTT command. stove.close() stops the web server (Actuator.close -> backend.close).
    web_knob = None
    if config.stove_web_enabled:
        web_knob = stove_web.WebKnobBackend(
            host=config.stove_web_host,
            port=config.stove_web_port,
            token=config.stove_web_token,
        )
        stove = Stove(backend=web_knob)
    else:
        stove = Stove()

    # Local safety state machine (the firmware's own logic). Drives the buzzer
    # and stove directly and reports the actions it takes via on_event.
    safety = SafetyController(buzzer=buzzer, stove=stove)

    # MQTT client. The loop's callbacks only enqueue; handling is on the main
    # thread. start_resilient() means a down broker never crashes us.
    loop = FirmwareLoop(
        config=config,
        client=None,  # set below once it can use the loop's enqueueing callbacks
        safety=safety,
        stove=stove,
        state=state,
        poll_interval=POLL_INTERVAL_SECONDS,
        status_heartbeat=STATUS_HEARTBEAT_SECONDS,
    )
    client = MqttClient(
        config,
        household_id=household_id,
        on_command=loop.on_command,
        on_settings=loop.on_settings,
        on_timer=loop.on_timer,
        on_assignment=loop.on_assignment,
    )
    loop.set_client(client)

    # Wire the web knob to the loop now that it exists, then start serving. A user
    # turning the knob in the browser calls on_manual(on) -> loop.on_command(...),
    # exactly like a backend MQTT command (arms/disarms safety, publishes status,
    # and logs a STOVE_TURNED_ON/OFF event via the "knob" source tag).
    if web_knob is not None:
        web_knob.on_manual = lambda on: loop.on_command(
            {"command": "TURN_ON" if on else "TURN_OFF", "source": "knob"}
        )
        web_knob.start()

    # Presence vision is optional: on a dev machine without a camera/vision libs
    # we keep everything else running (MQTT + safety still work).
    try:
        monitor = presence.PresenceMonitor()
        monitor.start()
        loop.attach_monitor(monitor)
    except presence.PresenceUnavailable as exc:
        monitor = None
        log.warning("Presence detection disabled: %s", exc)

    # The MJPEG camera stream re-serves frames from the presence monitor, so it
    # only runs when presence (and thus a camera) is available and a shared
    # secret is configured. The browser connects directly (see camera_stream.py).
    stream_server = None
    if monitor is not None and config.camera_stream_enabled:
        if config.camera_stream_secret:
            stream_server = camera_stream.start(monitor, config)
        else:
            log.warning("Camera stream disabled: CAMERA_STREAM_SECRET not set")

    # Connect in the background and run the network loop; never raises if the
    # broker is unreachable at boot.
    client.start_resilient()

    try:
        loop.run()
    except KeyboardInterrupt:
        log.info("Shutting down…")
    finally:
        loop.stop()
        if stream_server is not None:
            stream_server.stop()
        if monitor is not None:
            monitor.stop()
        buzzer.close()
        stove.close()
        client.stop()


if __name__ == "__main__":
    main()
