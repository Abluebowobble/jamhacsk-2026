#!/bin/sh
# Ensure the privileged "backend" MQTT user, the SHARED "device" user, and the
# base ACL exist, then launch the broker. We upsert users on every boot — never
# -c the whole password file (that would wipe accounts).
set -e

PWFILE=/mosquitto/data/passwd
ACLFILE=/mosquitto/data/aclfile

if [ -z "$MQTT_USERNAME" ] || [ -z "$MQTT_PASSWORD" ]; then
  echo "ERROR: MQTT_USERNAME and MQTT_PASSWORD (the backend user) must be set" >&2
  exit 1
fi

# Shared credential that EVERY Hestia device authenticates with. It's only a gate
# so random clients on the internet can't connect to the broker — it is NOT
# per-device isolation. The backend (Supabase + RLS) governs what each user can
# see, so all devices can safely share one account. Override via env if desired.
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

# Seed the ACL file once with the backend's full access + the household-listener
# pattern. Don't clobber an existing file.
if [ ! -f "$ACLFILE" ]; then
  cat > "$ACLFILE" <<EOF
# Hestia MQTT ACL. backend = full access; device = the shared account all Hestia
# devices use (publish telemetry, read control across ALL households — isolation
# is handled by the backend, not the broker).
user $MQTT_USERNAME
topic readwrite hestia/#

# Household listener accounts authenticate as username = householdId and may
# READ every device in that household (%u = the account's username).
# Used by hubs/services; the PWA uses Supabase Realtime instead.
pattern read hestia/households/%u/#
EOF
fi

# Ensure the shared device ACL block is present. Idempotent: runs on fresh AND
# already-provisioned brokers (the ACL lives in the persistent data volume).
if ! grep -q "^user $DEVICE_MQTT_USERNAME\$" "$ACLFILE"; then
  cat >> "$ACLFILE" <<EOF

user $DEVICE_MQTT_USERNAME
topic write hestia/households/+/devices/+/status
topic write hestia/households/+/devices/+/presence
topic write hestia/households/+/devices/+/events
topic read hestia/households/+/devices/+/commands
topic read hestia/households/+/devices/+/settings
topic read hestia/households/+/devices/+/timers
topic read hestia/devices/+/assignment
EOF
fi
chmod 0700 "$ACLFILE"

# Run as root here (entrypoint override); hand ownership to the mosquitto user
# so it can read passwd/acl and write persistence after it drops privileges.
chown -R mosquitto:mosquitto /mosquitto/data 2>/dev/null || true

exec /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf
