/**
 * Device registry management
 * Handles device creation, state tracking, online/stale detection,
 * lifecycle management, and tagging.
 *
 * Updated for Milestone 2.2 - Device Lifecycle Formalization
 */

import { isFiniteNumber } from "../utils/helpers.js";
import { loadDeviceTags, saveDeviceTags } from "../utils/persistence.js";

/**
 * Device lifecycle states
 */
export const DEVICE_STATES = {
  ONLINE: "online",      // Active, receiving data
  STALE: "stale",        // Connected but not receiving recent data
  OFFLINE: "offline",    // No connection
  UNKNOWN: "unknown",    // Initial state, never seen
};

/**
 * State transition events (for logging/debugging)
 */
export const LIFECYCLE_EVENTS = {
  FIRST_SEEN: "first_seen",
  BECAME_STALE: "became_stale",
  BECAME_FRESH: "became_fresh",
  WENT_OFFLINE: "went_offline",
  CAME_ONLINE: "came_online",
};

/**
 * Device tags storage (loaded from persistence)
 */
let deviceTagsCache = null;

function getDeviceTagsCache() {
  if (deviceTagsCache === null) {
    deviceTagsCache = loadDeviceTags();
  }
  return deviceTagsCache;
}

function setDeviceTagsCache(tags) {
  deviceTagsCache = tags;
  saveDeviceTags(tags);
}

/**
 * Create or retrieve a device from the registry
 * @param {Map} devicesMap - Device registry
 * @param {string} id - Device ID
 * @returns {object} Device object
 */
export function ensureDevice(devicesMap, id) {
  if (!id) return null;
  let d = devicesMap.get(id);
  if (!d) {
    const tags = getDeviceTagsCache();
    d = {
      id,
      online: false,
      lastSeenMs: 0,
      stale: true,
      lifecycleState: DEVICE_STATES.UNKNOWN,
      lifecycleChangedAt: 0,

      latestTelemetry: null,
      latestStatus: null,

      state: new Map(),
      meta: new Map(),

      pendingCommands: new Map(),

      // Tagging support (Milestone 2.3)
      tags: tags[id] || [],
      autoTags: [], // Derived from device_type, capabilities, etc.
    };
    devicesMap.set(id, d);
  }
  return d;
}

/**
 * Update device stale flag based on lastSeenMs
 * @param {object} dev - Device object
 * @param {number} staleAfterMs - Threshold for stale detection
 * @returns {string|null} Lifecycle event if state changed
 */
export function computeStale(dev, staleAfterMs = 5000) {
  const last = dev?.lastSeenMs || 0;
  const wasStale = dev.stale;
  dev.stale = !last || Date.now() - last > staleAfterMs;

  // Return lifecycle event if changed
  if (wasStale !== dev.stale) {
    return dev.stale ? LIFECYCLE_EVENTS.BECAME_STALE : LIFECYCLE_EVENTS.BECAME_FRESH;
  }
  return null;
}

/**
 * Get device role/type from capabilities metadata
 * @param {object} dev - Device object
 * @returns {string} Device type or "unknown"
 */
export function getDeviceRole(dev) {
  const caps = dev?.meta?.get("capabilities");
  const t = caps?.device_type;
  return t ? String(t) : "unknown";
}

/**
 * Compute online status from multiple signals
 * Priority: explicit status message > recent activity > offline
 * @param {object} dev - Device object
 * @param {number} staleAfterMs - Stale threshold
 * @returns {boolean} Online status
 */
export function computeOnline(dev, staleAfterMs = 5000) {
  const now = Date.now();

  // Explicit offline signal takes priority
  const statusOnline =
    typeof dev.latestStatus?.online === "boolean" ? dev.latestStatus.online : null;

  if (statusOnline === false) {
    return false;
  }

  // Never seen
  if (!dev.lastSeenMs) {
    return false;
  }

  // Offline if not seen for a while (3x stale threshold, minimum 15s)
  const offlineAfterMs = Math.max(staleAfterMs * 3, 15000);
  if (now - dev.lastSeenMs > offlineAfterMs) {
    return false;
  }

  return true;
}

/**
 * Compute full lifecycle state and update device
 * @param {object} dev - Device object
 * @param {number} staleAfterMs - Stale threshold
 * @returns {{ state: string, event: string|null }} New state and any transition event
 */
