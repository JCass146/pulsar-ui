import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";
import { fmt, inferUnit } from "./MetricCard.jsx";
import DeviceChip from "./DeviceChip.jsx";
import { getFriendlyFieldLabel } from "../utils/health.js";

function splitSeriesKey(seriesKey) {
  const s = String(seriesKey || "");
  const i = s.indexOf(":");
  if (i < 0) return { device: s, field: "" };
  return { device: s.slice(0, i), field: s.slice(i + 1) };
}

function fmtRelSec(x) {
  if (!Number.isFinite(x)) return "";
  // x is negative seconds; show like -45s, -2m, etc.
  const s = Math.round(x);
  const a = Math.abs(s);
  if (a < 90) return `${s}s`;
  const m = Math.round(s / 60);
  return `${m}m`;
}

function PlotCard({
  seriesRef,
  seriesKey,
  height = 220,
  windowSec = 60,          // <- default window (seconds)
  showXAxis = true,
  devicesRef = null,       // NEW: ref to devices Map for DeviceChip
}) {
  const [tick, setTick] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 250); // ~4 fps
    return () => clearInterval(id);
  }, []);

  const { device, field } = useMemo(() => splitSeriesKey(seriesKey), [seriesKey]);
  const unit = useMemo(() => inferUnit(field), [field]);
  const friendlyLabel = useMemo(() => getFriendlyFieldLabel(field), [field]);

  const { data, lastV, nowMs } = useMemo(() => {
    const now = Date.now();
    const arr = seriesRef.current.get(seriesKey) || [];

    const cutoff = now - windowSec * 1000;

    // Filter to window and map to relative seconds (negative -> now)
    const mapped = [];
    for (let i = Math.max(0, arr.length - 5000); i < arr.length; i++) {
      const p = arr[i];
      if (!p) continue;
      if (p.t < cutoff) continue;
      mapped.push({
        x: (p.t - now) / 1000, // negative seconds
        v: p.v
      });
    }

    const lv = arr.length ? arr[arr.length - 1].v : null;
    return { data: mapped, lastV: lv, nowMs: now };
  }, [tick, seriesKey, seriesRef, windowSec]);

  return (
    <div
      className="plotCard"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="plotHdr">
        <div className="plotHdrLeft">
          {/* DeviceChip in header - MANDATORY for device source visibility */}
          <div className="plotDeviceChip">
            <DeviceChip
              deviceId={device}
              devicesRef={devicesRef}
              size="small"
              compact
            />
          </div>
          <div className="plotTitle" title={`${friendlyLabel} (${field})`}>
            <span className="metricLabel__friendly">{friendlyLabel}</span>
            {friendlyLabel !== field && (
              <span className="metricLabel__technical mono">{field}</span>
            )}
          </div>
          <div className="plotValue mono">
            {fmt(lastV)}
            {unit ? <span className="plotUnit">{unit}</span> : null}
          </div>
        </div>

        <button
          className={`plotGear ${hovered ? "show" : ""}`}
          type="button"
          title="Plot options (coming soon)"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // stub for now
          }}
        >
          ⚙
        </button>
      </div>

      <div className="plotInner" style={{ height, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="x"
              type="number"
              domain={[-windowSec, 0]}
              tickFormatter={fmtRelSec}
              hide={!showXAxis}
            />
            <YAxis width={46} />
            <Tooltip
              labelFormatter={(x) => `t ${fmtRelSec(x)} (now)`}
              formatter={(v) => [v, friendlyLabel]}
            />
            <Line dataKey="v" dot={false} isAnimationActive={false} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default React.memo(PlotCard);
