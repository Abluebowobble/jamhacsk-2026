"""Hestia Raspberry Pi firmware entry point.

Wires the (complete) MQTT client to the (stubbed) device logic. The feature
modules under src/ are TODO stubs — implement them, then drive them from the
callbacks below. Run with:  python main.py
"""
import logging

from config import load_config
from src import safety, stove
from src.mqtt_client import MqttClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("hestia.main")


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


def main():
    config = load_config()
    client = MqttClient(
        config,
        on_command=handle_command,
        on_settings=handle_settings,
        on_timer=handle_timer,
    )
    log.info("Starting Hestia firmware for device %s", config.device_id)
    try:
        # Connects, announces online status, subscribes, and auto-reconnects.
        client.loop_forever()
    except KeyboardInterrupt:
        log.info("Shutting down…")
        client.stop()


if __name__ == "__main__":
    main()
