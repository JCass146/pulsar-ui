/**
 * event-handler.js - Milestone 4.1
 *
 * Event markers pipeline for charts and notifications.
 * Subscribes to pulsar/<device>/event/<name>, normalizes events, and stores them for timeline/chart markers.
 */

import { newId } from "../utils/helpers.js";

/**
 * Normalized event schema
 * @typedef {Object} NormalizedEvent
 * @property {string} id - Unique event ID
 * @property {string} device - Device ID
 * @property {string} name - Event name (from topic path)
 * @property {number} ts_unix_ms - Timestamp in milliseconds
 * @property {string} severity - info|warn|error
 * @property {string} msg - Human-readable message
 * @property {object} data - Additional event data
 */

/**
 * Event store with time-windowed storage
 */
class EventStore {
  constructor(maxEvents = 1000) {
    this.events = [];
    this.maxEvents = maxEvents;
  }

  /**
   * Add a normalized event
   * @param {NormalizedEvent} event
   */
  add(event) {
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.length = this.maxEvents;
    }
  }

  /**
   * Query events by time range and filters
   * @param {number} startMs - Start timestamp
   * @param {number} endMs - End timestamp
   * @param {Object} filters - { device?, name?, severity? }
   * @returns {NormalizedEvent[]}
   */
  query(startMs, endMs, filters = {}) {
    return this.events.filter(event => {
      if (event.ts_unix_ms < startMs || event.ts_unix_ms > endMs) return false;
      if (filters.device && event.device !== filters.device) return false;
      if (filters.name && event.name !== filters.name) return false;
      if (filters.severity && event.severity !== filters.severity) return false;
      return true;
    });
  }

  /**
   * Purge old events beyond time window
   * @param {number} cutoffMs - Events older than this will be removed
   */
  purge(cutoffMs) {
    this.events = this.events.filter(event => event.ts_unix_ms >= cutoffMs);
  }
}

/**
 * Global event store instance
 */
const eventStore = new EventStore();

/**
 * Normalize incoming event payload
 * @param {object} tp - Parsed topic
 * @param {object} parsed - Parsed payload
 * @returns {NormalizedEvent|null}
 */
export function normalizeEvent(tp, parsed) {
  if (!tp?.isPulsar || tp.kind !== "event" || !tp.device) return null;

  const eventName = tp.path || "unknown";
  const now = Date.now();

  // If JSON payload, extract fields
  if (parsed.kind === "json" && parsed.json) {
    const json = parsed.json;
    return {
      id: json.id || newId(),
      device: tp.device,
      name: eventName,
      ts_unix_ms: json.ts_unix_ms || json.t_ms || now,
      severity: json.severity || "info",
      msg: json.msg || json.message || "Event occurred",
      data: json.data || {}
    };
  }

  // Fallback for text payloads
  return {
    id: newId(),
    device: tp.device,
    name: eventName,
    ts_unix_ms: now,
    severity: "info",
    msg: parsed.text || "Event occurred",
    data: {}
  };
}

/**
 * Handle incoming event message
 * @param {object} tp - Parsed topic
 * @param {object} parsed - Parsed payload
 * @param {function} onEvent - Callback for new events
 */
export function handleEvent(tp, parsed, onEvent) {
  const event = normalizeEvent(tp, parsed);
  if (event) {
    eventStore.add(event);
    if (onEvent) onEvent(event);
  }
}

/**
 * Get events for chart markers
 * @param {number} startMs
 * @param {number} endMs
 * @param {string} device
 * @returns {NormalizedEvent[]}
 */
export function getEventsForChart(startMs, endMs, device) {
  return eventStore.query(startMs, endMs, { device });
}

/**
 * Get events for timeline
 * @param {number} startMs
 * @param {number} endMs
 * @param {Object} filters
 * @returns {NormalizedEvent[]}
 */
export function getEventsForTimeline(startMs, endMs, filters = {}) {
  return eventStore.query(startMs, endMs, filters);
}

/**
 * Purge old events
 * @param {number} cutoffMs
 */
export function purgeOldEvents(cutoffMs) {
  eventStore.purge(cutoffMs);
}