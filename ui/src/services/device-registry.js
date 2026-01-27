/**
 * Device registry management
 * Handles device creation, state tracking, online/stale detection
 */

import { isFiniteNumber } from "../utils/helpers.js";

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
    d = {
      id,
      online: false,
      lastSeenMs: 0,
      stale: true,

      latestTelemetry: null,
      latestStatus: null,

      state: new Map(),
      meta: new Map(),

      pendingCommands: new Map()
    };
    devicesMap.set(id, d);
  }
  return d;
}

/**
 * Update device stale flag based on lastSeenMs
 * @param {object} dev - Device object
 * @param {number} staleAfterMs - Threshold for stale detection
 */
export function computeStale(dev, staleAfterMs = 5000) {
  const last = dev?.lastSeenMs || 0;
  dev.stale = !last || Date.now() - last > staleAfterMs;
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
