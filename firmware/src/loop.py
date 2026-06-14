"""Firmware main logic loop — the orchestrator.

Each iteration ("tick") runs three phases, in this order (per the device design):

  1. SYNC    — drain inbound MQTT requests (commands / settings / timers) that
               arrived since the last tick, and apply them.
  2. LOGIC   — run the firmware's *own* safety evaluation: read the camera
               sensor, advance the absence/warning/auto-shutoff state machine,
               and tick the cooking timer. This drives the buzzer + stove relay
               locally and decides shutoff without any cloud involvement.
  3. PUBLISH — send results *back* to MQTT, best-effort: logs of the actions the
               firmware took (each tagged with this device's id) plus sensor
               data (presence + a periodic status heartbeat).

Key properties:
- **Never breaks without MQTT.** The MQTT client connects asynchronously and the
  whole tick is wrapped so a broker outage (or any publish failure) is logged
  and swallowed — the safety logic keeps running locally regardless.
- **Deterministic ordering.** paho delivers messages on a background thread; we
  only *enqueue* there and drain on the main loop thread, so "sync first, then
  logic, then publish" holds exactly, with no races against the state machine.
"""
import logging
import queue
import time
from typing import Optional

log = logging.getLogger("hestia.loop")


class FirmwareLoop:
    def __init__(self, *, config, client, safety, stove, state=None, monitor=None,
                 poll_interval=0.5, status_heartbeat=30.0,
                 time_fn=time.monotonic):
        self.cfg = config
        self.device_id = config.device_id
        self._client = client
        self._safety = safety
        self._stove = stove
        # Persistent household assignment store (src.state.AssignmentStore).
        self._state = state
        self._monitor = monitor
        self._poll_interval = poll_interval
        self._status_heartbeat = status_heartbeat
        self._now = time_fn

        # Paired = we belong to a household and run the full safety + publish
        # loop. Unpaired = idle (sync inbound only, so we still hear an
        # assignment). Derived from the client when it's attached.
        self._is_paired = bool(getattr(client, "household_id", None))

        # Inbound MQTT requests land here from the network thread; drained on the
        # main thread at the top of each tick (phase 1).
        self._inbound: "queue.Queue" = queue.Queue()
        # Action logs produced by the firmware this tick, flushed in phase 3.
        self._pending_events = []
        # Latest debounced presence flip awaiting publish (sensor data).
        self._pending_presence: Optional[bool] = None

        self._running = False
        self._last_heartbeat = 0.0

        # Local view of the active cooking timer (PRD FR10) for status + a
        # cloud-independent shutoff when it elapses.
        self._timer_deadline: Optional[float] = None
        self._timer_id = None

        if self._monitor is not None:
            self.attach_monitor(self._monitor)
        # Safety reports the actions it takes through here.
        self._safety._on_event = self._record_event

    def set_client(self, client):
        """Attach the MQTT client (built after the loop so it can use the loop's
        enqueueing callbacks). Publishing is best-effort, so this may even be
        left unset for a fully offline run."""
        self._client = client
        self._is_paired = bool(getattr(client, "household_id", None))

    def attach_monitor(self, monitor):
        """Wire a PresenceMonitor in so its debounced flips feed this loop.

        Safe to call after construction (e.g. once the camera has started), so
        the loop can be built before the monitor exists.
        """
        self._monitor = monitor
        # Fired on every *debounced* presence flip, on the main thread inside
        # monitor.poll() — so presence updates can't race the state machine.
        monitor._on_change = self._on_presence_change

    # --- MQTT callbacks (run on the paho network thread) --------------------
    # These do the minimum: enqueue. All real handling happens on the main loop.
    def on_command(self, payload):
        self._inbound.put(("command", payload))

    def on_settings(self, payload):
        self._inbound.put(("settings", payload))

    def on_timer(self, payload):
        self._inbound.put(("timer", payload))

    def on_assignment(self, payload):
        # Applying this reconnects the MQTT client, so it must run on the main
        # loop thread — enqueue here, handle in _sync_inbound.
        self._inbound.put(("assignment", payload))

    # --- internal collectors (main thread) ----------------------------------
    def _record_event(self, event_type, metadata):
        self._pending_events.append((event_type, dict(metadata or {})))

    def _on_presence_change(self, detected: bool):
        log.info("Presence -> %s", "detected" if detected else "not detected")
        self._pending_presence = detected
        # Feed the state machine immediately (this is logic, not I/O).
        self._safety.on_presence(detected)

    # === the loop ===========================================================
    def run(self):
        """Run forever. Each tick is isolated so nothing can break the loop."""
        self._running = True
        log.info("Firmware loop started for device %s", self.device_id)
        while self._running:
            try:
                self.tick()
            except Exception:
                log.exception("loop tick failed — continuing")
            time.sleep(self._poll_interval)

    def stop(self):
        self._running = False

    def tick(self):
        now = self._now()
        self._sync_inbound()      # 1. sync MQTT requests first (incl. assignment)
        # While unpaired the device is idle: it has no household to protect or
        # report to, so it only listens for an assignment (handled in phase 1).
        if not self._is_paired:
            return
        self._run_logic(now)      # 2. firmware's own safety logic
        self._publish_outbound(now)  # 3. send action logs + sensor data back

    # --- phase 1: sync ------------------------------------------------------
    def _sync_inbound(self):
        while True:
            try:
                kind, payload = self._inbound.get_nowait()
            except queue.Empty:
                break
            try:
                self._handle(kind, payload)
            except Exception:
                log.exception("failed handling inbound %s: %s", kind, payload)

    def _handle(self, kind, payload):
        if kind == "command":
            self._handle_command(payload)
        elif kind == "settings":
            self._handle_settings(payload)
        elif kind == "timer":
            self._handle_timer(payload)
        elif kind == "assignment":
            self._handle_assignment(payload)

    def _handle_assignment(self, payload):
        """Apply a household pair / unpair pushed by the backend.

        Paired   -> point the MQTT client at the new household subtree and resume
                    the safety + publish loop.
        Unpaired -> fail-safe the stove off, disarm, clear the old household's
                    retained status, and go idle until paired again.
        """
        new_household = payload.get("householdId") or None
        old_household = getattr(self._client, "household_id", None)
        log.info("Assignment received: household %s -> %s", old_household, new_household)

        # Persist first so a reboot reflects the latest assignment even if the
        # reconnect below fails.
        if self._state is not None:
            self._state.save(new_household)

        if new_household:
            self._client.set_household(new_household)
            self._is_paired = True
            log.info("Device paired to household %s — safety loop active", new_household)
            return

        # Unpaired: go fully idle. Do this BEFORE switching the client off the old
        # household so the fail-safe + status clear still reach the broker.
        log.info("Device unpaired — turning stove off and going idle")
        try:
            self._stove.turn_off()
        except Exception:
            log.exception("unpair: stove.turn_off failed")
        self._safety.set_stove(False, source="unpair")  # disarms + stops buzzer
        self._clear_timer()
        if old_household is not None:
            self._client.clear_household_status(old_household)
        self._client.set_household(None)
        self._is_paired = False

    def _handle_command(self, payload):
        command = payload.get("command")
        source = payload.get("source", "backend")
        log.info("Command: %s (source=%s)", command, source)
        if command == "TURN_ON":
            self._stove.turn_on()
            self._safety.set_stove(True, source=source)
        elif command == "TURN_OFF":
            self._stove.turn_off()
            self._safety.set_stove(False, source=source)
            self._clear_timer()
        elif command == "SNOOZE":
            self._safety.snooze(payload.get("seconds", 0))
        else:
            log.warning("Unknown command: %s", command)

    def _handle_settings(self, payload):
        log.info("Settings: %s", payload)
        self._safety.update_settings(
            absence_timeout_seconds=payload.get("absenceTimeoutSeconds"),
            warning_delay_seconds=payload.get("warningDelaySeconds"),
        )

    def _handle_timer(self, payload):
        action = payload.get("action")
        log.info("Timer: %s", payload)
        if action == "TIMER_STARTED":
            duration = payload.get("durationSeconds")
            if duration:
                self._timer_deadline = self._now() + float(duration)
                self._timer_id = payload.get("timerId")
        elif action == "TIMER_CANCELLED":
            self._clear_timer()

    def _clear_timer(self):
        self._timer_deadline = None
        self._timer_id = None

    # --- phase 2: logic -----------------------------------------------------
    def _run_logic(self, now):
        # Read the presence sensor (fires _on_presence_change on a debounced flip).
        if self._monitor is not None:
            try:
                self._monitor.poll()
            except Exception:
                log.exception("presence poll failed")

        # Advance the absence -> warning -> auto-shutoff state machine.
        self._safety.tick(now)

        # Cooking timer: when it elapses, turn the stove off locally (don't wait
        # on the cloud). This is the cloud-independent safety backstop — it must
        # work with the broker down. We deliberately do NOT emit a TIMER_COMPLETED
        # event here: the backend timer poller owns that audit event and fires it
        # exactly once (it holds the DB timer's status), so reporting it from here
        # too would double-log.
        if self._timer_deadline is not None and now >= self._timer_deadline:
            log.info("Cooking timer elapsed — turning stove off")
            self._stove.turn_off()
            self._safety.set_stove(False, source="timer")
            self._clear_timer()

    # --- phase 3: publish (best-effort; broker may be down) -----------------
    def _publish_outbound(self, now):
        # Sensor data: presence, only on a debounced change.
        if self._pending_presence is not None:
            self._safe_publish(
                lambda: self._client.publish_presence(self._pending_presence)
            )
            self._pending_presence = None

        # Action logs: what the firmware did, tagged with this device's id.
        if self._pending_events:
            events, self._pending_events = self._pending_events, []
            for event_type, metadata in events:
                meta = {"deviceId": self.device_id, **metadata}
                self._safe_publish(
                    lambda et=event_type, md=meta: self._client.publish_event(et, md)
                )

        # Sensor data: periodic status heartbeat (retained).
        if now - self._last_heartbeat >= self._status_heartbeat:
            self._last_heartbeat = now
            self._safe_publish(lambda: self._client.publish_status(**self._status_fields()))

    def _status_fields(self):
        snap = self._safety.snapshot()
        present = snap.get("presence")
        remaining = None
        if self._timer_deadline is not None:
            remaining = max(0, int(self._timer_deadline - self._now()))
        return {
            "online": True,
            "stove_status": "on" if self._stove.is_on else "off",
            "presence": "detected" if present else "not_detected",
            "buzzer": snap.get("buzzer", "off"),
            "active_timer_seconds_remaining": remaining,
        }

    def _safe_publish(self, fn):
        """Publish without ever letting an MQTT problem break the loop."""
        if self._client is None:
            return
        try:
            fn()
        except Exception:
            log.debug("publish skipped (broker unavailable?)", exc_info=True)
