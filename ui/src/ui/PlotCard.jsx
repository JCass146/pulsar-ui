import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";

function PlotCard({ seriesRef, seriesKey }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 250); // ~4 fps
    return () => clearInterval(id);
  }, []);

  const data = useMemo(() => {
    const arr = seriesRef.current.get(seriesKey) || [];
    return arr.map((p) => ({ t: p.t, v: p.v }));
  }, [tick, seriesKey, seriesRef]);

  return (
    <div className="plotCard">
      <div className="plotTitle mono">{seriesKey}</div>
      <div className="plotInner">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <XAxis
              dataKey="t"
              type="number"
              domain={["auto", "auto"]}
              tickFormatter={(ms) => new Date(ms).toLocaleTimeString()}
            />
            <YAxis />
            <Tooltip labelFormatter={(ms) => new Date(ms).toLocaleTimeString()} />
            <Legend />
            <Line dataKey="v" dot={false} isAnimationActive={false} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default React.memo(PlotCard);
