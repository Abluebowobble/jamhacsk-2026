"""MQTT topic + payload contract shared with the backend.

Single source of truth so the Pi and the backend agree on message shapes.
Mirrors PRD section 20 and what backend/src/services/mqtt.js actually parses:

  Pi  -> backend : status, presence, events
  backend -> Pi  : commands, settings, timers
"""
from datetime import datetime, timezone

TOPIC_BASE = "hestia/households"


# --- Topic builders ---------------------------------------------------------
# Topics are keyed by household so the broker ACL can isolate families:
#   hestia/households/{householdId}/devices/{deviceId}/{kind}
def _topic(household_id, device_id, kind):
    return f"{TOPIC_BASE}/{household_id}/devices/{device_id}/{kind}"


def topic_status(household_id, device_id):
    return _topic(household_id, device_id, "status")


def topic_presence(household_id, device_id):
    return _topic(household_id, device_id, "presence")


def topic_events(household_id, device_id):
    return _topic(household_id, device_id, "events")


def topic_commands(household_id, device_id):
    return _topic(household_id, device_id, "commands")


def topic_settings(household_id, device_id):
    return _topic(household_id, device_id, "settings")


def topic_timers(household_id, device_id):
    return _topic(household_id, device_id, "timers")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# --- Outbound payload builders (Pi -> backend) ------------------------------
# Field names match backend handleStatus(): online, stoveStatus, presence.
def status_payload(device_id, *, online=True, stove_status="off",
                   presence="not_detected", buzzer="off",
                   active_timer_seconds_remaining=None):
    return {
        "deviceId": device_id,
        "online": online,
        "stoveStatus": stove_status,
        "presence": presence,
        "buzzer": buzzer,
        "activeTimerSecondsRemaining": active_timer_seconds_remaining,
        "timestamp": now_iso(),
    }


# backend handlePresence() checks presence == 'detected' (or detected is True).
def presence_payload(detected):
    return {
        "presence": "detected" if detected else "not_detected",
        "timestamp": now_iso(),
    }


# backend handleDeviceEvent() reads eventType (or type); the rest is metadata.
def event_payload(event_type, metadata=None):
    payload = {"eventType": event_type, "timestamp": now_iso()}
    if metadata:
        payload.update(metadata)
    return payload


# Last Will payload: published by the broker if the Pi drops, so the backend
# flips online_status to false automatically.
def offline_will(device_id):
    return {"deviceId": device_id, "online": False, "timestamp": now_iso()}
