"""Loads firmware configuration from the environment (.env).

Device identity is provided via DEVICE_ID (must match a row in Supabase
`devices`). Everything else is broker connection detail.
"""
import os
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    # python-dotenv is optional; real env vars still work without it.
    pass


@dataclass(frozen=True)
class Config:
    device_id: str
    household_id: str
    host: str
    port: int
    password: Optional[str]
    keepalive: int


def _require(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required env var: {name} (copy .env.example to .env)")
    return value


def load_config():
    # Each physical device MUST set its own unique DEVICE_ID and the HOUSEHOLD_ID
    # it belongs to (both match its row in Supabase `devices`). These key the
    # MQTT topic + ACL, which is what isolates one family from another. The
    # provisioning step (mqtt/provision-device.sh) prints all three values.
    device_id = _require("DEVICE_ID")
    household_id = _require("HOUSEHOLD_ID")
    broker_url = _require("MQTT_BROKER_URL")

    # Accept "mqtt://host:1883" or a bare "host:1883".
    parsed = urlparse(broker_url if "://" in broker_url else f"mqtt://{broker_url}")
    host = parsed.hostname or "localhost"
    port = parsed.port or 1883

    return Config(
        device_id=device_id,
        household_id=household_id,
        host=host,
        port=port,
        # The device authenticates as username = DEVICE_ID (see mqtt_client), so
        # only the password is needed here.
        password=os.environ.get("MQTT_PASSWORD") or None,
        keepalive=int(os.environ.get("MQTT_KEEPALIVE", "60")),
    )
