/**
 * Centralized Device Health Logic
 *
 * Single source of truth for computing device health states.
 * Used by: Fleet list, HealthSummaryBar, DeviceChip, Control target warnings
 *
 * Health States:
 * - healthy: Device online and receiving fresh data
 * - warning: Device online but data is stale (approaching offline threshold)
 * - offline: Device not seen for extended period
 * - unknown: Device never seen or no data available
 */

/**
 * Health state constants
 */
export const HEALTH_STATES = {
  HEALTHY: "healthy",
  WARNING: "warning",
  OFFLINE: "offline",
  UNKNOWN: "unknown",
};

/**
 * Health state display configuration
 */
export const HEALTH_CONFIG = {
  [HEALTH_STATES.HEALTHY]: {
    label: "Online",
    shortLabel: "ON",
    color: "var(--health-healthy, #40ffb6)",
    bgColor: "rgba(64, 255, 182, 0.12)",
    borderColor: "rgba(64, 255, 182, 0.35)",
    icon: "●",
    priority: 0,
  },
  [HEALTH_STATES.WARNING]: {
    label: "Stale",
    shortLabel: "STALE",
    color: "var(--health-warning, #ffd040)",
    bgColor: "rgba(255, 208, 64, 0.12)",
    borderColor: "rgba(255, 208, 64, 0.35)",
    icon: "◐",
    priority: 1,
  },
  [HEALTH_STATES.OFFLINE]: {
    label: "Offline",
    shortLabel: "OFF",
    color: "var(--health-offline, #ff4078)",
    bgColor: "rgba(255, 64, 120, 0.12)",
    borderColor: "rgba(255, 64, 120, 0.35)",
    icon: "○",
    priority: 2,
  },
  [HEALTH_STATES.UNKNOWN]: {
    label: "Unknown",
    shortLabel: "?",
    color: "var(--health-unknown, #9bb0c6)",
    bgColor: "rgba(155, 176, 198, 0.08)",
    borderColor: "rgba(155, 176, 198, 0.25)",
    icon: "◌",
    priority: 3,
  },
};

/**
 * Compute device health state from device object
 *
 * @param {object} device - Device object with online, stale, lastSeenMs properties
 * @returns {string} One of HEALTH_STATES values
 */
export function computeDeviceHealth(device) {
  if (!device) {
    return HEALTH_STATES.UNKNOWN;
  }

  // Never seen any data
  if (!device.lastSeenMs && !device.online) {
    return HEALTH_STATES.UNKNOWN;
  }

  // Explicit offline
  if (device.online === false) {
    return HEALTH_STATES.OFFLINE;
  }

  // Online but stale
  if (device.online && device.stale) {
    return HEALTH_STATES.WARNING;
  }

  // Online and fresh
  if (device.online) {
    return HEALTH_STATES.HEALTHY;
  }

  // Fallback: treat as unknown
  return HEALTH_STATES.UNKNOWN;
}

/**
 * Get health configuration for a device
 *
 * @param {object} device - Device object
 * @returns {object} Health configuration object
 */
export function getHealthConfig(device) {
  const health = computeDeviceHealth(device);
  return HEALTH_CONFIG[health];
}

/**
 * Get health dot class name for CSS styling
 *
 * @param {object} device - Device object
 * @returns {string} CSS class name (e.g., "health-healthy")
 */
export function getHealthClass(device) {
  const health = computeDeviceHealth(device);
  return `health-${health}`;
}

/**
 * Compute fleet health summary counts
 *
 * @param {Array} deviceList - Array of device objects (or device summary objects)
 * @returns {object} { healthy, warning, offline, unknown, total, alerts }
 */
export function computeFleetHealthSummary(deviceList) {
  const summary = {
    healthy: 0,
    warning: 0,
    offline: 0,
    unknown: 0,
    total: 0,
    alerts: 0,
  };

  if (!Array.isArray(deviceList)) {
    return summary;
  }

  for (const device of deviceList) {
    summary.total++;
    const health = computeDeviceHealth(device);

    switch (health) {
      case HEALTH_STATES.HEALTHY:
        summary.healthy++;
        break;
      case HEALTH_STATES.WARNING:
        summary.warning++;
        summary.alerts++; // Stale devices count as alerts
        break;
      case HEALTH_STATES.OFFLINE:
        summary.offline++;
        summary.alerts++; // Offline devices count as alerts
        break;
      case HEALTH_STATES.UNKNOWN:
      default:
        summary.unknown++;
        break;
    }
  }

  return summary;
}

