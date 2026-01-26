import React from "react";
import PlotCard from "./PlotCard.jsx";

export default function DashboardView({
  // selection + plot config
  selectedDevice,
  setSelectedDevice,
  plotDevices,
  availableFields,
  selectedFields,
  setSelectedFields,
  maxPoints,
  setMaxPoints,

  // data stores
  devicesRef,
  latestRef,
  seriesRef,

  // helpers
  getDeviceRole
}) {
  const dev = selectedDevice ? devicesRef.current.get(selectedDevice) : null;
  const latest = selectedDevice ? latestRef.current.get(selectedDevice) : null;

  const health = {
    role: dev ? getDeviceRole(dev) : "—",
    online: dev?.online,
    stale: dev?.stale,
    lastSeen: dev?.lastSeenMs ? new Date(dev.lastSeenMs).toLocaleTimeString() : "—",
    pending: dev?.pendingCommands?.size || 0,

    time_ok: latest?.time_ok,
    rssi_dbm: latest?.rssi_dbm ?? latest?.fields?.rssi_dbm,
    heap_free: latest?.heap_free ?? latest?.fields?.heap_free,
    uptime_ms: latest?.uptime_ms ?? latest?.ts_uptime_ms ?? latest?.fields?.uptime_ms,
    seq: latest?.seq,
    ts_unix_ms: latest?.ts_unix_ms ?? latest?.t_ms
  };

  return (
    <div className="dash">
      <div className="dashTop">
        <section className="card">
          <h2>Dashboard</h2>

          <div className="form">
            <label>
              Device
              <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}>
                {plotDevices.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Fields to plot (multi-select)
              <select
                multiple
                value={selectedFields}
                onChange={(e) => {
                  const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setSelectedFields(vals.length ? vals : []);
                }}
                size={Math.min(10, Math.max(5, availableFields.length))}
              >
                {availableFields.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <div className="hint">Hold Ctrl (Windows) / Cmd (Mac) to select multiple.</div>
            </label>

            <label>
              Max points per series
              <input
                type="number"
                min="200"
                max="20000"
                step="100"
                value={maxPoints}
                onChange={(e) => setMaxPoints(Number(e.target.value || 1500))}
              />
              <div className="hint">This caps memory + controls history length.</div>
            </label>
          </div>
        </section>

        <section className="card">
          <h2>Device status</h2>

          <div className="healthGrid">
            <div className="healthItem">
              <div className="muted">role</div>
              <div className="mono">{health.role}</div>
            </div>
            <div className="healthItem">
              <div className="muted">online</div>
              <div className="mono">
                {health.online === undefined ? "—" : health.online ? "true" : "false"}
              </div>
            </div>
            <div className="healthItem">
              <div className="muted">stale</div>
              <div className="mono">
                {health.stale === undefined ? "—" : health.stale ? "true" : "false"}
              </div>
            </div>
            <div className="healthItem">
              <div className="muted">last_seen</div>
              <div className="mono">{health.lastSeen}</div>
            </div>
            <div className="healthItem">
              <div className="muted">pending_cmds</div>
              <div className="mono">{health.pending}</div>
            </div>

            <div className="healthItem">
              <div className="muted">rssi_dbm</div>
              <div className="mono">{health.rssi_dbm ?? "—"}</div>
            </div>
            <div className="healthItem">
              <div className="muted">heap_free</div>
              <div className="mono">{health.heap_free ?? "—"}</div>
            </div>
            <div className="healthItem">
              <div className="muted">uptime_ms</div>
              <div className="mono">{health.uptime_ms ?? "—"}</div>
            </div>
            <div className="healthItem">
              <div className="muted">seq</div>
              <div className="mono">{health.seq ?? "—"}</div>
            </div>
            <div className="healthItem">
              <div className="muted">ts_unix_ms</div>
              <div className="mono">{health.ts_unix_ms ?? "—"}</div>
            </div>
            <div className="healthItem">
              <div className="muted">time_ok</div>
              <div className="mono">{health.time_ok === undefined ? "—" : String(health.time_ok)}</div>
            </div>
          </div>

          <div className="hint" style={{ marginTop: 10 }}>
            Best practice: publish retained <span className="mono">pulsar/&lt;device&gt;/status</span> with LWT.
            Stale is derived from last seen activity.
          </div>
        </section>
      </div>

      <div className="plotsGrid">
        {selectedDevice && selectedFields.length ? (
          selectedFields.map((field) => {
            const seriesKey = `${selectedDevice}:${field}`;
            return <PlotCard key={seriesKey} seriesRef={seriesRef} seriesKey={seriesKey} />;
          })
        ) : (
          <div className="card">
            <div className="emptyTitle">No plot selection</div>
            <div className="muted">Select a device and one or more fields to plot.</div>
          </div>
        )}
      </div>
    </div>
  );
}
