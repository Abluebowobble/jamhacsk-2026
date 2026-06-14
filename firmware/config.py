"""Loads firmware configuration from the environment (.env).

Device identity is provided via DEVICE_ID (must match a row in Supabase
`devices`). The HOUSEHOLD_ID is *learned at runtime* from the backend's retained
`hestia/devices/{deviceId}/assignment` topic when the device is paired (and
persisted to STATE_FILE), so it is optional here — set it only as an initial
seed/override. Everything else is broker connection detail.
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
    # Optional initial household seed. The live assignment is learned over MQTT
    # and persisted to state_file; this is only used when no state exists yet.
    household_id: Optional[str]
    host: str
    port: int
    # Shared MQTT login used by ALL devices (defaults: device / hestiadevice).
    # The deviceId still keys the topics/identity — only the broker auth is shared.
    username: str
    password: Optional[str]
    keepalive: int
    # Where the learned household assignment is persisted across reboots.
    state_file: str
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
    # Each physical device MUST set its own unique DEVICE_ID (matches its row in
    # Supabase `devices`). The HOUSEHOLD_ID is learned at runtime when the device
    # is paired (retained MQTT assignment topic) and is optional here — only used
    # as an initial seed before any assignment is known. MQTT auth uses the SHARED
    # device account (MQTT_USERNAME/MQTT_PASSWORD, defaults device/hestiadevice),
    # so no per-device provisioning is needed.
    device_id = _require("DEVICE_ID")
    household_id = os.environ.get("HOUSEHOLD_ID", "").strip() or None
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
        # Shared broker login for every device. Defaults match the broker's
        # DEVICE_MQTT_USERNAME/DEVICE_MQTT_PASSWORD so a device only needs
        # DEVICE_ID + MQTT_BROKER_URL set to connect.
        username=os.environ.get("MQTT_USERNAME", "").strip() or "device",
        password=os.environ.get("MQTT_PASSWORD", "").strip() or "hestiadevice",
        keepalive=int(os.environ.get("MQTT_KEEPALIVE", "60")),
        state_file=os.environ.get("STATE_FILE", "").strip() or "state/device_state.json",
        camera_stream_enabled=_env_bool("CAMERA_STREAM_ENABLED", True),
        camera_stream_port=_env_int("CAMERA_STREAM_PORT", 8089),
        camera_stream_secret=os.environ.get("CAMERA_STREAM_SECRET") or None,
        camera_stream_fps=_env_int("CAMERA_STREAM_FPS", 4),
        camera_stream_jpeg_quality=_env_int("CAMERA_STREAM_JPEG_QUALITY", 60),
    )
