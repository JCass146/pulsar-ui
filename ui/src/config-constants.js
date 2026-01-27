/**
 * APP_CONFIG
 *
 * Centralized application configuration constants.
 * These values are used throughout the app and can be tuned for performance.
 */

export const APP_CONFIG = {
  // Refresh rates & intervals (milliseconds)
  DEVICE_TICK_THROTTLE_MS: 100,          // Device update throttle (10 Hz)
  RAW_VIEW_REFRESH_MS: 100,              // Raw message view refresh (10 Hz)
  STALE_CHECK_INTERVAL_MS: 500,          // Stale/online status check (2 Hz)
  COMMAND_TIMEOUT_MS: 2000,              // Default command ACK timeout

  // Data buffer limits
  MAX_MESSAGES: 1000,                    // Max raw messages kept in circular buffer (was 2000)
  MAX_TIME_SERIES_POINTS: 1500,          // Max points per metric in time-series
  MAX_DEVICES: 5000,                     // Max devices before LRU cleanup
  MAX_NOTIFICATIONS: 400,                // Max notifications kept in history
  MAX_PAYLOAD_SIZE_BYTES: 1_000_000,     // 1 MB max payload size

  // Timeouts
  MQTT_RECONNECT_INTERVAL_MS: 1500,      // MQTT reconnect backoff
  MQTT_TIMEOUT_MS: 5000,                 // MQTT operation timeout
  COMMAND_HISTORY_LIMIT: 60,             // Keep last N commands in history

  // Thresholds
  STALE_AFTER_MS: 5000,                  // Device marked stale after no updates (5s)
  OFFLINE_AFTER_MS: 15000,               // Device marked offline (3x stale threshold, min 15s)
  DEVICE_CLEANUP_AGE_MS: 3_600_000,      // Remove offline devices after 1 hour

  // UI
  DEBOUNCE_INPUT_MS: 500,                // Debounce user text input
  MAX_WATCHED_FIELDS: 24,                // Max pinned metrics per device
  CHART_RESPONSIVE_WIDTH: 600,           // Breakpoint for responsive layout

  // Metric freshness (milliseconds)
  METRIC_FRESH_MS: 2000,                 // Metric considered "fresh" if updated within 2s
  METRIC_STALE_MS: 5000,                 // Metric marked stale after 5s
};


/**
 * METRIC_THRESHOLDS
 *
 * Threshold definitions for visual warnings on metrics.
 * Keys are field name patterns (exact match or suffix match).
 * Each threshold has: warn (yellow) and critical (red) bounds.
 * Set min/max to null to disable that bound.
 *
 * Example: pressure_psi with warnMin: 10, critMin: 5, warnMax: 100, critMax: 120
 * - Below 5: CRITICAL (red)
 * - 5-10: WARNING (yellow)
 * - 10-100: OK (green/normal)
 * - 100-120: WARNING (yellow)
 * - Above 120: CRITICAL (red)
 */
export const METRIC_THRESHOLDS = {
  // Pressure sensors
  pressure_psi: {
    warnMin: 10,
    critMin: 5,
    warnMax: 100,
    critMax: 120,
    unit: "psi"
  },
  pressure_bar: {
    warnMin: 0.7,
    critMin: 0.3,
    warnMax: 7,
    critMax: 8.5,
    unit: "bar"
  },

  // Temperature sensors
  temp_c: {
    warnMin: 5,
    critMin: 0,
    warnMax: 60,
    critMax: 80,
    unit: "°C"
  },
  temp_f: {
    warnMin: 40,
    critMin: 32,
    warnMax: 140,
    critMax: 176,
    unit: "°F"
  },

  // Mass/weight
  mass_g: {
    warnMin: null,
    critMin: null,
    warnMax: 5000,
    critMax: 6000,
    unit: "g"
  },
  mass_kg: {
    warnMin: null,
    critMin: null,
    warnMax: 50,
    critMax: 60,
    unit: "kg"
  },

  // Voltage
  voltage_v: {
    warnMin: 11.5,
    critMin: 10.5,
    warnMax: 14.5,
    critMax: 15.5,
    unit: "V"
  },
  battery_v: {
    warnMin: 11.0,
    critMin: 10.0,
    warnMax: 14.4,
    critMax: 15.0,
    unit: "V"
  },

  // Current
  current_a: {
    warnMin: null,
    critMin: null,
    warnMax: 10,
    critMax: 15,
    unit: "A"
  },

  // Flow rates
  flow_lpm: {
    warnMin: 0.5,
    critMin: 0.1,
    warnMax: null,
    critMax: null,
    unit: "L/min"
  },

  // Percentages
  _pct: {
    warnMin: 10,
    critMin: 5,
    warnMax: 90,
    critMax: 95,
    unit: "%"
  },
  _percent: {
    warnMin: 10,
    critMin: 5,
    warnMax: 90,
    critMax: 95,
    unit: "%"
  },
};


/**
 * getThresholdForField(fieldName)
 *
 * Looks up threshold config for a field.
 * Tries exact match first, then suffix match (e.g., "_psi" matches "tank_pressure_psi").
 *
 * @param {string} fieldName
 * @returns {object|null} Threshold config or null
 */
export function getThresholdForField(fieldName) {
  if (!fieldName) return null;
  const name = String(fieldName).toLowerCase();

  // Exact match
  if (METRIC_THRESHOLDS[name]) {
    return METRIC_THRESHOLDS[name];
  }

  // Suffix match (for patterns like _psi, _c, _pct)
  for (const [pattern, config] of Object.entries(METRIC_THRESHOLDS)) {
    if (pattern.startsWith("_") && name.endsWith(pattern)) {
      return config;
    }
  }

  return null;
}


/**
 * evaluateThreshold(value, threshold)
 *
 * Evaluates a value against a threshold config.
 *
 * @param {number} value - The metric value
 * @param {object} threshold - Threshold config from METRIC_THRESHOLDS
 * @returns {"ok"|"warn"|"critical"} Status string
 */
export function evaluateThreshold(value, threshold) {
  if (threshold === null || value === null || value === undefined || !Number.isFinite(value)) {
    return "ok";
  }

  const { warnMin, critMin, warnMax, critMax } = threshold;

  // Check critical bounds first (more severe)
  if (critMin !== null && value < critMin) return "critical";
  if (critMax !== null && value > critMax) return "critical";

  // Check warning bounds
  if (warnMin !== null && value < warnMin) return "warn";
  if (warnMax !== null && value > warnMax) return "warn";

  return "ok";
}


/**
 * getConfig(key)
 * Retrieves a config value by key, returns undefined if not found
 * @param {string} key
 * @returns {*}
 */
export function getConfig(key) {
  return APP_CONFIG[key];
}

/**
 * updateConfig(key, value)
 * Updates a config value at runtime (use cautiously)
 * @param {string} key
 * @param {*} value
 */
export function updateConfig(key, value) {
  if (key in APP_CONFIG) {
    const oldValue = APP_CONFIG[key];
    APP_CONFIG[key] = value;
    console.info(`[Config] Updated ${key}: ${oldValue} → ${value}`);
  } else {
    console.warn(`[Config] Unknown config key: ${key}`);
  }
}
