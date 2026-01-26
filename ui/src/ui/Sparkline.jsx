import React, { useMemo } from "react";

export default function Sparkline({ points, width = 120, height = 28 }) {
  const d = useMemo(() => {
    if (!points || points.length < 2) return "";
    const xs = points.map((p) => p.t);
    const ys = points.map((p) => p.v);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const dx = maxX - minX || 1;
    const dy = maxY - minY || 1;

    const pad = 2;
    const w = width - pad * 2;
    const h = height - pad * 2;

    const mapX = (x) => pad + ((x - minX) / dx) * w;
    const mapY = (y) => pad + h - ((y - minY) / dy) * h;

    let path = `M ${mapX(points[0].t).toFixed(2)} ${mapY(points[0].v).toFixed(2)}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${mapX(points[i].t).toFixed(2)} ${mapY(points[i].v).toFixed(2)}`;
    }
    return path;
  }, [points, width, height]);

  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
