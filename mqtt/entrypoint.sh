#!/bin/sh
# Ensure the privileged "backend" MQTT user and the SHARED "device" user exist,
# then launch the broker. We upsert users on every boot — never -c the whole
# password file (that would wipe accounts).
#
# Per-topic ACLs are DISABLED (no acl_file in mosquitto.conf): the backend
# (Supabase) governs what each user can see, so the broker only gates connections
# by password. Any authenticated client may pub/sub any hestia/ topic. This is
# the deliberate "shared credential, no channels" model.
set -e

PWFILE=/mosquitto/data/passwd

if [ -z "$MQTT_USERNAME" ] || [ -z "$MQTT_PASSWORD" ]; then
  echo "ERROR: MQTT_USERNAME and MQTT_PASSWORD (the backend user) must be set" >&2
  exit 1
fi

# Shared credential that EVERY Hestia device authenticates with. It's only a gate
# so random clients on the internet can't connect — NOT per-device isolation.
# Override via env if desired.
DEVICE_MQTT_USERNAME="${DEVICE_MQTT_USERNAME:-device}"
DEVICE_MQTT_PASSWORD="${DEVICE_MQTT_PASSWORD:-hestiadevice}"

# Create the password file on first boot; otherwise upsert users so existing
# accounts are preserved.
if [ ! -f "$PWFILE" ]; then
  mosquitto_passwd -b -c "$PWFILE" "$MQTT_USERNAME" "$MQTT_PASSWORD"
else
  mosquitto_passwd -b "$PWFILE" "$MQTT_USERNAME" "$MQTT_PASSWORD"
fi
# Upsert the shared device user every boot (also creates it on already-running
# brokers that predate this account).
mosquitto_passwd -b "$PWFILE" "$DEVICE_MQTT_USERNAME" "$DEVICE_MQTT_PASSWORD"
chmod 0700 "$PWFILE"

# Run as root here (entrypoint override); hand ownership to the mosquitto user
# so it can read passwd and write persistence after it drops privileges.
chown -R mosquitto:mosquitto /mosquitto/data 2>/dev/null || true

exec /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf
