#!/bin/sh
# Auto-create a per-device MQTT account scoped to this device's subtree in ANY
# household, then hot-reload the broker. Run on the host where the hestia-mqtt
# container runs (it uses `docker exec`).
#
# The device is NOT bound to a household at provisioning time: it's paired later
# in the web app, and the backend pushes the household to the device over the
# retained hestia/devices/<deviceId>/assignment topic. The wildcard ACL below
# lets the device be (re)paired to any household without re-provisioning.
#
# Usage:
#   ./mqtt/provision-device.sh <deviceId> [password]
#
# Prints the firmware/.env values to copy onto the device.
set -e

DEVICE_ID="$1"
PASSWORD="$2"
CONTAINER="${MQTT_CONTAINER:-hestia-mqtt}"

if [ -z "$DEVICE_ID" ]; then
  echo "Usage: $0 <deviceId> [password]" >&2
  exit 1
fi

# Generate a password if none supplied.
if [ -z "$PASSWORD" ]; then
  PASSWORD=$(docker exec "$CONTAINER" sh -c 'tr -dc A-Za-z0-9 </dev/urandom | head -c 24')
fi

# 1. Add (or update) the device's MQTT user.
docker exec "$CONTAINER" mosquitto_passwd -b /mosquitto/data/passwd "$DEVICE_ID" "$PASSWORD"

# 2. Append an ACL block scoping this user to its OWN deviceId subtree, in any
#    household (+ wildcard) so it can be re-paired without re-provisioning, plus
#    the device-scoped assignment topic it reads to learn its household. The
#    device may PUBLISH telemetry and SUBSCRIBE to commands — nothing else.
docker exec "$CONTAINER" sh -c "cat >> /mosquitto/data/aclfile <<EOF

user $DEVICE_ID
topic read hestia/devices/$DEVICE_ID/assignment
topic write hestia/households/+/devices/$DEVICE_ID/status
topic write hestia/households/+/devices/$DEVICE_ID/presence
topic write hestia/households/+/devices/$DEVICE_ID/events
topic read hestia/households/+/devices/$DEVICE_ID/commands
topic read hestia/households/+/devices/$DEVICE_ID/settings
topic read hestia/households/+/devices/$DEVICE_ID/timers
EOF"

# 3. Hot-reload Mosquitto so the new user + ACL take effect (no downtime).
docker kill -s HUP "$CONTAINER" >/dev/null

cat <<EOF
Provisioned device. Put these in the device's firmware/.env:

  DEVICE_ID=$DEVICE_ID
  MQTT_PASSWORD=$PASSWORD
  MQTT_BROKER_URL=mqtt://<broker-host>:1883

(The device authenticates as username = DEVICE_ID. No HOUSEHOLD_ID needed — the
device learns its household when it's paired in the web app.)
EOF
