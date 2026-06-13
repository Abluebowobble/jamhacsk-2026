"""Camera-based presence detection (Pi Camera + OpenCV).

STUB — not implemented yet. See PRD section 6.6 / 12.1.
"""
import logging

log = logging.getLogger("hestia.presence")


def detect_presence():
    """Return True if a person is near the stove, False if not.

    TODO: implement with picamera2 + a person detector (e.g. OpenCV HOG or a
    lightweight model). Returns None until implemented.
    """
    log.debug("presence.detect_presence() not implemented yet")
    return None
