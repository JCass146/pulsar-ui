/**
 * RetainedSnapshotBar.jsx
 *
 * Compact display of last retained state values for pinned metrics.
 * Shows snapshot of retained state above the charts wall.
 *
 * Part of Bug Fix #4 - Add Retained State Strip above charts
 */
import React, { useMemo } from "react";
import DeviceChip from "./DeviceChip.jsx";
import { fmt, inferUnit } from "./MetricCard.jsx";
import { getFriendlyFieldLabel } from "../utils/health.js";

export default function RetainedSnapshotBar({
  pinnedMetrics,
  devicesRef,
  latestRef,
}) {
  // Get retained values for pinned metrics
  const retainedSnapshots = useMemo(() => {
    if (!pinnedMetrics || pinnedMetrics.length === 0) return [];

    return pinnedMetrics
      .map((pin) => {
        const latest = latestRef?.current?.get(pin.deviceId);
        if (!latest) return null;

        // Get value from latest telemetry
        const fields = latest.fields || latest;
        const value = fields?.[pin.field];
        const lastUpdateMs = latest.t_ms || latest.timestamp || Date.now();
        const age = Date.now() - lastUpdateMs;
        const isStale = age > 60000; // Stale if >1 minute old

        return {
          deviceId: pin.deviceId,
          field: pin.field,
          value,
          lastUpdateMs,
          isStale,
        };
      })
      .filter(Boolean);
  }, [pinnedMetrics, latestRef]);

  if (retainedSnapshots.length === 0) {
    return null;
  }

  return (
    <div className="retainedSnapshotBar">
      <div className="retainedSnapshotLabel">Last Retained State</div>
      <div className="retainedSnapshotTiles">
        {retainedSnapshots.map(({ deviceId, field, value, isStale }) => {
          const unit = inferUnit(field);
          const friendlyLabel = getFriendlyFieldLabel(field);

          return (
            <div
              key={`${deviceId}:${field}`}
              className={`retainedSnapshot ${isStale ? "stale" : "fresh"}`}
            >
              <div className="retainedSnapshot__device">
                <DeviceChip
                  deviceId={deviceId}
                  devicesRef={devicesRef}
                  size="small"
                  compact
                />
              </div>
              <div className="retainedSnapshot__content">
                <div className="retainedSnapshot__field mono">{friendlyLabel}</div>
                <div className="retainedSnapshot__value mono">
                  {fmt(value)}
                  {unit && <span className="retainedSnapshot__unit">{unit}</span>}
                </div>
              </div>
              {isStale && (
                <div className="retainedSnapshot__badge stale">stale</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
