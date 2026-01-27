import React from "react";
import {
  getThresholdForField,
  evaluateThreshold,
  APP_CONFIG,
} from "../config-constants.js";

export function inferUnit(field) {
  const f = String(field || "").toLowerCase();
  if (f.endsWith("_psi")) return "psi";
  if (f.endsWith("_bar")) return "bar";
  if (f.endsWith("_kpa")) return "kPa";
  if (f.endsWith("_pa")) return "Pa";
  if (f.endsWith("_c") || f.includes("temp")) return "°C";
  if (f.endsWith("_f")) return "°F";
  if (f.endsWith("_g")) return "g";
  if (f.endsWith("_kg")) return "kg";
  if (f.endsWith("_lbs") || f.endsWith("_lb")) return "lb";
  if (f.endsWith("_ms")) return "ms";
  if (f.endsWith("_s")) return "s";
  if (f.endsWith("_pct") || f.endsWith("_percent")) return "%";
  if (f.endsWith("_v")) return "V";
  if (f.endsWith("_a")) return "A";
  if (f.endsWith("_lpm")) return "L/min";
  if (f.endsWith("_gpm")) return "gal/min";
  return "";
}

export function fmt(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v !== "number" || !Number.isFinite(v)) return String(v);
  const av = Math.abs(v);
  if (av >= 1000) return v.toFixed(0);
  if (av >= 100) return v.toFixed(1);
  if (av >= 10) return v.toFixed(2);
  return v.toFixed(3);
}

/**
 * Compute freshness status for a metric based on last update time.
 */
function getFreshnessStatus(lastUpdateMs) {
  if (!lastUpdateMs) return "unknown";
  const age = Date.now() - lastUpdateMs;
  if (age < APP_CONFIG.METRIC_FRESH_MS) return "fresh";
  if (age < APP_CONFIG.METRIC_STALE_MS) return "aging";
  return "stale";
}

/**
 * Format threshold range for tooltip.
 */
function formatThresholdTooltip(threshold) {
  if (!threshold) return "";
  const parts = [];
  if (threshold.critMin !== null) parts.push(`crit <${threshold.critMin}`);
  if (threshold.warnMin !== null) parts.push(`warn <${threshold.warnMin}`);
  if (threshold.warnMax !== null) parts.push(`warn >${threshold.warnMax}`);
  if (threshold.critMax !== null) parts.push(`crit >${threshold.critMax}`);
  return parts.join(" | ");
}

export default function MetricCard({
  label,
  value,
  unit,
  stale = false,
  offline = false,
  onPin,
  pinned = false,
  lastUpdateMs = null,
  thresholdOverride = null,
  showThresholdBadge = true,
  children
}) {
  // Get threshold config (override takes precedence)
  const threshold = thresholdOverride || getThresholdForField(label);
  const thresholdStatus = evaluateThreshold(value, threshold);

  // Compute freshness if lastUpdateMs provided
  const freshness = lastUpdateMs ? getFreshnessStatus(lastUpdateMs) : null;

  // Determine overall visual status (worst of offline > stale > critical > warn > ok)
  let visualStatus = "ok";
  if (offline) {
    visualStatus = "offline";
  } else if (stale || freshness === "stale") {
    visualStatus = "stale";
  } else if (thresholdStatus === "critical") {
    visualStatus = "critical";
  } else if (thresholdStatus === "warn") {
    visualStatus = "warn";
  }

  const thresholdTooltip = formatThresholdTooltip(threshold);

  return (
    <div
      className={`metricCard ${visualStatus}`}
      title={thresholdTooltip || undefined}
    >
      <div className="metricTop">
        <div className="metricLabel mono" title={label}>
          {label}
        </div>
        <div className="metricTopRight">
          {/* Threshold status badge */}
          {showThresholdBadge && thresholdStatus !== "ok" && (
            <span className={`thresholdBadge ${thresholdStatus}`}>
              {thresholdStatus === "critical" ? "CRIT" : "WARN"}
            </span>
          )}

          {/* Freshness indicator */}
          {freshness && freshness !== "fresh" && (
            <span className={`freshnessIndicator ${freshness}`} title={`Data ${freshness}`}>
              {freshness === "aging" ? "◐" : "○"}
            </span>
          )}

          {/* Pin button */}
          <button
            className={pinned ? "pinBtn pinned" : "pinBtn"}
            onClick={onPin}
            type="button"
            title="Pin/unpin metric"
          >
            {pinned ? "★" : "☆"}
          </button>
        </div>
      </div>

      <div className="metricValueRow">
        <div className={`metricValue mono ${thresholdStatus !== "ok" ? thresholdStatus : ""}`}>
          {fmt(value)} {unit ? <span className="metricUnit">{unit}</span> : null}
        </div>
      </div>

      <div className="metricSpark">{children}</div>
    </div>
  );
}
