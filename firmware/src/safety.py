"""Local absence-timeout / warning-delay / auto-shutoff state machine.

This is the heart of PRD section 12 and MUST run locally so shutoff works even
when the cloud is unavailable (PRD section 22, Reliability). It is the
firmware's *own* logic: it consumes presence + stove state, evaluates the
absence/warning timers on every tick, and drives the buzzer and stove relay
directly — no MQTT round-trip required.

Flow (PRD 12.1), only active while the stove is ON::

    person present ──> monitoring (timers cleared)
    person absent  ──> absence timer running
        absence timer >= absence_timeout ──> buzzer ON, warning timer running
            person returns                ──> buzzer OFF, back to monitoring
            warning timer >= warning_delay ──> stove OFF (auto-shutoff)

It is **tick-driven**: ``tick(now)`` is called every loop iteration with a
monotonic timestamp, so the time-based transitions (timeout, warning delay)
fire from the loop rather than from threads/timers. ``on_presence`` and
``set_stove`` feed in the event-based inputs.

The controller never publishes to MQTT itself (so it keeps working with no
broker). Instead it reports *actions it took* through the ``on_event`` callback
— the main loop forwards those as event logs (with the device id) when a broker
is available.
"""
import logging
import time
from enum import Enum
from typing import Callable, Optional

log = logging.getLogger("hestia.safety")


class State(Enum):
    DISARMED = "disarmed"        # stove OFF — no safety timers running
    MONITORING = "monitoring"    # stove ON, person present
    ABSENCE = "absence"          # stove ON, person absent, absence timer running
    WARNING = "warning"          # stove ON, absent past timeout, buzzer sounding


# Defaults mirror the devices table (PRD section 18.4).
_DEFAULTS = {"absence_timeout_seconds": 300, "warning_delay_seconds": 30}


