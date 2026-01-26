import React from "react";

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

export default function MetricCard({
  label,
  value,
  unit,
  stale = false,
  offline = false,
  onPin,
  pinned = false,
  children
}) {
  return (
    <div className={`metricCard ${offline ? "offline" : stale ? "stale" : "ok"}`}>
      <div className="metricTop">
        <div className="metricLabel mono" title={label}>
          {label}
        </div>
        <button className={pinned ? "pinBtn pinned" : "pinBtn"} onClick={onPin} type="button" title="Pin/unpin metric">
          {pinned ? "★" : "☆"}
        </button>
      </div>

      <div className="metricValueRow">
        <div className="metricValue mono">
          {fmt(value)} {unit ? <span className="metricUnit">{unit}</span> : null}
        </div>
      </div>

      <div className="metricSpark">{children}</div>
    </div>
  );
}
