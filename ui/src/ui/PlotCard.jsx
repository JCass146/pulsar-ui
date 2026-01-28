import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";
import { Card, CardHeader, CardTitle, CardMeta, CardBody } from "../components/Card.jsx";
import { Pill } from "../components/Pill.jsx";
import { fmt, inferUnit } from "./MetricCard.jsx";
import DeviceChip from "./DeviceChip.jsx";
import ChartSettingsModal from "./ChartSettingsModal.jsx";
import { getFriendlyFieldLabel } from "../utils/health.js";
import "./PlotCard.css";

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

// Custom tooltip for better visual integration
function CustomChartTooltip({ active, payload, label, friendlyLabel }) {
  if (!active || !payload || !payload.length) return null;
  
  const value = payload[0].value;
  return (
    <div style={{
      backgroundColor: 'var(--surface-default)',
      border: '1px solid var(--border-divider)',
      borderRadius: 'var(--radius-md)',
      padding: '8px 12px',
      boxShadow: 'var(--shadow-sm)',
      fontSize: '13px',
      color: 'var(--text)',
    }}>
      <div style={{ marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '12px' }}>
        {typeof label === 'number' ? `t ${fmtRelSec(label)}` : label}
      </div>
      <div style={{ fontWeight: 600 }}>
        {fmt(value)} {friendlyLabel}
      </div>
    </div>
  );
}

function PlotCard({
  seriesRef,
  seriesKey,
  height = 220, // Fixed chart height
  windowSec = 60,          // <- default window (seconds)
  showXAxis = true,
  devicesRef = null,       // NEW: ref to devices Map for DeviceChip
}) {
  const [tick, setTick] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentWindow, setCurrentWindow] = useState(windowSec);
  const [yAxisAuto, setYAxisAuto] = useState(true);
  const [chartPaused, setChartPaused] = useState(false);

  useEffect(() => {
    if (chartPaused) return; // Don't update when paused
    const id = setInterval(() => setTick((x) => x + 1), 250); // ~4 fps
    return () => clearInterval(id);
  }, [chartPaused]);

  const { device, field } = useMemo(() => splitSeriesKey(seriesKey), [seriesKey]);
  const unit = useMemo(() => inferUnit(field), [field]);
  const friendlyLabel = useMemo(() => getFriendlyFieldLabel(field), [field]);

  const { data, lastV, nowMs } = useMemo(() => {
    const now = Date.now();
    const arr = seriesRef.current.get(seriesKey) || [];

    const cutoff = now - currentWindow * 1000;

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
  }, [tick, seriesKey, seriesRef, currentWindow]);

  return (
    <Card interactive>
      <CardHeader divider>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 'var(--space-sm)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <CardTitle size="sm" title={`${friendlyLabel} (${field})`}>
              {friendlyLabel}
            </CardTitle>
            <CardMeta>
              {friendlyLabel !== field && (
                <span className="mono" style={{ fontSize: 'var(--font-2xs)' }}>
                  {field}
                </span>
              )}
            </CardMeta>
          </div>
          <button
            className="plot-card__settings-btn"
            type="button"
            title="Plot options"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSettingsOpen(true);
            }}
          >
            ⚙
          </button>
        </div>
      </CardHeader>

      <ChartSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        windowSec={currentWindow}
        onWindowChange={setCurrentWindow}
        yAxisAuto={yAxisAuto}
        onYAxisAutoChange={setYAxisAuto}
        isPaused={chartPaused}
        onPausedChange={setChartPaused}
      />

      <CardBody style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Current value display */}
        <div className="plot-card__value-display">
          <div className="plot-card__value">
            {fmt(lastV)}
          </div>
          {unit && (
            <div className="plot-card__unit">
              {unit}
            </div>
          )}
          <div className="plot-card__status-badges">
            {device && devicesRef?.current?.get?.(device)?.online && (
              <Pill variant="success" size="sm">Active</Pill>
            )}
            {device && (
              <DeviceChip
                deviceId={device}
                devicesRef={devicesRef}
                size="small"
                compact
              />
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="plot-card__chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: -30, bottom: 20 }}>
              <XAxis
                dataKey="x"
                type="number"
                domain={[-currentWindow, 0]}
                tickFormatter={fmtRelSec}
                hide={!showXAxis}
                stroke="var(--text-secondary)"
                opacity={0.5}
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
              />
              <YAxis 
                width={40}
                stroke="var(--text-secondary)"
                opacity={0.5}
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
              />
              <Tooltip
                content={<CustomChartTooltip friendlyLabel={friendlyLabel} />}
                cursor={{ stroke: 'var(--text-secondary)', opacity: 0.3 }}
              />
              <Line 
                dataKey="v" 
                dot={false} 
                isAnimationActive={false} 
                type="monotone"
                stroke="var(--primary-line, #3b82f6)"
                strokeWidth={2}
                strokeOpacity={0.9}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}

export default React.memo(PlotCard);
