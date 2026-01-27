/**
 * ErrorHandlerService
 *
 * Centralized error handling and logging strategy for the application.
 * Provides consistent error reporting across all modules.
 *
 * Usage:
 *   import { errorHandler } from "../services/error-handler.js";
 *   
 *   try {
 *     // operation
 *   } catch (err) {
 *     errorHandler.logError("MQTT parsing failed", err, { topic: "foo/bar" });
 *     errorHandler.notifyError("Bad Data", "Could not parse message payload");
 *   }
 */

// Error levels
const ERROR_LEVEL = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  CRITICAL: "critical",
};

class ErrorHandlerService {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 500;
    this.onNotify = null;
  }

  /**
   * Set callback for user notifications
   * @param {Function} callback - (level, title, detail, device) => void
   */
  setNotifyCallback(callback) {
    this.onNotify = typeof callback === "function" ? callback : null;
  }

  /**
   * Log error with structured context
   * @param {string} message - Human-readable message
   * @param {Error} error - Error object
   * @param {Object} context - Additional context (topic, deviceId, etc.)
   * @param {string} level - Error level (default: "error")
   */
  logError(message, error, context = {}, level = ERROR_LEVEL.ERROR) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      errorMessage: error?.message || String(error),
      errorStack: error?.stack || null,
      context,
    };

    this.errorLog.push(entry);

    // Keep log bounded
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Console output for development
    const consoleMethod =
      level === ERROR_LEVEL.CRITICAL
        ? "error"
        : level === ERROR_LEVEL.ERROR
          ? "error"
          : level === ERROR_LEVEL.WARN
            ? "warn"
            : "log";

    console[consoleMethod](`[${level.toUpperCase()}] ${message}`, error, context);
  }

  /**
   * Notify user of error (if callback registered)
   * @param {string} title - Notification title
   * @param {string} detail - Error detail text
   * @param {string} deviceId - Optional device context
   * @param {string} level - Notification level ("bad", "warn", "ok")
   */
  notifyError(title, detail, deviceId = null, level = "bad") {
    if (typeof this.onNotify === "function") {
      this.onNotify(level, title, detail, deviceId);
    }
  }

  /**
   * Handle validation error with consistent reporting
   * @param {string} field - Field name that failed validation
   * @param {*} value - Value that failed
   * @param {string} reason - Why validation failed
   * @param {Object} context - Additional context
   */
  handleValidationError(field, value, reason, context = {}) {
    const message = `Validation failed for "${field}": ${reason}`;
    this.logError(message, new Error(reason), { field, value, ...context }, ERROR_LEVEL.WARN);
  }

  /**
   * Get error log (for debugging)
   * @param {number} limit - Max entries to return
   * @returns {Array}
   */
  getLog(limit = 100) {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error log
   */
  clearLog() {
    this.errorLog = [];
  }

  /**
   * Export error log as JSON
   * @returns {string}
   */
  exportLog() {
    return JSON.stringify(this.errorLog, null, 2);
  }
}

// Singleton instance
export const errorHandler = new ErrorHandlerService();

/**
 * Safe wrapper for synchronous operations
 * @param {string} label - Operation label for logging
 * @param {Function} fn - Function to execute
 * @param {*} fallbackValue - Value to return on error
 * @param {Object} context - Error context
 * @returns {*}
 */
export function safeExecute(label, fn, fallbackValue = null, context = {}) {
  try {
    return fn();
  } catch (err) {
    errorHandler.logError(`Safe execution failed: ${label}`, err, context);
    return fallbackValue;
  }
}

/**
 * Safe wrapper for async operations
 * @param {string} label - Operation label for logging
 * @param {Function} fn - Async function to execute
 * @param {*} fallbackValue - Value to return on error
 * @param {Object} context - Error context
 * @returns {Promise}
 */
export async function safeExecuteAsync(label, fn, fallbackValue = null, context = {}) {
  try {
    return await fn();
  } catch (err) {
    errorHandler.logError(`Async execution failed: ${label}`, err, context);
    return fallbackValue;
  }
}
