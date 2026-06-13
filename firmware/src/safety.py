"""Local absence-timeout / warning-delay / auto-shutoff state machine.

STUB — not implemented yet. This is the heart of PRD section 12 and MUST run
locally so shutoff works even when the cloud is unavailable. For now it only
stores the settings pushed from the backend; no timing logic yet.
"""
import logging

log = logging.getLogger("hestia.safety")

# Defaults mirror the devices table (PRD section 18.4).
_settings = {"absence_timeout_seconds": 300, "warning_delay_seconds": 30}


def update_settings(absence_timeout_seconds=None, warning_delay_seconds=None):
    """Apply safety settings pushed from the backend over MQTT."""
    if absence_timeout_seconds is not None:
        _settings["absence_timeout_seconds"] = absence_timeout_seconds
    if warning_delay_seconds is not None:
        _settings["warning_delay_seconds"] = warning_delay_seconds
    log.info("Safety settings now: %s", _settings)
    # TODO: re-arm the absence/warning timers using the new values.


def get_settings():
    return dict(_settings)


# TODO: implement the absence -> warning -> auto-shutoff state machine
# (PRD section 12.1), driving buzzer.start()/stop() and stove.turn_off().
