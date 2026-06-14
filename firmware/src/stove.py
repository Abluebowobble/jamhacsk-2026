"""Stove power control (SG90 servo on a Raspberry Pi 4B).

The actuator behind FR8 (automatic shutoff) and the TURN_ON / TURN_OFF commands.
The local safety state machine calls ``turn_off()`` for auto-shutoff; the MQTT
command handler calls turn_on/off on backend request.

Hardware: an **SG90 hobby servo** turns the stove knob. To avoid straining the
servo against its hard stops we stop 5° short of each end: **5° is OFF** and
``STOVE_ON_ANGLE`` (default 175°) is ON. On a dev machine (no GPIO) it falls back
to a simulated, log-only backend, so the firmware still runs anywhere.

``turn_off()`` always drives the servo to the OFF angle **from wherever it
currently is** — it is deliberately not idempotent (see the method docstring).
This is the safety-critical path: the servo's real angle is unknown after
power-up, so off must always re-assert the OFF angle.

Config (via env):
- ``STOVE_SERVO_PIN``           BCM pin the servo signal wire is on (default 18).
- ``STOVE_ON_ANGLE``            angle (deg) that means "on" (default 175).
- ``STOVE_SERVO_MIN_PULSE_MS``  pulse width at 0°   (default 0.5 ms — SG90 range).
- ``STOVE_SERVO_MAX_PULSE_MS``  pulse width at 180° (default 2.5 ms).
- ``STOVE_SERVO_SETTLE_S``      seconds to let the servo reach the angle (default 0.5).
"""
import logging
import time

from .actuator import Actuator, SimulatedBackend
from .util import env_float, env_int

log = logging.getLogger("hestia.stove")


def _dbg(*args):
    """Loud, unbuffered debug print so each stove action shows up in the Pi log."""
    print(">>> DBG[stove]", *args, flush=True)

# The stove is OFF when the servo sits at this angle. We stop 5° short of the
# servo's 0° hard stop so it doesn't strain/buzz against the physical limit.
_OFF_ANGLE = 5


class _Sg90Servo:
    """SG90 servo on a GPIO PWM pin via gpiozero.AngularServo (0° = off)."""

    def __init__(self, pin, on_angle, min_pulse_s, max_pulse_s, settle_s):
        import gpiozero  # Pi-only dependency; absent on a dev machine

        self._on_angle = on_angle
        self._settle_s = settle_s
        # initial_angle=_OFF_ANGLE makes the servo assert OFF the moment it's
        # initialised — a safe known state on first use. The angle scale spans the
        # servo's full 0–180° physical range so the 5°/175° targets are reachable;
        # SG90 needs a wider pulse range than gpiozero's default for the full sweep.
        self._servo = gpiozero.AngularServo(
            pin,
            initial_angle=_OFF_ANGLE,
            min_angle=0,
            max_angle=180,
            min_pulse_width=min_pulse_s,
            max_pulse_width=max_pulse_s,
        )
        log.info("Stove backend: SG90 servo pin=%s on_angle=%s°", pin, on_angle)

    def _move_to(self, angle):
        self._servo.angle = angle
        # Hold the pulse long enough for the servo to physically reach the angle
        # (SG90 ≈ 0.1 s/60°, so a full 180° sweep needs a few hundred ms).
        time.sleep(self._settle_s)

    def on(self):
        self._move_to(self._on_angle)

    def off(self):
        self._move_to(_OFF_ANGLE)

    def close(self):
        try:
            self._servo.close()
        except Exception:
            pass


class Stove(Actuator):
    """Stove knob driven by an SG90 servo. 5° = off, ``STOVE_ON_ANGLE`` = on."""

    log = log
    noun = "stove"

    def __init__(self, backend=None):
        # ON angle is read once here so both the backend (in _make_backend) and
        # the angle-derived is_on share one source.
        self._on_angle = env_int("STOVE_ON_ANGLE", 175)
        # Last *commanded* angle. None = never commanded since boot -> treated as
        # off (matches the servo's initial_angle=0 and safe-by-default semantics).
        self._angle = None
        super().__init__(backend=backend)

    def _make_backend(self):
        pin = env_int("STOVE_SERVO_PIN", 18)
        on_angle = self._on_angle
        min_pulse_s = env_float("STOVE_SERVO_MIN_PULSE_MS", 0.5) / 1000.0
        max_pulse_s = env_float("STOVE_SERVO_MAX_PULSE_MS", 2.5) / 1000.0
        settle_s = env_float("STOVE_SERVO_SETTLE_S", 0.5)
        try:
            return _Sg90Servo(pin, on_angle, min_pulse_s, max_pulse_s, settle_s)
        except Exception as exc:
            # gpiozero missing / no pin factory (dev machine) / pin unavailable.
            return SimulatedBackend(log, "Stove", str(exc))

    def turn_on(self):
        """Drive the servo to the ON angle."""
        _dbg("turn_on() called")
        self._drive(True)

    def turn_off(self):
        """Drive the servo to the OFF angle (5°) from ANY current position.

        Deliberately **not** idempotent. After power-up — or if the knob was
        nudged by hand — the servo's physical angle is unknown and the tracked
        state may wrongly read "off". A shutoff actuator must re-assert the OFF
        angle every time it is asked, so the stove always ends up off no matter
        where the servo started. (The base ``Actuator`` skips a no-op transition;
        the stove must not.)
        """
        _dbg("turn_off() called")
        self._drive(False)

    def _drive(self, on):
        """Command the servo to the on/off angle. No idempotency guard: the
        servo's physical position is the source of truth, not the tracked bool,
        so re-asserting the target angle is always correct."""
        target = self._on_angle if on else _OFF_ANGLE
        _dbg("_drive(on=", on, ") -> ensuring backend, target angle=", target)
        try:
            backend = self._ensure()
            _dbg("  backend is:", type(backend).__name__)
            backend.on() if on else backend.off()
            _dbg("  backend.", "on" if on else "off", "() completed")
        except Exception as exc:
            _dbg("  !! backend raised:", repr(exc))
            self.log.exception("stove.turn_%s failed", "on" if on else "off")
            if on:
                return  # couldn't engage — leave reported state unchanged
        self._active = on
        # Record the angle we commanded; is_on derives on/off from this.
        self._angle = target
        _dbg("  state updated: _active=", self._active, "_angle=", self._angle)

    @property
    def is_on(self) -> bool:
        """On/off derived from the commanded angle.

        The stove is ON whenever the commanded angle is anything other than the
        OFF angle (5°). A never-commanded servo (angle None) reports OFF.
        """
        return self._angle is not None and self._angle != _OFF_ANGLE
