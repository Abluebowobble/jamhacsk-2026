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
    def __init__(self, config, *, on_command=None, on_settings=None, on_timer=None):
        self.cfg = config
        self.device_id = config.device_id
        self._on_command = on_command
        self._on_settings = on_settings
        self._on_timer = on_timer

        # A short random suffix keeps the client_id unique. Two clients with the
        # SAME id make the broker kick one off repeatedly (connect/disconnect
        # loop) — easy to hit now that device-ID verification is off and every
        # instance defaults to the same DEVICE_ID.
        self._client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id=f"hestia-device-{self.device_id}-{uuid4().hex[:6]}",
        )

        if config.username:
            self._client.username_pw_set(config.username, config.password)

        # Auto-reconnect with backoff, so a dropped broker recovers on its own.
        self._client.reconnect_delay_set(min_delay=1, max_delay=30)

        # Last Will: if this Pi disconnects unexpectedly, the broker publishes
        # an offline status on our behalf -> backend marks the device offline.
        self._client.will_set(
            m.topic_status(self.device_id),
            json.dumps(m.offline_will(self.device_id)),
            qos=1,
            retain=True,
        )

        self._client.on_connect = self._handle_connect
        self._client.on_message = self._handle_message
        self._client.on_disconnect = self._handle_disconnect

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

    # --- inbound (backend -> Pi) -------------------------------------------
    def _handle_connect(self, client, userdata, flags, reason_code, properties=None):
        rc = getattr(reason_code, "value", reason_code)
        if rc != 0:
            log.error("MQTT connect refused: %s", reason_code)
            return
        log.info("MQTT connected as device %s", self.device_id)
        for topic in (
            m.topic_commands(self.device_id),
            m.topic_settings(self.device_id),
            m.topic_timers(self.device_id),
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
            if kind == "commands":
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
        payload = m.status_payload(
            self.device_id,
            online=online,
            stove_status=stove_status,
            presence=presence,
            buzzer=buzzer,
            active_timer_seconds_remaining=active_timer_seconds_remaining,
        )
        # retained so the dashboard sees current state immediately on subscribe.
        self._publish(m.topic_status(self.device_id), payload, qos=1, retain=True)

    def publish_presence(self, detected):
        self._publish(m.topic_presence(self.device_id), m.presence_payload(detected))

    def publish_event(self, event_type, metadata=None):
        self._publish(m.topic_events(self.device_id), m.event_payload(event_type, metadata))
