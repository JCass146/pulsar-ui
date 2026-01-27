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

function splitSeriesKey(seriesKey) {
  const s = String(seriesKey || "");
  const i = s.indexOf(":");
  if (i < 0) return { device: s, field: "" };
  return { device: s.slice(0, i), field: s.slice(i + 1) };
}

function PlotCard({ seriesRef, seriesKey, height = 220 }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 250); // ~4 fps
    return () => clearInterval(id);
  }, []);

  const { device, field } = useMemo(() => splitSeriesKey(seriesKey), [seriesKey]);
  const unit = useMemo(() => inferUnit(field), [field]);

  const { data, lastV } = useMemo(() => {
    const arr = seriesRef.current.get(seriesKey) || [];
    const mapped = arr.map((p) => ({ t: p.t, v: p.v }));
    const lv = arr.length ? arr[arr.length - 1].v : null;
    return { data: mapped, lastV: lv };
  }, [tick, seriesKey, seriesRef]);

  return (
    <div className="plotCard">
      <div className="plotHdr">
        <div className="plotHdrLeft">
          <div className="plotTitle mono" title={seriesKey}>
            {device}
            <span className="muted"> • </span>
            {field}
          </div>
          <div className="plotValue mono">
            {fmt(lastV)}{unit ? <span className="plotUnit">{unit}</span> : null}
          </div>
        </div>
      </div>

      <div className="plotInner" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="t"
              type="number"
              domain={["auto", "auto"]}
              tickFormatter={(ms) => new Date(ms).toLocaleTimeString()}
              hide
            />
            <YAxis width={46} />
            <Tooltip
              labelFormatter={(ms) => new Date(ms).toLocaleTimeString()}
              formatter={(v) => [v, field]}
            />
            <Line dataKey="v" dot={false} isAnimationActive={false} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default React.memo(PlotCard);
