import React, { useEffect, useMemo, useState } from "react";
import MetricCard, { inferUnit } from "./MetricCard.jsx";
import Sparkline from "./Sparkline.jsx";

function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function extractNumericFields(obj) {
  if (!obj || typeof obj !== "object") return [];
  const out = [];

  if (isFiniteNumber(obj.value)) out.push(["value", obj.value]);

  const fieldsObj = obj.fields && typeof obj.fields === "object" ? obj.fields : null;
  if (fieldsObj) {
    for (const [k, v] of Object.entries(fieldsObj)) {
      if (isFiniteNumber(v)) out.push([k, v]);
    }
  }

  const ignore = new Set(["t_ms", "ts_unix_ms", "ts", "seq", "uptime_ms", "ts_uptime_ms", "v"]);
  for (const [k, v] of Object.entries(obj)) {
    if (ignore.has(k) || k === "fields") continue;
    if (isFiniteNumber(v)) out.push([k, v]);
  }

  const seen = new Set();
  return out.filter(([k]) => {
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function pinKey(deviceId) {
  return `pulsarui:pinnedFields:${deviceId || "unknown"}`;
}

function loadPins(deviceId) {
  try {
    const raw = localStorage.getItem(pinKey(deviceId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

function savePins(deviceId, pins) {
  try {
    localStorage.setItem(pinKey(deviceId), JSON.stringify(pins));
  } catch {
    /* noop */
  }
}

export default function LiveMetrics({ deviceId, devicesRef, latestRef, seriesRef }) {
  const [tick, setTick] = useState(0);
  const [pins, setPins] = useState(() => loadPins(deviceId));

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 400); // ~2.5 fps cards update
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setPins(loadPins(deviceId));
  }, [deviceId]);

  const dev = deviceId ? devicesRef.current.get(deviceId) : null;
  const latest = deviceId ? latestRef.current.get(deviceId) : null;

  const numeric = useMemo(() => {
    if (!latest) return [];
    return extractNumericFields(latest); // [key, value]
  }, [latest, tick, deviceId]);

  const orderedKeys = useMemo(() => {
    const allKeys = numeric.map(([k]) => k);
    const pinnedFirst = pins.filter((k) => allKeys.includes(k));
    const rest = allKeys.filter((k) => !pinnedFirst.includes(k));
    // show pinned + first ~10 of the rest
    return [...pinnedFirst, ...rest].slice(0, 14);
  }, [numeric, pins]);

  function togglePin(field) {
    const f = String(field);
    setPins((prev) => {
      const next = prev.includes(f) ? prev.filter((x) => x !== f) : [f, ...prev].slice(0, 24);
      savePins(deviceId, next);
      return next;
    });
  }

  function sparkPoints(field) {
    const key = `${deviceId}:${field}`;
    const arr = seriesRef.current.get(key) || [];
    // take last N points, decimate if needed
    const tail = arr.slice(Math.max(0, arr.length - 80));
    return tail;
  }

  const stale = !!dev?.stale;
  const offline = dev ? !dev.online : false;

  return (
    <div className="liveMetrics">
      <div className="panelHeaderRow">
        <div className="panelTitle">Live Metrics</div>
        <div className="muted mono" style={{ fontSize: 12 }}>
          {deviceId || "—"}
        </div>
      </div>

      {!latest ? (
        <div className="muted" style={{ padding: 10 }}>
          No telemetry yet.
        </div>
      ) : (
        <div className="metricStack">
          {orderedKeys.map((k) => {
            const pair = numeric.find(([kk]) => kk === k);
            const v = pair ? pair[1] : null;
            const unit = inferUnit(k);

            return (
              <MetricCard
                key={k}
                label={k}
                value={v}
                unit={unit}
                stale={stale}
                offline={offline}
                pinned={pins.includes(k)}
                onPin={() => togglePin(k)}
              >
                <div className="sparkWrap">
                  <Sparkline points={sparkPoints(k)} />
                </div>
              </MetricCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
