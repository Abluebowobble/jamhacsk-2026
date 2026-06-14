"""Persistent device state — the household this device is currently paired to.

Unlike the rest of the firmware (which is stateless across reboots and reads its
identity from the environment), the *household assignment* is learned at runtime:
the backend publishes it to the retained `hestia/devices/{deviceId}/assignment`
topic when the device is paired/unpaired (see src/messages.topic_assignment and
backend/src/services/mqtt.js). We persist it to a small JSON file so a reboot
comes back paired without waiting on the broker.

The file holds a single fact:
    {"householdId": "<uuid>" | null}
"""
import json
import logging
import os
import tempfile

log = logging.getLogger("hestia.state")


class AssignmentStore:
    def __init__(self, path):
        self._path = path

    def load(self):
        """Return the persisted household id (or None if unpaired / no file)."""
        try:
            with open(self._path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
        except FileNotFoundError:
            return None
        except (ValueError, OSError):
            log.warning("State file %s unreadable — treating as unpaired", self._path)
            return None
        household_id = data.get("householdId")
        return household_id or None

    def save(self, household_id):
        """Atomically persist the household id (None clears the assignment)."""
        directory = os.path.dirname(self._path) or "."
        os.makedirs(directory, exist_ok=True)
        payload = json.dumps({"householdId": household_id or None})
        # Write to a temp file in the same dir, then os.replace for atomicity so a
        # crash mid-write can never leave a half-written state file.
        fd, tmp = tempfile.mkstemp(dir=directory, prefix=".state-", suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                fh.write(payload)
            os.replace(tmp, self._path)
        except OSError:
            log.exception("Failed to persist state to %s", self._path)
            try:
                os.unlink(tmp)
            except OSError:
                pass
