#!/bin/sh
# Ensure the privileged "backend" MQTT user + base ACL exist, then launch the
# broker. Device users/ACLs are added later by mqtt/provision-device.sh and
# MUST survive restarts, so we only (re)create the backend user — never -c the
# whole password file (that would wipe provisioned devices).
set -e

PWFILE=/mosquitto/data/passwd
ACLFILE=/mosquitto/data/aclfile

if [ -z "$MQTT_USERNAME" ] || [ -z "$MQTT_PASSWORD" ]; then
  echo "ERROR: MQTT_USERNAME and MQTT_PASSWORD (the backend user) must be set" >&2
  exit 1
fi

# Create the password file on first boot; otherwise just upsert the backend user
# so existing device users are preserved.
if [ ! -f "$PWFILE" ]; then
  mosquitto_passwd -b -c "$PWFILE" "$MQTT_USERNAME" "$MQTT_PASSWORD"
else
  mosquitto_passwd -b "$PWFILE" "$MQTT_USERNAME" "$MQTT_PASSWORD"
fi
chmod 0700 "$PWFILE"

# Seed the ACL file once with the backend's full access. Device blocks are
# appended by provisioning. Don't clobber it if it already has device entries.
if [ ! -f "$ACLFILE" ]; then
  cat > "$ACLFILE" <<EOF
# Hestia MQTT ACL. Backend = full access. Device users (added by
# mqtt/provision-device.sh) are scoped to their own household/device subtree.
user $MQTT_USERNAME
topic readwrite hestia/#

# Household listener accounts authenticate as username = householdId and may
# READ every device in that household (%u = the account's username). Devices
# (username = deviceId) never match a household id here, so they stay isolated.
# Used by hubs/services; the PWA uses Supabase Realtime instead.
pattern read hestia/households/%u/#
EOF
fi
chmod 0700 "$ACLFILE"

# Run as root here (entrypoint override); hand ownership to the mosquitto user
# so it can read passwd/acl and write persistence after it drops privileges.
chown -R mosquitto:mosquitto /mosquitto/data 2>/dev/null || true

exec /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf
