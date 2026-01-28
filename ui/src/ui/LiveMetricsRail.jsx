/**
 * LiveMetricsRail.jsx
 *
 * Right-rail component for pinned metric tiles with micro-sparklines
 * and freshness/stale indicators.
 *
 * Part of Milestone 1.1 - Right-rail Live Metrics Stack
 */
import React, { useMemo, useState, useCallback } from "react";
import Sparkline from "./Sparkline.jsx";
import { inferUnit, fmt } from "./MetricCard.jsx";
import {
  APP_CONFIG,
  getThresholdForField,
  evaluateThreshold,
} from "../config-constants.js";
import {
  loadPinnedMetrics,
  savePinnedMetrics,
} from "../utils/persistence.js";

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
 * Format time since last update.
 */
function formatAge(lastUpdateMs) {
  if (!lastUpdateMs) return "—";
  const age = Date.now() - lastUpdateMs;
  if (age < 1000) return "now";
  if (age < 60000) return `${Math.floor(age / 1000)}s`;
  if (age < 3600000) return `${Math.floor(age / 60000)}m`;
  return `${Math.floor(age / 3600000)}h`;
}

/**
 * Single pinned metric tile with sparkline.
 */
function PinnedMetricTile({
  deviceId,
  field,
  value,
  lastUpdateMs,
  seriesData,
  onUnpin,
  thresholdOverrides,
  tick, // NEW: for real-time sparkline updates
}) {
  const unit = inferUnit(field);
  const freshness = getFreshnessStatus(lastUpdateMs);
  const ageText = formatAge(lastUpdateMs);

  // Get threshold config (check overrides first, then defaults)
  const threshold = thresholdOverrides[field] || getThresholdForField(field);
  const thresholdStatus = evaluateThreshold(value, threshold);

  // Combine freshness and threshold for visual status
  const visualStatus = freshness === "stale" ? "stale" :
    thresholdStatus === "critical" ? "critical" :
    thresholdStatus === "warn" ? "warn" : "ok";

  // Get last N points for sparkline - includes tick to force updates every 250ms
  const sparkPoints = useMemo(() => {
    if (!seriesData || !Array.isArray(seriesData)) return [];
    return seriesData.slice(-60); // Last 60 points for compact view
  }, [seriesData, tick]); // tick forces recalculation every 250ms for live updates

  return (
    <div className={`pinnedMetric ${visualStatus}`}>
      <div className="pinnedMetricTop">
        <div className="pinnedMetricInfo">
          <span className="pinnedMetricDevice mono">{deviceId}</span>
          <span className="pinnedMetricField mono">{field}</span>
        </div>
        <button
          className="unpinBtn"
          onClick={() => onUnpin(deviceId, field)}
          title="Unpin metric"
          type="button"
        >
          ✕
        </button>
      </div>

      <div className="pinnedMetricValue">
        <span className="pinnedMetricNum mono">{fmt(value)}</span>
        {unit && <span className="pinnedMetricUnit">{unit}</span>}
      </div>

      <div className="pinnedMetricMeta">
        <span className={`freshnessIndicator ${freshness}`} title={`Last update: ${ageText} ago`}>
          <span className="freshnessIcon">{freshness === "fresh" ? "●" : freshness === "aging" ? "◐" : "○"}</span>
          <span className="freshnessAge">{ageText}</span>
        </span>

        {thresholdStatus !== "ok" && (
          <span className={`thresholdBadge ${thresholdStatus}`}>
            {thresholdStatus === "critical" ? "CRIT" : "WARN"}
          </span>
        )}
      </div>

      {sparkPoints.length >= 2 && (
        <div className="pinnedMetricSpark">
          <Sparkline points={sparkPoints} width={140} height={24} />
        </div>
      )}
    </div>
  );
}


/**
 * LiveMetricsRail - Main component
 */
export default function LiveMetricsRail({
  devicesRef,
  latestRef,
  seriesRef,
  deviceList,
  selectedDevice,
  pushNotif,
}) {
  // Load pinned metrics from localStorage
  const [pinnedMetrics, setPinnedMetrics] = useState(() => loadPinnedMetrics());
  const [thresholdOverrides] = useState(() => ({})); // TODO: load from persistence
  const [collapsed, setCollapsed] = useState(false);
  const [tick, setTick] = useState(0);

  // Force re-render every 250ms to update live series data
  React.useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 250);
    return () => clearInterval(id);
  }, []);

  // Save pinned metrics when they change
  const savePinned = useCallback((newPinned) => {
    setPinnedMetrics(newPinned);
    const saved = savePinnedMetrics(newPinned, (err) => {
      if (pushNotif) {
        pushNotif("warn", "Storage", "Could not save pinned metrics");
      }
    });
    return saved;
  }, [pushNotif]);

  // Add a pinned metric
  const pinMetric = useCallback((deviceId, field) => {
    const existing = pinnedMetrics.find(
      (p) => p.deviceId === deviceId && p.field === field
    );
    if (existing) return; // Already pinned

    const newPinned = [
      ...pinnedMetrics,
      { deviceId, field, pinOrder: Date.now() },
    ];
    savePinned(newPinned);
  }, [pinnedMetrics, savePinned]);

  // Remove a pinned metric
  const unpinMetric = useCallback((deviceId, field) => {
    const newPinned = pinnedMetrics.filter(
      (p) => !(p.deviceId === deviceId && p.field === field)
    );
    savePinned(newPinned);
  }, [pinnedMetrics, savePinned]);

  // Build enriched pinned metrics with current values
  const enrichedPinned = useMemo(() => {
    return pinnedMetrics.map((pin) => {
      const latest = latestRef.current.get(pin.deviceId);
      const seriesKey = `${pin.deviceId}:${pin.field}`;
      const seriesData = seriesRef.current.get(seriesKey);

      // Extract value from latest telemetry
      let value = null;
      let lastUpdateMs = null;

      if (latest) {
        const fields = latest.fields || latest;
        value = fields[pin.field];
        lastUpdateMs = latest.t_ms || latest.timestamp || Date.now();
      }

      return {
        ...pin,
        value,
        lastUpdateMs,
        seriesData,
      };
    }).sort((a, b) => a.pinOrder - b.pinOrder);
  }, [pinnedMetrics, latestRef, seriesRef, tick]);

  // Get available fields from selected device for quick-pin
  const availableFields = useMemo(() => {
    if (!selectedDevice) return [];
    const latest = latestRef.current.get(selectedDevice);
    if (!latest) return [];

    const fields = latest.fields || latest;
    return Object.keys(fields)
      .filter((k) => typeof fields[k] === "number")
      .slice(0, 20);
  }, [selectedDevice, latestRef]);

  // Count metrics by status
  const statusCounts = useMemo(() => {
    const counts = { ok: 0, warn: 0, critical: 0, stale: 0 };
    for (const pin of enrichedPinned) {
      const freshness = getFreshnessStatus(pin.lastUpdateMs);
      if (freshness === "stale") {
        counts.stale++;
      } else {
        const threshold = thresholdOverrides[pin.field] || getThresholdForField(pin.field);
        const status = evaluateThreshold(pin.value, threshold);
        counts[status]++;
      }
    }
    return counts;
  }, [enrichedPinned, thresholdOverrides]);

  return (
    <aside className={`liveMetricsRail ${collapsed ? "collapsed" : ""}`}>
      <div className="railHeader">
        <button
          className="railCollapseBtn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand" : "Collapse"}
          type="button"
        >
          {collapsed ? "◀" : "▶"}
        </button>

        {!collapsed && (
          <>
            <h2 className="railTitle">Live Metrics</h2>
            <div className="railStatusSummary">
              {statusCounts.critical > 0 && (
                <span className="statusCount critical">{statusCounts.critical}</span>
              )}
              {statusCounts.warn > 0 && (
                <span className="statusCount warn">{statusCounts.warn}</span>
              )}
              {statusCounts.stale > 0 && (
                <span className="statusCount stale">{statusCounts.stale}</span>
              )}
              <span className="statusCount ok">{statusCounts.ok}</span>
            </div>
          </>
        )}
      </div>

      {!collapsed && (
        <>
          {/* Quick-pin from selected device */}
          {selectedDevice && availableFields.length > 0 && (
            <div className="quickPinSection">
              <div className="quickPinLabel">Quick pin from {selectedDevice}:</div>
              <div className="quickPinChips">
                {availableFields.slice(0, 8).map((field) => {
                  const isPinned = pinnedMetrics.some(
                    (p) => p.deviceId === selectedDevice && p.field === field
                  );
                  return (
                    <button
                      key={field}
                      className={`quickPinChip ${isPinned ? "pinned" : ""}`}
                      onClick={() =>
                        isPinned
                          ? unpinMetric(selectedDevice, field)
                          : pinMetric(selectedDevice, field)
                      }
                      type="button"
                    >
                      {isPinned ? "★" : "☆"} {field}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pinned metrics stack */}
          <div className="pinnedMetricsStack">
            {enrichedPinned.length === 0 ? (
              <div className="emptyPinned">
                <div className="emptyPinnedText">No pinned metrics</div>
                <div className="muted">
                  Click ☆ on metrics or use quick-pin above to add.
                </div>
              </div>
            ) : (
              enrichedPinned.map((pin) => (
                <PinnedMetricTile
                  key={`${pin.deviceId}:${pin.field}`}
                  deviceId={pin.deviceId}
                  field={pin.field}
                  value={pin.value}
                  lastUpdateMs={pin.lastUpdateMs}
                  seriesData={pin.seriesData}
                  onUnpin={unpinMetric}
                  tick={tick}
                  thresholdOverrides={thresholdOverrides}
                />
              ))
            )}
          </div>

          {/* Clear all button */}
          {enrichedPinned.length > 0 && (
            <button
              className="clearPinnedBtn"
              onClick={() => savePinned([])}
              type="button"
            >
              Clear all pinned
            </button>
          )}
        </>
      )}
    </aside>
  );
}

// Export for use in other components
export { PinnedMetricTile };
