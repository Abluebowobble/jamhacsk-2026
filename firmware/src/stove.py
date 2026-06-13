"""Stove power control (relay).

The actuator behind FR8 (automatic shutoff) and the TURN_ON / TURN_OFF commands
(PRD section 20). The local safety state machine calls ``turn_off()`` when it
decides to auto-shut the stove; the MQTT command handler calls turn_on/off on
backend request.

On a Pi it toggles a relay GPIO pin via ``gpiozero``; on a dev machine (no GPIO)
it falls back to a simulated, log-only backend. The on/off + lazy-init +
simulated-fallback machinery is shared with the buzzer in src/actuator.py.

The real physical shutoff mechanism (relay vs. ESP32 over MQTT) is PRD open
question #4. This module isolates that choice behind ``_GpioRelay``; swap it for
an ESP32 transport without touching the safety logic.

Config (via env):
- ``STOVE_RELAY_PIN``     BCM pin the relay is wired to (default 27).
- ``STOVE_ACTIVE_HIGH``   "1" (default) if the pin energises the relay when high.
"""
import logging

from .actuator import Actuator, SimulatedBackend
from .util import env_bool, env_int

log = logging.getLogger("hestia.stove")


class _GpioRelay:
    """Stove power relay on a GPIO pin via gpiozero."""

    def __init__(self, pin, active_high):
        import gpiozero

        # OutputDevice (not Relay) keeps it generic; active_high matches wiring.
        self._dev = gpiozero.OutputDevice(
            pin, active_high=active_high, initial_value=False
        )
        log.info("Stove backend: gpiozero relay pin=%s active_high=%s", pin, active_high)

    def on(self):
        self._dev.on()

    def off(self):
        self._dev.off()

    def close(self):
        try:
            self._dev.close()
        except Exception:
            pass


class Stove(Actuator):
    """The stove power relay. ``turn_on()`` / ``turn_off()`` are idempotent."""

    log = log
    noun = "stove"

    def _make_backend(self):
        pin = env_int("STOVE_RELAY_PIN", 27)
        active_high = env_bool("STOVE_ACTIVE_HIGH", True)
        try:
            return _GpioRelay(pin, active_high)
        except Exception as exc:
            return SimulatedBackend(log, "Stove", str(exc))

    def turn_on(self):
        """Power the stove on (idempotent)."""
        self._apply(True)

    def turn_off(self):
        """Cut stove power (idempotent)."""
        self._apply(False)

    @property
    def is_on(self) -> bool:
        return self.active