export function computeLifecycleState(dev, staleAfterMs = 5000) {
  const wasState = dev.lifecycleState;
  const wasOnline = dev.online;

  // Compute current state
  const staleEvent = computeStale(dev, staleAfterMs);
  dev.online = computeOnline(dev, staleAfterMs);

  // Determine lifecycle state
  let newState;
  if (!dev.lastSeenMs) {
    newState = DEVICE_STATES.UNKNOWN;
  } else if (!dev.online) {
    newState = DEVICE_STATES.OFFLINE;
  } else if (dev.stale) {
    newState = DEVICE_STATES.STALE;
  } else {
    newState = DEVICE_STATES.ONLINE;
  }

  // Detect transition event
  let event = null;
  if (wasState !== newState) {
    dev.lifecycleState = newState;
    dev.lifecycleChangedAt = Date.now();

    if (wasState === DEVICE_STATES.UNKNOWN && newState !== DEVICE_STATES.UNKNOWN) {
      event = LIFECYCLE_EVENTS.FIRST_SEEN;
    } else if (wasOnline && !dev.online) {
      event = LIFECYCLE_EVENTS.WENT_OFFLINE;
    } else if (!wasOnline && dev.online) {
      event = LIFECYCLE_EVENTS.CAME_ONLINE;
    } else if (staleEvent) {
      event = staleEvent;
    }
  }

  return { state: newState, event };
}

/**
 * Update device's auto-derived tags based on metadata
 * @param {object} dev - Device object
 */
export function updateAutoTags(dev) {
  const autoTags = [];

  // Tag from device_type
  const role = getDeviceRole(dev);
  if (role && role !== "unknown") {
    autoTags.push(`type:${role}`);
  }

  // Tag from capabilities
  const caps = dev?.meta?.get("capabilities");
  if (caps) {
    if (caps.has_relays) autoTags.push("has:relays");
    if (caps.has_sensors) autoTags.push("has:sensors");
    if (caps.has_actuators) autoTags.push("has:actuators");
    if (caps.fw) autoTags.push(`fw:${caps.fw}`);
  }

  // Tag from state
  const stateMap = dev?.state;
  if (stateMap instanceof Map) {
    if (stateMap.has("armed") && stateMap.get("armed")) {
      autoTags.push("state:armed");
    }
    if (stateMap.has("faults") && stateMap.get("faults")?.length > 0) {
      autoTags.push("state:faulted");
    }
  }

  dev.autoTags = autoTags;
}

/**
 * Get all tags for a device (manual + auto)
 * @param {object} dev - Device object
 * @returns {string[]} Combined tags
 */
export function getAllTags(dev) {
  const tags = new Set([...(dev.tags || []), ...(dev.autoTags || [])]);
  return Array.from(tags);
}

/**
 * Add a manual tag to a device
 * @param {object} dev - Device object
 * @param {string} tag - Tag to add
 */
export function addDeviceTag(dev, tag) {
  if (!tag || typeof tag !== "string") return;
  const normalizedTag = tag.trim().toLowerCase();
  if (!normalizedTag) return;

  if (!dev.tags) dev.tags = [];
  if (!dev.tags.includes(normalizedTag)) {
    dev.tags.push(normalizedTag);

    // Persist
    const cache = getDeviceTagsCache();
    cache[dev.id] = dev.tags;
    setDeviceTagsCache(cache);
  }
}

/**
 * Remove a manual tag from a device
 * @param {object} dev - Device object
 * @param {string} tag - Tag to remove
 */
export function removeDeviceTag(dev, tag) {
  if (!tag || !dev.tags) return;
  const normalizedTag = tag.trim().toLowerCase();
  const idx = dev.tags.indexOf(normalizedTag);
  if (idx !== -1) {
    dev.tags.splice(idx, 1);

    // Persist
    const cache = getDeviceTagsCache();
    cache[dev.id] = dev.tags;
    setDeviceTagsCache(cache);
  }
}

/**
 * Get all unique tags across all devices
 * @param {Map} devicesMap - Device registry
 * @returns {string[]} All unique tags
 */
export function getAllUniqueTags(devicesMap) {
  const tags = new Set();
  for (const dev of devicesMap.values()) {
    for (const t of getAllTags(dev)) {
      tags.add(t);
    }
  }
  return Array.from(tags).sort();
}

/**
 * Filter devices by tag
 * @param {Map} devicesMap - Device registry
 * @param {string} tag - Tag to filter by
 * @returns {object[]} Devices with that tag
 */
export function filterDevicesByTag(devicesMap, tag) {
  const result = [];
  const normalizedTag = tag.trim().toLowerCase();
  for (const dev of devicesMap.values()) {
    if (getAllTags(dev).includes(normalizedTag)) {
      result.push(dev);
    }
  }
  return result;
}

/**
 * Filter devices by multiple tags (AND logic)
 * @param {Map} devicesMap - Device registry
 * @param {string[]} tags - Tags to filter by
 * @returns {object[]} Devices with all tags
 */
export function filterDevicesByTags(devicesMap, tags) {
  const normalizedTags = tags.map(t => t.trim().toLowerCase());
  const result = [];
  for (const dev of devicesMap.values()) {
    const devTags = getAllTags(dev);
    if (normalizedTags.every(t => devTags.includes(t))) {
      result.push(dev);
    }
  }
  return result;
}
