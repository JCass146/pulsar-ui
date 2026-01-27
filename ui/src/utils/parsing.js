/**
 * Payload parsing and field extraction utilities
 */

import { isFiniteNumber } from "./helpers.js";

/**
 * Parse incoming MQTT payload (binary/text/JSON)
 * @param {Uint8Array|Buffer|string} payloadU8
 * @returns {{ kind: string, text: string, json?: object }}
 */
export function tryParsePayload(payloadU8) {
  let text = "";
  try {
    if (
      typeof payloadU8?.toString === "function" &&
      payloadU8?.toString !== Uint8Array.prototype.toString
    ) {
      text = payloadU8.toString("utf8");
    } else {
      text = new TextDecoder().decode(payloadU8);
    }
  } catch {
    text = "";
  }

  const trimmed = text.trim();
  if (!trimmed) return { kind: "empty", text: "" };

  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const json = JSON.parse(trimmed);
      return { kind: "json", text: trimmed, json };
    } catch {
      // fall through
    }
  }

  return { kind: "text", text };
}

/**
 * Extract numeric fields from a payload object
 * Filters out metadata fields (timestamps, seq, etc.)
 * @param {object} obj - Parsed JSON payload
 * @returns {[string, number][]} - [fieldName, value] pairs
 */
export function extractNumericFields(obj) {
  if (!obj || typeof obj !== "object") return [];
  const out = [];

  if (isFiniteNumber(obj.value)) out.push(["value", obj.value]);

  const fieldsObj = obj.fields && typeof obj.fields === "object" ? obj.fields : null;
  if (fieldsObj) {
    for (const [k, v] of Object.entries(fieldsObj)) {
      if (isFiniteNumber(v)) out.push([k, v]);
    }
  }

  const ignore = new Set(["t_ms", "ts_unix_ms", "ts", "seq", "uptime_ms", "ts_uptime_ms", "v"]);
  for (const [k, v] of Object.entries(obj)) {
    if (ignore.has(k) || k === "fields") continue;
    if (isFiniteNumber(v)) out.push([k, v]);
  }

  const seen = new Set();
  return out.filter(([k]) => {
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
