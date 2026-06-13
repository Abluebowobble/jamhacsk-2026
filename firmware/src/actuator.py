"""Shared scaffolding for simple on/off GPIO actuators (buzzer, stove relay).

The buzzer and the stove relay are the same shape: a GPIO device that is either
ON or OFF, lazily initialised, with a no-op *simulated* backend so the firmware
runs on a machine without GPIO. This collapses that shared structure into one
place — ``buzzer.py`` / ``stove.py`` only supply the device-specific GPIO
backend and their own semantic method names.

A "backend" is any object with ``on()``, ``off()`` and ``close()``.
"""
import logging


class SimulatedBackend:
    """No-op actuator backend for dev machines without GPIO — logs only."""

    def __init__(self, log, label, reason):
        self._log = log
        self._label = label
        log.info("%s backend: SIMULATED (%s) — no real hardware will switch",
                 label, reason)

    def on(self):
        self._log.warning("[SIM %s] *** ON ***", self._label)

    def off(self):
        self._log.info("[SIM %s] OFF", self._label)

    def close(self):
        pass


class Actuator:
    """Lazy-initialised on/off device with idempotent transitions.

    Subclasses set ``log`` + ``noun`` (for messages) and implement
    ``_make_backend()`` -> a backend object. The backend is built on first use,
    so importing a subclass never touches hardware.
    """

    log = logging.getLogger("hestia.actuator")
    noun = "actuator"

    def __init__(self, backend=None):
        self._backend = backend
        self._active = False

    def _make_backend(self):  # pragma: no cover - overridden
        raise NotImplementedError

    def _ensure(self):
        if self._backend is None:
            self._backend = self._make_backend()
        return self._backend

    @property
    def active(self) -> bool:
        return self._active

    def _apply(self, on: bool):
        """Drive the device on/off. Idempotent; failures never raise."""
        if on == self._active:
            return
        try:
            backend = self._ensure()
            backend.on() if on else backend.off()
        except Exception:
            self.log.exception("%s.%s failed", self.noun, "on" if on else "off")
            if on:
                return  # couldn't turn on — stay inactive
        self._active = on

    def close(self):
        if self._backend is None:
            return
        try:
            self._apply(False)
        finally:
            self._backend.close()
