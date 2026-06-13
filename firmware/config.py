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
    host: str
    port: int
    username: Optional[str]
    password: Optional[str]
    keepalive: int


def _require(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required env var: {name} (copy .env.example to .env)")
    return value


def load_config():
    # TESTING: device-ID verification disabled. DEVICE_ID is no longer required
    # and need not match a Supabase `devices` row; it falls back to a default.
    # To re-enable strict verification, restore the _require(...) line below.
    # device_id = _require("DEVICE_ID")
    device_id = os.environ.get("DEVICE_ID", "").strip() or "test-device-001"
    broker_url = _require("MQTT_BROKER_URL")

    # Accept "mqtt://host:1883" or a bare "host:1883".
    parsed = urlparse(broker_url if "://" in broker_url else f"mqtt://{broker_url}")
    host = parsed.hostname or "localhost"
    port = parsed.port or 1883

    return Config(
        device_id=device_id,
        host=host,
        port=port,
        username=os.environ.get("MQTT_USERNAME") or None,
        password=os.environ.get("MQTT_PASSWORD") or None,
        keepalive=int(os.environ.get("MQTT_KEEPALIVE", "60")),
    )
