#!/bin/sh
# Generate the Mosquitto password file from env on every start, then launch the
# broker. Keeping creds in env (not a committed hash) means changing the
# username/password is just an env edit + `docker compose up -d`.
set -e

PWFILE=/mosquitto/data/passwd

if [ -z "$MQTT_USERNAME" ] || [ -z "$MQTT_PASSWORD" ]; then
  echo "ERROR: MQTT_USERNAME and MQTT_PASSWORD must be set" >&2
  exit 1
fi

mosquitto_passwd -b -c "$PWFILE" "$MQTT_USERNAME" "$MQTT_PASSWORD"
chmod 0700 "$PWFILE"

# We run as root here (entrypoint override); hand ownership to the mosquitto
# user so it can read the passwd file and write persistence after it drops privs.
chown -R mosquitto:mosquitto /mosquitto/data 2>/dev/null || true

exec /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf
