/**
 * MQTT message ingestion and device state updates
 * Handles parsing, device upserts, telemetry ingestion, ACK resolution
 */

import { tryParsePayload, extractNumericFields } from "../utils/parsing.js";
import { ensureDevice, computeStale } from "./device-registry.js";
import { pushPoint } from "../timeseries.js";
import { handleEvent } from "./event-handler.js";

/**
 * Process incoming telemetry/event for time-series storage
 * @param {Map} seriesMap - Time-series storage
 * @param {Map} latestMap - Latest telemetry cache
 * @param {object} tp - Parsed topic
 * @param {object} parsed - Parsed payload
 * @param {number} maxPoints - Max points per series
 */
export function ingestForPlotsWithTp(seriesMap, latestMap, tp, parsed, maxPoints = 1500) {
  if (parsed.kind !== "json" || !parsed.json) return;

  const device = tp.device || "unknown";
  const obj = parsed.json;

  const t =
    (typeof obj.ts_unix_ms === "number" && obj.ts_unix_ms) ||
    (typeof obj.t_ms === "number" && obj.t_ms) ||
    Date.now();

  latestMap.set(device, obj);

  const pairs = extractNumericFields(obj);
  for (const [k, v] of pairs) {
    const key = `${device}:${k}`;
    pushPoint(seriesMap, key, { t, v }, maxPoints);
  }
}

/**
 * Resolve ACK message for a pending command
 * @param {Map} devicesMap - Device registry
 * @param {string} deviceId - Device ID
 * @param {string} ackAction - ACK action name
 * @param {object} ackJson - ACK payload
 * @param {function} onAckResolved - Callback when ACK processed
 */
export function resolveAck(devicesMap, deviceId, ackAction, ackJson, onAckResolved) {
  const dev = ensureDevice(devicesMap, deviceId);
  if (!dev || !ackJson || typeof ackJson !== "object") return;

  const id = ackJson.id || ackJson.req_id || ackJson.request_id;
  if (!id) return;

  const pending = dev.pendingCommands.get(id);
  if (!pending) return;

  clearTimeout(pending.timeoutId);
  pending.status = ackJson.ok === false ? "failed" : "acked";
  pending.error = ackJson.err || ackJson.error || null;

  dev.pendingCommands.delete(id);

  onAckResolved({
    deviceId,
    action: pending.action || ackAction,
    status: pending.status,
    error: pending.error,
    ackJson
  });
}

/**
 * Upsert device state from incoming MQTT message
 * Updates device metadata based on topic family (status, state, meta, telemetry, etc.)
 * @param {Map} devicesMap - Device registry
 * @param {string} topic - MQTT topic
 * @param {object} tp - Parsed topic
 * @param {object} parsed - Parsed payload
 * @returns {object|null} Updated device or null
 */
export function upsertDeviceFromMessage(devicesMap, topic, tp, parsed) {
  if (!tp?.isPulsar || !tp.device) return null;

  const dev = ensureDevice(devicesMap, tp.device);
  if (!dev) return null;

  dev.lastSeenMs = Date.now();
  computeStale(dev);

  const kind = tp.kind || "";
  const path = tp.path || "";

  if (kind === "status") {
    if (parsed.kind === "json" && parsed.json && typeof parsed.json === "object") {
      dev.latestStatus = parsed.json;
      if (typeof parsed.json.online === "boolean") dev.online = parsed.json.online;
      else dev.online = true;
    } else {
      dev.online = true;
    }
    return dev;
  }

  if (kind === "meta") {
    const key = path || "root";
    if (parsed.kind === "json") dev.meta.set(key, parsed.json);
    else dev.meta.set(key, { text: parsed.text ?? "" });
    return dev;
  }

  if (kind === "state") {
    const key = path || "root";
    if (parsed.kind === "json") dev.state.set(key, parsed.json);
    else dev.state.set(key, { text: parsed.text ?? "" });
    return dev;
  }

  if (kind === "ack") {
    // ACK is handled separately; return null here
    return null;
  }

  if (kind === "telemetry" || kind === "event") {
    dev.online = true;
    if (kind === "telemetry" && parsed.kind === "json") dev.latestTelemetry = parsed.json;
    return dev;
  }

  dev.online = true;
  return dev;
}

/**
 * Main MQTT message handler
 * Orchestrates parsing, device updates, telemetry ingestion
 * @param {object} options - Handler options
 * @param {Map} options.devicesMap - Device registry
 * @param {Map} options.seriesMap - Time-series storage
 * @param {Map} options.latestMap - Latest telemetry cache
 * @param {Map} options.messagesRef - Raw message buffer
 * @param {boolean} options.paused - Whether to buffer messages
 * @param {function} options.parsePulsarTopic - Topic parser
 * @param {function} options.onAckResolved - ACK callback
 * @param {function} options.onDeviceChanged - Device change callback
 * @param {function} options.onEvent - Event callback
 * @param {number} options.maxPoints - Max time-series points
 * @returns {function} Handler function: (topic, payload) => void
 */
export function createMqttMessageHandler(options) {
  const {
    devicesMap,
    seriesMap,
    latestMap,
    messagesRef,
    paused,
    parsePulsarTopic,
    onAckResolved,
    onDeviceChanged,
    onEvent,
    maxPoints = 1500
  } = options;

  return function handleIncoming(topic, payload) {
    const parsed = tryParsePayload(payload);
    const tp = parsePulsarTopic(topic);

    // Ingest telemetry/event for time-series
    if (tp?.isPulsar && (tp.kind === "telemetry" || tp.kind === "event")) {
      ingestForPlotsWithTp(seriesMap, latestMap, tp, parsed, maxPoints);
    }

    // Handle events for markers and notifications
    if (tp?.isPulsar && tp.kind === "event") {
      handleEvent(tp, parsed, onEvent);
    }

    // Resolve ACK
    if (tp?.isPulsar && tp.kind === "ack") {
      resolveAck(devicesMap, tp.device, tp.path || "unknown", parsed.json, onAckResolved);
    }

    // Update device state
    upsertDeviceFromMessage(devicesMap, topic, tp, parsed);

    // Signal change
    onDeviceChanged();

    // Buffer raw message
    if (!paused) {
      messagesRef.current.unshift({
        id: Math.random().toString(36).slice(2),
        t: new Date().toISOString(),
        topic,
        topicParsed: tp,
        payloadLen: payload?.length ?? payload?.byteLength ?? 0,
        parsed
      });
      if (messagesRef.current.length > 2000) messagesRef.current.length = 2000;
    }
  };
}
