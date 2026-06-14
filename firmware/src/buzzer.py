"""Warning buzzer control (GPIO).

The buzzer is the *actuator* half of the warning step in PRD section 12 / FR7:
the local safety state machine (src/safety.py) drives it on when a person has
been absent past the absence timeout, and off again when they return (or after
auto-shutoff). It "receives information" — start/stop signals — and turns sound
on or off accordingly.

On a Raspberry Pi it drives a real GPIO pin via ``gpiozero``; on a dev machine
(no GPIO) it falls back to a simulated, log-only backend so the rest of the
firmware runs unchanged. The on/off + lazy-init + simulated-fallback machinery
is shared with the stove relay in src/actuator.py.

Config (via env):
- ``BUZZER_GPIO_PIN``     BCM pin the buzzer is wired to (default 17).
- ``BUZZER_ACTIVE_HIGH``  "1" (default) if the pin sounds the buzzer when high.
- ``BUZZER_TONE_HZ``      if set, treat as a passive buzzer at this frequency.

Self-test (no MQTT broker, no safety loop needed)::

    python -m src.buzzer          # beep on for 1s, off for 1s, a few times
"""
import logging
import time

from .actuator import Actuator, SimulatedBackend
from .util import env_bool, env_int

log = logging.getLogger("hestia.buzzer")


class _GpioBuzzer:
    """Real buzzer on a GPIO pin via gpiozero (active or tonal/passive)."""

    def __init__(self, pin, active_high, tone_hz):
        # Local import: gpiozero is a Pi-only dependency and may not be
        # installed (or may have no pin factory) on a dev machine.
        import gpiozero

        self._tone_hz = tone_hz
        if tone_hz:
            self._dev = gpiozero.TonalBuzzer(pin)
            log.info("Buzzer backend: gpiozero TonalBuzzer pin=%s tone=%dHz", pin, tone_hz)
        else:
            self._dev = gpiozero.Buzzer(pin, active_high=active_high)
            log.info("Buzzer backend: gpiozero Buzzer pin=%s active_high=%s", pin, active_high)

    def on(self):
        self._dev.play(self._tone_hz) if self._tone_hz else self._dev.on()

    def off(self):
        self._dev.stop() if self._tone_hz else self._dev.off()

    def close(self):
        try:
            self._dev.close()
        except Exception:
            pass


class Buzzer(Actuator):
    """The warning buzzer. ``start()`` / ``stop()`` are idempotent."""

    log = log
    noun = "buzzer"

    def _make_backend(self):
        pin = env_int("BUZZER_GPIO_PIN", 17)
        active_high = env_bool("BUZZER_ACTIVE_HIGH", True)
        tone_hz = env_int("BUZZER_TONE_HZ", 0)
        try:
            return _GpioBuzzer(pin, active_high, tone_hz)
        except Exception as exc:
            # gpiozero missing, no pin factory (dev machine), or pin unavailable.
            return SimulatedBackend(log, "Buzzer", str(exc))

    def start(self):
        """Sound the buzzer (idempotent)."""
        self._apply(True)

    def stop(self):
        """Silence the buzzer (idempotent)."""
        self._apply(False)