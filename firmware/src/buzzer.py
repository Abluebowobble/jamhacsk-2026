"""Warning buzzer control (GPIO).

STUB — not implemented yet. See PRD section 7 (FR7).
"""
import logging

log = logging.getLogger("hestia.buzzer")


def start():
    """Start the warning buzzer."""
    # TODO: drive the buzzer GPIO pin on (e.g. via gpiozero).
    log.warning("buzzer.start() not implemented yet")


def stop():
    """Stop the warning buzzer."""
    # TODO: drive the buzzer GPIO pin off.
    log.warning("buzzer.stop() not implemented yet")
