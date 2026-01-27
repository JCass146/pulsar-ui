/**
 * persistence.js
 *
 * Centralized localStorage persistence utilities with versioning,
 * quota handling, and migration support for Pulsar UI settings.
 */

const STORAGE_PREFIX = "pulsarui:";

/**
 * Storage keys with version numbers.
 * Bump version when schema changes to trigger migration.
 */
export const STORAGE_KEYS = {
  WATCHED_FIELDS: "watchedFields:v1",
  PINNED_METRICS: "pinnedMetrics:v1",
  THRESHOLD_OVERRIDES: "thresholds:v1",
  THEME: "theme:v1",
  DASHBOARD_LAYOUT: "dashLayout:v1",
  DEVICE_TAGS: "deviceTags:v1",
  COMMAND_TEMPLATES: "cmdTemplates:v1",
  NOTIFICATION_PREFS: "notifPrefs:v1",
};

/**
 * Default values for each storage key.
 */
const DEFAULTS = {
  [STORAGE_KEYS.WATCHED_FIELDS]: ["pressure_psi", "mass_g", "temp_c"],
  [STORAGE_KEYS.PINNED_METRICS]: [],
  [STORAGE_KEYS.THRESHOLD_OVERRIDES]: {},
  [STORAGE_KEYS.THEME]: "dark",
  [STORAGE_KEYS.DASHBOARD_LAYOUT]: { rightRailCollapsed: false },
  [STORAGE_KEYS.DEVICE_TAGS]: {},
  [STORAGE_KEYS.COMMAND_TEMPLATES]: [],
  [STORAGE_KEYS.NOTIFICATION_PREFS]: { sound: false, browser: false },
};


/**
 * loadStorage(key, fallback?)
 *
 * Loads a value from localStorage with automatic JSON parsing.
 * Returns fallback (or default) if key doesn't exist or parsing fails.
 *
 * @param {string} key - Storage key from STORAGE_KEYS
 * @param {*} fallback - Optional fallback value (overrides DEFAULTS)
 * @returns {*} Parsed value or fallback
 */
export function loadStorage(key, fallback = undefined) {
  const defaultVal = fallback !== undefined ? fallback : DEFAULTS[key];

  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return defaultVal;

    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.warn(`[Persistence] Failed to load ${key}:`, err.message);
    return defaultVal;
  }
}


/**
 * saveStorage(key, value, onError?)
 *
 * Saves a value to localStorage with automatic JSON stringification.
 * Handles quota exceeded errors gracefully.
 *
 * @param {string} key - Storage key from STORAGE_KEYS
 * @param {*} value - Value to save (will be JSON stringified)
 * @param {function} onError - Optional error callback (receives error object)
 * @returns {boolean} True if save succeeded
 */
export function saveStorage(key, value, onError = null) {
  try {
    const json = JSON.stringify(value);
    localStorage.setItem(STORAGE_PREFIX + key, json);
    return true;
  } catch (err) {
    if (err.name === "QuotaExceededError") {
      console.warn(`[Persistence] Storage quota exceeded for ${key}`);
      // Try to free space by removing old data
      tryFreeStorage();
    } else {
      console.error(`[Persistence] Failed to save ${key}:`, err.message);
    }

    if (onError) onError(err);
    return false;
  }
}


/**
 * removeStorage(key)
 *
 * Removes a key from localStorage.
 *
 * @param {string} key - Storage key from STORAGE_KEYS
 */
export function removeStorage(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (err) {
    console.warn(`[Persistence] Failed to remove ${key}:`, err.message);
  }
}


/**
 * clearAllStorage()
 *
 * Removes all Pulsar UI storage keys.
 */
export function clearAllStorage() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
    console.info(`[Persistence] Cleared ${keysToRemove.length} storage keys`);
  } catch (err) {
    console.error("[Persistence] Failed to clear storage:", err.message);
  }
}


/**
 * tryFreeStorage()
 *
 * Attempts to free storage space by removing non-critical cached data.
 * Called automatically on quota exceeded.
 */
function tryFreeStorage() {
  // Remove old versioned keys that might be lingering
  const oldPrefixes = ["pulsarui:watchedFields:v0", "pulsarui:theme:v0"];
  for (const prefix of oldPrefixes) {
    try {
      localStorage.removeItem(prefix);
    } catch { /* ignore */ }
  }
}


/**
 * getStorageUsage()
 *
 * Returns approximate storage usage in bytes.
 *
 * @returns {{ used: number, keys: number }} Usage stats
 */
export function getStorageUsage() {
  let used = 0;
  let keys = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        const v = localStorage.getItem(k) || "";
        used += k.length + v.length;
        keys++;
      }
    }
  } catch { /* ignore */ }

  return { used: used * 2, keys }; // UTF-16 = 2 bytes per char
}


// ---- Convenience wrappers for common operations ----

/**
 * Load pinned metrics for right-rail display.
 * Format: [{ deviceId, field, pinOrder }]
 */
export function loadPinnedMetrics() {
  return loadStorage(STORAGE_KEYS.PINNED_METRICS, []);
}

export function savePinnedMetrics(metrics, onError = null) {
  return saveStorage(STORAGE_KEYS.PINNED_METRICS, metrics, onError);
}


/**
 * Load/save threshold overrides.
 * Format: { fieldName: { warnMin, warnMax, critMin, critMax } }
 */
export function loadThresholdOverrides() {
  return loadStorage(STORAGE_KEYS.THRESHOLD_OVERRIDES, {});
}

export function saveThresholdOverrides(overrides, onError = null) {
  return saveStorage(STORAGE_KEYS.THRESHOLD_OVERRIDES, overrides, onError);
}


/**
 * Load/save notification preferences.
 */
export function loadNotificationPrefs() {
  return loadStorage(STORAGE_KEYS.NOTIFICATION_PREFS, { sound: false, browser: false });
}

export function saveNotificationPrefs(prefs, onError = null) {
  return saveStorage(STORAGE_KEYS.NOTIFICATION_PREFS, prefs, onError);
}


/**
 * Load/save device tags.
 * Format: { deviceId: ["tag1", "tag2"] }
 */
export function loadDeviceTags() {
  return loadStorage(STORAGE_KEYS.DEVICE_TAGS, {});
}

export function saveDeviceTags(tags, onError = null) {
  return saveStorage(STORAGE_KEYS.DEVICE_TAGS, tags, onError);
}


/**
 * Load/save command templates.
 * Format: [{ id, name, action, args, description }]
 */
export function loadCommandTemplates() {
  return loadStorage(STORAGE_KEYS.COMMAND_TEMPLATES, []);
}

export function saveCommandTemplates(templates, onError = null) {
  return saveStorage(STORAGE_KEYS.COMMAND_TEMPLATES, templates, onError);
}
