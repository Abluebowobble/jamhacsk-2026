"""Stove power control (relay / ESP32).

STUB — not implemented yet. See PRD section 8 (FR8).
"""
import logging

log = logging.getLogger("hestia.stove")


def turn_on():
    """Power the stove on."""
    # TODO: drive the relay / send an ESP32 command to power the stove on.
    log.warning("stove.turn_on() not implemented yet")


def turn_off():
    """Cut stove power."""
    # TODO: drive the relay / send an ESP32 command to cut stove power.
    log.warning("stove.turn_off() not implemented yet")
