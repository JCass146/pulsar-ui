/**
 * General-purpose helper utilities
 */

export function nowIsoMs() {
  return new Date().toISOString();
}

export function newId() {
  try {
    return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  } catch {
    return `${Date.now()}-${Math.random()}`;
  }
}

export function safeJsonStringify(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Format a duration in milliseconds to a human-readable string.
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., "2.5s", "1m 30s", "45ms")
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