/**
 * Sort devices by health priority (worst health first)
 *
 * @param {Array} deviceList - Array of device objects
 * @returns {Array} Sorted array (copy)
 */
export function sortDevicesByHealth(deviceList) {
  if (!Array.isArray(deviceList)) return [];

  return [...deviceList].sort((a, b) => {
    const healthA = computeDeviceHealth(a);
    const healthB = computeDeviceHealth(b);
    const priorityA = HEALTH_CONFIG[healthA]?.priority ?? 99;
    const priorityB = HEALTH_CONFIG[healthB]?.priority ?? 99;

    // Primary: health priority (lower = better health, but we want worst first for alerts)
    // Actually, let's sort healthy first for normal lists
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Secondary: alphabetical by ID
    return (a.id || "").localeCompare(b.id || "");
  });
}

/**
 * Filter devices by health state
 *
 * @param {Array} deviceList - Array of device objects
 * @param {string} healthFilter - One of HEALTH_STATES values, or "all" or "alerts"
 * @returns {Array} Filtered array
 */
export function filterDevicesByHealth(deviceList, healthFilter) {
  if (!Array.isArray(deviceList)) return [];
  if (!healthFilter || healthFilter === "all") return deviceList;

  if (healthFilter === "alerts") {
    // Alerts = warning + offline
    return deviceList.filter((d) => {
      const health = computeDeviceHealth(d);
      return health === HEALTH_STATES.WARNING || health === HEALTH_STATES.OFFLINE;
    });
  }

  return deviceList.filter((d) => computeDeviceHealth(d) === healthFilter);
}

/**
 * Get friendly name for a device (from meta or fallback to short ID)
 *
 * @param {object} device - Device object (may have meta Map)
 * @param {object} devicesRef - Optional ref to full devices Map for lookup
 * @returns {string} Friendly name or null
 */
export function getDeviceFriendlyName(device, devicesRef) {
  if (!device) return null;

  // Try device's meta
  let meta = device.meta;
  if (!meta && devicesRef?.current && device.id) {
    const fullDevice = devicesRef.current.get(device.id);
    meta = fullDevice?.meta;
  }

  if (meta instanceof Map) {
    const name = meta.get("name") || meta.get("friendly_name") || meta.get("label");
    if (name && typeof name === "string") return name;

    // Check capabilities for device_type as a fallback "name"
    const caps = meta.get("capabilities");
    if (caps?.friendly_name) return caps.friendly_name;
  }

  return null;
}

/**
 * Format device ID as short version
 *
 * @param {string} deviceId - Full device ID (e.g., "743B12AB-8DEF-4567-89AB-CDEF01234BB0")
 * @param {number} chars - Number of characters to show at start and end (default 4)
 * @returns {string} Short ID (e.g., "743B…4BB0")
 */
export function formatShortDeviceId(deviceId, chars = 4) {
  if (!deviceId || typeof deviceId !== "string") return "—";

  // Remove any dashes for consistent formatting
  const clean = deviceId.replace(/-/g, "");

  if (clean.length <= chars * 2 + 1) {
    return deviceId; // Already short enough
  }

  const start = clean.slice(0, chars).toUpperCase();
  const end = clean.slice(-chars).toUpperCase();
  return `${start}…${end}`;
}

/**
 * Get latency/last seen display text
 *
 * @param {number} lastSeenMs - Timestamp of last seen
 * @returns {string} Human-readable time ago
 */
export function formatLastSeen(lastSeenMs) {
  if (!lastSeenMs) return "never";

  const ms = Date.now() - lastSeenMs;
  if (ms < 0) return "—";
  if (ms < 1000) return "now";
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

/**
 * User-friendly field label mapping
 * Maps technical field names to human-readable labels
 */
export const FIELD_LABELS = {
  heap_free: "Memory available",
  heap_used: "Memory used",
  uptime_ms: "Uptime",
  uptime: "Uptime",
  temp_c: "Temperature",
  temp_f: "Temperature",
  pressure_psi: "Pressure",
  pressure_kpa: "Pressure",
  mass_g: "Mass",
  mass_kg: "Mass",
  voltage_v: "Voltage",
  current_ma: "Current",
  rssi: "Signal strength",
  latency_ms: "Latency",
};

/**
 * Get user-friendly label for a field
 *
 * @param {string} field - Technical field name
 * @param {boolean} includeOriginal - Whether to include original name in parentheses
 * @returns {string} User-friendly label
 */
export function getFriendlyFieldLabel(field, includeOriginal = false) {
  const label = FIELD_LABELS[field];
  if (label) {
    return includeOriginal ? `${label} (${field})` : label;
  }
  return field;
}
