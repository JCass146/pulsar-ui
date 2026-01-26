import React, { useMemo, useState } from "react";

function formatAgo(ms) {
  if (!ms) return "—";
  const d = Date.now() - ms;
  if (d < 0) return "—";
  if (d < 1000) return `${d}ms ago`;
  const s = d / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s ago`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(m < 10 ? 1 : 0)}m ago`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(h < 10 ? 1 : 0)}h ago`;
  const days = h / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)}d ago`;
}

function statusClass(d) {
  if (!d.online) return "offline";
  if (d.stale) return "stale";
  return "online";
}

export default function DeviceList({
  devices,
  selectedDevice,
  onSelect,
  title = "Devices",
  compact = false,
  showSearch = true
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return devices;
    return devices.filter((d) => {
      const hay = `${d.id} ${d.role}`.toLowerCase();
      return hay.includes(query);
    });
  }, [devices, q]);

  return (
    <div className="devicePanel">
      <div className="devicePanelTop">
        <div>
          <div className="devicePanelTitle">{title}</div>
          <div className="devicePanelSub muted">
            {filtered.length} shown • {devices.length} total
          </div>
        </div>

        {showSearch ? (
          <input
            className="deviceSearch"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search device or role…"
            spellCheck={false}
          />
        ) : null}
      </div>

      <div className={compact ? "deviceList compact" : "deviceList"}>
        {filtered.map((d) => {
          const s = statusClass(d);
          const active = d.id === selectedDevice;
          return (
            <button
              key={d.id}
              className={active ? "deviceRow active" : "deviceRow"}
              onClick={() => onSelect?.(d.id)}
              title={`${d.role} • ${s} • pending=${d.pending}`}
              type="button"
            >
              <span className={`dot ${s}`} />
              <span className="deviceMain">
                <span className="mono deviceId">{d.id}</span>
                <span className="muted deviceRole">{d.role}</span>
              </span>

              <span className="deviceRight">
                {d.pending ? <span className="pillTag">{d.pending} pending</span> : null}
                <span className="muted mono deviceSeen">{formatAgo(d.lastSeenMs)}</span>
              </span>
            </button>
          );
        })}

        {filtered.length === 0 ? (
          <div className="muted" style={{ padding: 10 }}>
            No devices match “{q}”.
          </div>
        ) : null}
      </div>
    </div>
  );
}
