"""Hestia Raspberry Pi firmware entry point.

Wires the (complete) MQTT client to the device logic. The presence *vision* is
implemented (src/presence.py) and re-served as an MJPEG stream (src/camera_stream.py);
the buzzer / stove / safety state machine are still stubs — implement them, then
drive them from presence via safety.on_presence(). Run with:  python main.py
"""
import logging
import time

from config import load_config
from src import camera_stream, presence, safety, stove
from src.mqtt_client import MqttClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("hestia.main")

# How often to capture + run presence detection (seconds). ~2 FPS keeps Pi 4
# CPU comfortable while staying responsive.
POLL_INTERVAL_SECONDS = 0.5
# How often to publish a full status heartbeat regardless of changes.
STATUS_HEARTBEAT_SECONDS = 30


def handle_command(payload):
    """Backend -> Pi command (e.g. TURN_ON / TURN_OFF)."""
    command = payload.get("command")
    log.info("Command: %s (source=%s)", command, payload.get("source"))
    if command == "TURN_ON":
        stove.turn_on()
    elif command == "TURN_OFF":
        stove.turn_off()
    else:
        log.warning("Unknown command: %s", command)


def handle_settings(payload):
    """Backend -> Pi safety settings update."""
    log.info("Settings: %s", payload)
    safety.update_settings(
        absence_timeout_seconds=payload.get("absenceTimeoutSeconds"),
        warning_delay_seconds=payload.get("warningDelaySeconds"),
    )


def handle_timer(payload):
    """Backend -> Pi timer event (TIMER_STARTED / TIMER_CANCELLED)."""
    log.info("Timer: %s", payload)
    # TODO: integrate timer with the safety/stove behavior.


def run_presence_loop(client, monitor):
    """Poll the camera, publish presence on change + a periodic heartbeat.

    Presence is published only on a debounced state flip (the backend logs an
    event for every presence message, so we avoid spamming). Status is a
    retained heartbeat that always reflects the latest presence.
    """
    last_heartbeat = 0.0
    while True:
        monitor.poll()  # captures, detects, debounces, may fire on_change

        now = time.monotonic()
        if now - last_heartbeat >= STATUS_HEARTBEAT_SECONDS:
            present = monitor.state
            client.publish_status(
                online=True,
                presence="detected" if present else "not_detected",
            )
            last_heartbeat = now

        time.sleep(POLL_INTERVAL_SECONDS)


def main():
    config = load_config()
    client = MqttClient(
        config,
        on_command=handle_command,
        on_settings=handle_settings,
        on_timer=handle_timer,
    )
    log.info("Starting Hestia firmware for device %s", config.device_id)

    # Network loop runs in the background so the main thread can drive the
    # camera. start() connects, announces online, and auto-reconnects.
    client.start()

    # Publish presence (and feed the safety loop) whenever the debounced state
    # flips. on_change is the seam for safety.on_presence() to drive the absence
    # timer later, with no change to the loop below.
    def on_presence_change(detected):
        client.publish_presence(detected)
        safety.on_presence(detected)

    monitor = None
    try:
        monitor = presence.PresenceMonitor(on_change=on_presence_change)
        monitor.start()
    except presence.PresenceUnavailable as exc:
        # No camera / vision libs (e.g. running on a dev machine). Keep MQTT
        # alive so commands/settings still work; just skip presence.
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

    try:
        if monitor is not None:
            run_presence_loop(client, monitor)
        else:
            # No vision — idle so the MQTT background loop keeps serving.
            while True:
                time.sleep(STATUS_HEARTBEAT_SECONDS)
                client.publish_status(online=True)
    except KeyboardInterrupt:
        log.info("Shutting down…")
    finally:
        if stream_server is not None:
            stream_server.stop()
        if monitor is not None:
            monitor.stop()
        client.stop()


if __name__ == "__main__":
    main()
