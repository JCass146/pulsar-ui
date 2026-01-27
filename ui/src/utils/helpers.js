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
