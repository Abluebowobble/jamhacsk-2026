"""MQTT client: the Pi side of the Hestia device <-> backend contract.

This module is COMPLETE and ready to use. The camera / safety / buzzer / stove
logic lives in sibling modules as stubs; wire them in by passing on_command /
on_settings / on_timer callbacks (see main.py).

Subscribes to:  commands, settings, timers   (backend -> Pi)
Publishes to:   status, presence, events     (Pi -> backend)
"""
import json
import logging
from uuid import uuid4

import paho.mqtt.client as mqtt

from . import messages as m

log = logging.getLogger("hestia.mqtt")


class MqttClient:
    def __init__(self, config, *, household_id=None, on_command=None,
                 on_settings=None, on_timer=None, on_assignment=None):
        self.cfg = config
        self.device_id = config.device_id
        # The household is mutable: it starts from a persisted/seed value (may be
        # None = unpaired) and changes at runtime via set_household() when the
        # backend pairs/unpairs the device.
        self.household_id = household_id
        self._on_command = on_command
        self._on_settings = on_settings
        self._on_timer = on_timer
        self._on_assignment = on_assignment

        # A short random suffix keeps the client_id unique. Two clients with the
        # SAME id make the broker kick one off repeatedly (connect/disconnect
        # loop).
        self._client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id=f"hestia-device-{self.device_id}-{uuid4().hex[:6]}",
        )

        self._client.username_pw_set(config.username, config.password)

        # Auto-reconnect with backoff, so a dropped broker recovers on its own.
        self._client.reconnect_delay_set(min_delay=1, max_delay=30)

        # Last Will: if this Pi disconnects unexpectedly, the broker publishes an
        # offline status on our behalf -> backend marks the device offline. Only
        # meaningful once we know our household (set in _apply_will()).
        self._apply_will()

        self._client.on_connect = self._handle_connect
        self._client.on_message = self._handle_message
        self._client.on_disconnect = self._handle_disconnect

    def _apply_will(self):
        """(Re)configure the Last Will for the current household.

        The will is part of the CONNECT packet, so changing it only takes effect
        on the next (re)connect — set_household() forces a reconnect for that.
        """
        if self.household_id:
            self._client.will_set(
                m.topic_status(self.household_id, self.device_id),
                json.dumps(m.offline_will(self.device_id)),
                qos=1,
                retain=True,
            )
        else:
            self._client.will_clear()

    # --- lifecycle ----------------------------------------------------------
    def start_resilient(self):
        """Connect in the background; never raises if the broker is down.

        Uses connect_async so the background loop owns the (re)connection: if the
        broker is unreachable at boot it keeps retrying with backoff instead of
        crashing. This lets the firmware's local safety loop run with no broker
        and pick the connection up later (PRD section 22, Reliability).
        """
        log.info("Connecting (async) to broker %s:%s", self.cfg.host, self.cfg.port)
        self._client.connect_async(
            self.cfg.host, self.cfg.port, keepalive=self.cfg.keepalive
        )
        self._client.loop_start()

    def stop(self):
        """Publish an explicit offline status, then disconnect cleanly."""
        try:
            self.publish_status(online=False)
        except Exception:
            pass
        self._client.loop_stop()
        self._client.disconnect()

    def set_household(self, new_household_id):
        """Change the household this device reports to (pair / unpair / re-pair).

        Must be called on the main loop thread (not a paho callback). Updates the
        Last Will and forces a reconnect so the new will registers and
        _handle_connect re-subscribes to the correct subtree. A no-op if the
        household is unchanged.
        """
        new_household_id = new_household_id or None
        if new_household_id == self.household_id:
            return
        log.info("Household assignment: %s -> %s", self.household_id, new_household_id)
        self.household_id = new_household_id
        self._apply_will()
        # reconnect() re-sends CONNECT (with the new will) and triggers
        # on_connect, which subscribes to the right topics for the new household.
        try:
            self._client.reconnect()
        except Exception:
            # If the broker is down, the background loop will reconnect later with
            # the updated will/household already in place.
            log.debug("reconnect after household change deferred (broker down?)",
                      exc_info=True)

    def clear_household_status(self, household_id):
        """Remove the retained online status on a household we're leaving, so a
        stale 'online' message doesn't linger after unpair. Empty retained
        payload deletes the retained message on that topic."""
        if not household_id:
            return
        self._client.publish(
            m.topic_status(household_id, self.device_id), payload=b"", qos=1, retain=True
        )

    # --- inbound (backend -> Pi) -------------------------------------------
    def _handle_connect(self, client, userdata, flags, reason_code, properties=None):
        rc = getattr(reason_code, "value", reason_code)
        if rc != 0:
            log.error("MQTT connect refused: %s", reason_code)
            return
        log.info("MQTT connected as device %s", self.device_id)

        # ALWAYS subscribe to the device-scoped assignment topic so we learn (and
        # later forget) our household even before we're paired. Retained, so a
        # device that boots already-paired gets its assignment immediately.
        assignment = m.topic_assignment(self.device_id)
        client.subscribe(assignment, qos=1)
        log.info("Subscribed: %s", assignment)

        # Household-scoped topics + presence announcement only make sense once a
        # household is known. While unpaired we stay connected purely to listen
        # for an assignment.
        if not self.household_id:
            log.info("No household yet — waiting for assignment")
            return

        for topic in (
            m.topic_commands(self.household_id, self.device_id),
            m.topic_settings(self.household_id, self.device_id),
            m.topic_timers(self.household_id, self.device_id),
        ):
            client.subscribe(topic, qos=1)
            log.info("Subscribed: %s", topic)
        # Announce we are online (retained so late subscribers see it).
        self.publish_status(online=True)

    def _handle_disconnect(self, client, userdata, *args):
        # args differ across paho versions; the reason code is the last item.
        reason = args[-1] if args else "unknown"
        log.warning("MQTT disconnected (%s) — auto-reconnecting", reason)

    def _handle_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
        except (ValueError, UnicodeDecodeError):
            log.warning("Ignoring non-JSON message on %s", msg.topic)
            return

        kind = msg.topic.rsplit("/", 1)[-1]
        try:
            if kind == "assignment":
                # Enqueue ONLY: applying an assignment reconfigures + reconnects
                # this client, which must not happen on the paho network thread.
                self._dispatch(self._on_assignment, payload, "assignment")
            elif kind == "commands":
                self._dispatch(self._on_command, payload, "command")
            elif kind == "settings":
                self._dispatch(self._on_settings, payload, "settings")
            elif kind == "timers":
                self._dispatch(self._on_timer, payload, "timer")
            else:
                log.debug("No route for topic %s", msg.topic)
        except Exception:
            log.exception("Handler raised for %s", msg.topic)

    @staticmethod
    def _dispatch(callback, payload, label):
        if callback is None:
            log.info("Received %s (no handler registered): %s", label, payload)
        else:
            callback(payload)

    # --- outbound (Pi -> backend) ------------------------------------------
    def _publish(self, topic, payload, qos=1, retain=False):
        self._client.publish(topic, json.dumps(payload), qos=qos, retain=retain)

    def publish_status(self, *, online=True, stove_status="off",
                       presence="not_detected", buzzer="off",
                       active_timer_seconds_remaining=None):
        # Telemetry is household-scoped; while unpaired there's nowhere (and no
        # one) to publish to, so skip.
        if not self.household_id:
            return
        payload = m.status_payload(
            self.device_id,
            online=online,
            stove_status=stove_status,
            presence=presence,
            buzzer=buzzer,
            active_timer_seconds_remaining=active_timer_seconds_remaining,
        )
        # retained so the dashboard sees current state immediately on subscribe.
        self._publish(m.topic_status(self.household_id, self.device_id), payload, qos=1, retain=True)

    def publish_presence(self, detected):
        if not self.household_id:
            return
        self._publish(
            m.topic_presence(self.household_id, self.device_id),
            m.presence_payload(detected),
        )

    def publish_event(self, event_type, metadata=None):
        if not self.household_id:
            return
        self._publish(
            m.topic_events(self.household_id, self.device_id),
            m.event_payload(event_type, metadata),
        )