class SafetyController:
    """Absence -> warning -> auto-shutoff state machine (local, tick-driven).

    Parameters
    ----------
    buzzer, stove
        Actuators exposing ``start()/stop()`` and ``turn_off()/turn_on()``
        respectively (src.buzzer.Buzzer / src.stove.Stove, or the modules).
    on_event
        ``callback(event_type: str, metadata: dict)`` invoked whenever the
        firmware takes a safety action worth logging (buzzer start, warning
        cancel, auto-shutoff). The loop turns these into MQTT event logs.
    time_fn
        Monotonic clock source (injectable for tests). Defaults to
        ``time.monotonic``.
    """

    def __init__(self, *, buzzer, stove,
                 on_event: Optional[Callable[[str, dict], None]] = None,
                 absence_timeout_seconds: Optional[int] = None,
                 warning_delay_seconds: Optional[int] = None,
                 time_fn: Callable[[], float] = time.monotonic):
        self._buzzer = buzzer
        self._stove = stove
        self._on_event = on_event
        self._now = time_fn

        self._settings = dict(_DEFAULTS)
        if absence_timeout_seconds is not None:
            self._settings["absence_timeout_seconds"] = absence_timeout_seconds
        if warning_delay_seconds is not None:
            self._settings["warning_delay_seconds"] = warning_delay_seconds

        self._state = State.DISARMED
        self._present: Optional[bool] = None   # last known presence (None = unknown)
        self._absent_since: Optional[float] = None
        self._warning_since: Optional[float] = None

    # --- inputs -------------------------------------------------------------
    def update_settings(self, absence_timeout_seconds=None, warning_delay_seconds=None):
        """Apply safety settings pushed from the backend over MQTT."""
        if absence_timeout_seconds is not None:
            self._settings["absence_timeout_seconds"] = int(absence_timeout_seconds)
        if warning_delay_seconds is not None:
            self._settings["warning_delay_seconds"] = int(warning_delay_seconds)
        log.info("Safety settings now: %s", self._settings)

    def get_settings(self) -> dict:
        return dict(self._settings)

    def set_stove(self, on: bool, source: str = "unknown"):
        """Record that the stove was switched on/off (command, timer, or auto).

        Arming the safety machine only happens while the stove is ON; turning it
        off disarms and clears any warning in progress.
        """
        if on:
            if self._state == State.DISARMED:
                log.info("Stove ON (source=%s) — arming safety monitor", source)
                # Arm according to the latest known presence.
                if self._present is False:
                    self._enter_absence()
                else:
                    self._enter_monitoring()
        else:
            if self._state != State.DISARMED:
                log.info("Stove OFF (source=%s) — disarming safety monitor", source)
            self._disarm()

    def snooze(self, seconds: int):
        """Postpone the auto-shutoff by ``seconds`` ("add time" from the app).

        Only meaningful while the safety monitor is armed and the person is
        absent (ABSENCE or WARNING). Silences the buzzer and re-enters ABSENCE
        with the absence anchor shifted so the warning fires again in exactly
        ``seconds`` — this reuses ``tick()`` and keeps ``seconds_until_action``
        / ``snapshot`` correct with no extra state. A no-op while DISARMED or
        MONITORING (nothing to extend).
        """
        try:
            seconds = int(seconds)
        except (TypeError, ValueError):
            log.warning("snooze: ignoring non-numeric seconds %r", seconds)
            return
        if seconds <= 0:
            log.warning("snooze: ignoring non-positive seconds %s", seconds)
            return
        if self._state not in (State.ABSENCE, State.WARNING):
            log.info("snooze: ignored — nothing to extend (state=%s)", self._state.value)
            return

        if self._state == State.WARNING:
            self._stop_buzzer()
        # Shift the anchor so `absence_timeout - elapsed == seconds` at the next
        # tick: elapsed = now - absent_since, and warning fires at elapsed >=
        # absence_timeout, so absent_since = now - (absence_timeout - seconds).
        timeout = self._settings["absence_timeout_seconds"]
        self._state = State.ABSENCE
        self._absent_since = self._now() - (timeout - seconds)
        self._warning_since = None
        log.info("Snoozed — auto-shutoff postponed by %ss", seconds)
        self._emit("WARNING_SNOOZED", {"seconds": seconds})

    def on_presence(self, detected: bool):
        """Feed a debounced presence change into the safety logic.

        detected=True  -> cancel absence timer / warning buzzer (person is back)
        detected=False -> start the absence timer (if the stove is on)
        """
        self._present = detected
        if self._state == State.DISARMED:
            return  # stove off: track presence but take no action

        if detected:
            # Person returned — if we were warning, that's a cancelled warning.
            if self._state == State.WARNING:
                self._stop_buzzer()
                self._emit("WARNING_CANCELLED", {"reason": "person_returned"})
            self._enter_monitoring()
        else:
            if self._state == State.MONITORING:
                self._enter_absence()

    def tick(self, now: Optional[float] = None):
        """Advance time-based transitions. Call once per main-loop iteration."""
        if now is None:
            now = self._now()

        if self._state == State.ABSENCE and self._absent_since is not None:
            elapsed = now - self._absent_since
            if elapsed >= self._settings["absence_timeout_seconds"]:
                self._enter_warning(now)

        elif self._state == State.WARNING and self._warning_since is not None:
            elapsed = now - self._warning_since
            if elapsed >= self._settings["warning_delay_seconds"]:
                self._auto_shutoff()

    # --- state transitions --------------------------------------------------
    def _enter_monitoring(self):
        self._state = State.MONITORING
        self._absent_since = None
        self._warning_since = None

    def _enter_absence(self):
        self._state = State.ABSENCE
        self._absent_since = self._now()
        self._warning_since = None
        log.info("Absence timer started (%ss to warning)",
                 self._settings["absence_timeout_seconds"])

    def _enter_warning(self, now):
        self._state = State.WARNING
        self._warning_since = now
        self._start_buzzer()
        log.warning("Absence timeout reached — buzzer ON (%ss to auto-shutoff)",
                    self._settings["warning_delay_seconds"])
        self._emit("WARNING_BUZZER_STARTED", {
            "absenceTimeoutSeconds": self._settings["absence_timeout_seconds"],
            "warningDelaySeconds": self._settings["warning_delay_seconds"],
        })

    def _auto_shutoff(self):
        log.warning("Warning delay elapsed, no person — AUTO-SHUTOFF")
        self._stop_buzzer()
        try:
            self._stove.turn_off()
        except Exception:
            log.exception("auto-shutoff: stove.turn_off failed")
        self._emit("AUTO_SHUTOFF_TRIGGERED", {
            "reason": "absence_timeout_and_warning_delay_elapsed",
        })
        self._disarm()

    def _disarm(self):
        if self._buzzer is not None:
            self._stop_buzzer()
        self._state = State.DISARMED
        self._absent_since = None
        self._warning_since = None

    # --- actuator helpers ---------------------------------------------------
    def _start_buzzer(self):
        try:
            self._buzzer.start()
        except Exception:
            log.exception("buzzer.start failed")

    def _stop_buzzer(self):
        try:
            self._buzzer.stop()
        except Exception:
            log.exception("buzzer.stop failed")

    def _emit(self, event_type: str, metadata: dict):
        if self._on_event is None:
            return
        try:
            self._on_event(event_type, metadata)
        except Exception:
            log.exception("safety on_event callback failed")

    # --- introspection (for status / sensor publishing) ---------------------
    @property
    def state(self) -> State:
        return self._state

    def buzzer_on(self) -> bool:
        return bool(getattr(self._buzzer, "active", False))

    def seconds_until_action(self, now: Optional[float] = None) -> Optional[float]:
        """Seconds until the next automatic transition (warning or shutoff)."""
        if now is None:
            now = self._now()
        if self._state == State.ABSENCE and self._absent_since is not None:
            return max(0.0, self._settings["absence_timeout_seconds"]
                       - (now - self._absent_since))
        if self._state == State.WARNING and self._warning_since is not None:
            return max(0.0, self._settings["warning_delay_seconds"]
                       - (now - self._warning_since))
        return None

    def snapshot(self) -> dict:
        """Current safety state, for building a status/sensor payload."""
        return {
            "state": self._state.value,
            "presence": self._present,
            "buzzer": "on" if self.buzzer_on() else "off",
            "secondsUntilAction": self.seconds_until_action(),
            "settings": self.get_settings(),
        }
