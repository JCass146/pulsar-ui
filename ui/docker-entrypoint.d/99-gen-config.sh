#!/bin/sh
set -eu

HTML_DIR="/usr/share/nginx/html"
TEMPLATE="${HTML_DIR}/config.template.json"
OUT="${HTML_DIR}/config.json"

# Defaults:
# - MQTT_WS_URL: default to ws(s)://<host>:9001 computed in the app if left blank
# - MQTT_TOPIC: default to pulsar/+/telemetry/# if blank
: "${MQTT_WS_URL:=}"
: "${MQTT_TOPIC:=pulsar/+/telemetry/#}"

if [ -f "$TEMPLATE" ]; then
  # Replace placeholders safely
  # Note: using '|' delimiter to avoid escaping ':' and '/' in ws URLs
  sed \
    -e "s|\${MQTT_WS_URL}|${MQTT_WS_URL}|g" \
    -e "s|\${MQTT_TOPIC}|${MQTT_TOPIC}|g" \
    "$TEMPLATE" > "$OUT"
else
  # Fallback
  printf '{ "mqttWsUrl": "%s", "mqttTopic": "%s" }\n' "$MQTT_WS_URL" "$MQTT_TOPIC" > "$OUT"
fi

# Ensure config is readable
chmod 0644 "$OUT"

echo "[pulsar-ui] Wrote $OUT"
echo "[pulsar-ui] mqttWsUrl='${MQTT_WS_URL}' mqttTopic='${MQTT_TOPIC}'"
