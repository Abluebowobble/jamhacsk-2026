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
    # Camera stream (PRD section 13). The browser connects directly to this
    # MJPEG server (via a Cloudflare Tunnel in deployment), gated by an HMAC
    # token the backend mints with the shared camera_stream_secret.
    camera_stream_enabled: bool
    camera_stream_port: int
    camera_stream_secret: Optional[str]
    camera_stream_fps: int
    camera_stream_jpeg_quality: int


def _require(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required env var: {name} (copy .env.example to .env)")
    return value


def _env_bool(name, default):
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")


def _env_int(name, default):
    try:
        return int(os.environ.get(name, "").strip() or default)
    except ValueError:
        return default


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
        camera_stream_enabled=_env_bool("CAMERA_STREAM_ENABLED", True),
        camera_stream_port=_env_int("CAMERA_STREAM_PORT", 8089),
        camera_stream_secret=os.environ.get("CAMERA_STREAM_SECRET") or None,
        camera_stream_fps=_env_int("CAMERA_STREAM_FPS", 4),
        camera_stream_jpeg_quality=_env_int("CAMERA_STREAM_JPEG_QUALITY", 60),
    )
