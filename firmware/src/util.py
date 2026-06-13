"""Small shared helpers used across the firmware modules."""
import os


def env_int(name, default):
    """Read an int from the environment, falling back to ``default``."""
    try:
        return int(os.environ.get(name, "").strip() or default)
    except ValueError:
        return default


def env_float(name, default):
    """Read a float from the environment, falling back to ``default``."""
    try:
        return float(os.environ.get(name, "").strip() or default)
    except ValueError:
        return default


def env_bool(name, default):
    """Read a bool from the environment (1/true/yes/on), else ``default``."""
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")
