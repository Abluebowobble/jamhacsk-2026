#!/bin/sh
# Auto-create a per-device MQTT account scoped to ONE household/device subtree,
# then hot-reload the broker. Run on the host where the hestia-mqtt container
# runs (it uses `docker exec`).
#
# Usage:
#   ./mqtt/provision-device.sh <deviceId> <householdId> [password]
#
# Prints the firmware/.env values to copy onto the device.
set -e

DEVICE_ID="$1"
HOUSEHOLD_ID="$2"
PASSWORD="$3"
CONTAINER="${MQTT_CONTAINER:-hestia-mqtt}"

if [ -z "$DEVICE_ID" ] || [ -z "$HOUSEHOLD_ID" ]; then
  echo "Usage: $0 <deviceId> <householdId> [password]" >&2
  exit 1
fi

# Generate a password if none supplied.
if [ -z "$PASSWORD" ]; then
  PASSWORD=$(docker exec "$CONTAINER" sh -c 'tr -dc A-Za-z0-9 </dev/urandom | head -c 24')
fi

# 1. Add (or update) the device's MQTT user.
docker exec "$CONTAINER" mosquitto_passwd -b /mosquitto/data/passwd "$DEVICE_ID" "$PASSWORD"

# 2. Append an ACL block scoping this user to its own household/device subtree.
#    The device may PUBLISH telemetry and SUBSCRIBE to commands — nothing else.
docker exec "$CONTAINER" sh -c "cat >> /mosquitto/data/aclfile <<EOF

user $DEVICE_ID
topic write hestia/households/$HOUSEHOLD_ID/devices/$DEVICE_ID/status
topic write hestia/households/$HOUSEHOLD_ID/devices/$DEVICE_ID/presence
topic write hestia/households/$HOUSEHOLD_ID/devices/$DEVICE_ID/events
topic read hestia/households/$HOUSEHOLD_ID/devices/$DEVICE_ID/commands
topic read hestia/households/$HOUSEHOLD_ID/devices/$DEVICE_ID/settings
topic read hestia/households/$HOUSEHOLD_ID/devices/$DEVICE_ID/timers
EOF"

# 3. Hot-reload Mosquitto so the new user + ACL take effect (no downtime).
docker kill -s HUP "$CONTAINER" >/dev/null

cat <<EOF
Provisioned device. Put these in the device's firmware/.env:

  DEVICE_ID=$DEVICE_ID
  HOUSEHOLD_ID=$HOUSEHOLD_ID
  MQTT_PASSWORD=$PASSWORD
  MQTT_BROKER_URL=mqtt://<broker-host>:1883

(The device authenticates as username = DEVICE_ID.)
EOF
