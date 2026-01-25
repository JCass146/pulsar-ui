import mqtt from "mqtt";

/**
 * Connect to MQTT over WebSockets.
 *
 * @param {object} params
 * @param {string} params.url - ws://... (required)
 * @param {(state: object) => void=} params.onState
 * @param {(topic: string, payload: Uint8Array) => void=} params.onMessage
 */
export function connectMqtt({ url, onState, onMessage } = {}) {
  if (!url) throw new Error("connectMqtt requires a WebSocket URL");

  const client = mqtt.connect(url, {
    clean: true,
    reconnectPeriod: 1500,
    connectTimeout: 5000
  });

  const emit = (patch) => onState?.({ url, ...patch });

  client.on("connect", () => emit({ status: "connected" }));
  client.on("reconnect", () => emit({ status: "reconnecting" }));
  client.on("close", () => emit({ status: "closed" }));
  client.on("offline", () => emit({ status: "offline" }));
  client.on("error", (err) => emit({ status: "error", error: String(err?.message || err) }));

  client.on("message", (topic, payload) => {
    try {
      onMessage?.(topic, payload);
    } catch {
      // keep client alive if UI throws
    }
  });

  function subscribe(topic, opts) {
    if (!topic) return;
    client.subscribe(topic, { qos: 0, ...opts }, (err) => {
      if (err) emit({ status: "error", error: `subscribe failed: ${err.message}` });
    });
  }

  function publish(topic, message, opts) {
    if (!topic) return;
    const payload = typeof message === "string" ? message : JSON.stringify(message);
    client.publish(topic, payload, { qos: 0, ...opts }, (err) => {
      if (err) emit({ status: "error", error: `publish failed: ${err.message}` });
    });
  }

  function end() {
    try {
      client.end(true);
    } catch {
      /* noop */
    }
  }

  return { client, subscribe, publish, end, wsUrl: url };
}
