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
};

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
