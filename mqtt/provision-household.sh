#!/bin/sh
# Create a READ-ONLY MQTT account for a household: it authenticates as
# username = householdId and can subscribe to EVERY device in that household
# (the broker ACL's `pattern read hestia/households/%u/#` scopes it). No
# per-account ACL line needed — just the credential.
#
# The PWA normally uses Supabase Realtime + RLS instead; this is for non-browser
# listeners (home hubs, services, debugging).
#
# Usage:
#   ./mqtt/provision-household.sh <householdId> [password]
set -e

HOUSEHOLD_ID="$1"
PASSWORD="$2"
CONTAINER="${MQTT_CONTAINER:-hestia-mqtt}"

if [ -z "$HOUSEHOLD_ID" ]; then
  echo "Usage: $0 <householdId> [password]" >&2
  exit 1
fi

if [ -z "$PASSWORD" ]; then
  PASSWORD=$(docker exec "$CONTAINER" sh -c 'tr -dc A-Za-z0-9 </dev/urandom | head -c 24')
fi

docker exec "$CONTAINER" mosquitto_passwd -b /mosquitto/data/passwd "$HOUSEHOLD_ID" "$PASSWORD"
docker kill -s HUP "$CONTAINER" >/dev/null

cat <<EOF
Provisioned household listener:
  MQTT username = $HOUSEHOLD_ID   (read-only, scoped to hestia/households/$HOUSEHOLD_ID/#)
  MQTT password = $PASSWORD

Listen to every device in the household:
  mosquitto_sub -u $HOUSEHOLD_ID -P '$PASSWORD' -t 'hestia/households/$HOUSEHOLD_ID/devices/+/status' -v
EOF
