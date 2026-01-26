import React from "react";
import PlotCard from "./PlotCard.jsx";
import DeviceList from "./DeviceList.jsx";
import LiveMetrics from "./LiveMetrics.jsx";

export default function DashboardView({
  // selection + plot config
  selectedDevice,
  setSelectedDevice,
  plotDevices,
  deviceList,
  availableFields,
  selectedFields,
  setSelectedFields,
  maxPoints,
  setMaxPoints,
  devicesRef,
  latestRef,
  seriesRef,
  getDeviceRole
}) {
  const dev = selectedDevice ? devicesRef.current.get(selectedDevice) : null;
  const latest = selectedDevice ? latestRef.current.get(selectedDevice) : null;

  const role = dev ? getDeviceRole(dev) : "—";
  const online = dev?.online;
  const stale = dev?.stale;
  const lastSeen = dev?.lastSeenMs ? new Date(dev.lastSeenMs).toLocaleTimeString() : "—";
  const pending = dev?.pendingCommands?.size || 0;

  const rssi = latest?.rssi_dbm ?? latest?.fields?.rssi_dbm;
  const uptime = latest?.uptime_ms ?? latest?.ts_uptime_ms ?? latest?.fields?.uptime_ms;
  const seq = latest?.seq;

  return (
    <div className="dashDense">
      {/* LEFT RAIL */}
      <aside className="dashLeft">
        <section className="card controls">
          <h2>Fleet</h2>
          <DeviceList
            title="Devices"
            devices={deviceList}
            selectedDevice={selectedDevice}
            onSelect={(id) => setSelectedDevice(id)}
            compact={false}
            groupByRole
          />
        </section>

        <section className="card controls" style={{ marginTop: 12 }}>
          <h2>Status</h2>
          <div className="statusStrip">
            <span className={`pillTag2 ${online ? (stale ? "warn" : "ok") : "bad"}`}>
              {online ? (stale ? "STALE" : "LIVE") : "OFFLINE"}
            </span>
            <span className="pillTag2">{role}</span>
            <span className="pillTag2 mono">{selectedDevice || "—"}</span>
            <span className="pillTag2">pending {pending}</span>
            <span className="pillTag2">last {lastSeen}</span>
            {rssi !== undefined ? <span className="pillTag2 mono">rssi {rssi}</span> : null}
            {uptime !== undefined ? <span className="pillTag2 mono">up {uptime}</span> : null}
            {seq !== undefined ? <span className="pillTag2 mono">seq {seq}</span> : null}
          </div>
        </section>
      </aside>

      {/* CENTER */}
      <section className="dashCenter">
        <section className="card controls">
          <div className="dashControlsRow">
            <div className="dashTitleBlock">
              <div className="dashTitle">Dashboard</div>
              <div className="muted" style={{ fontSize: 12 }}>
                Select fields, then watch trends. Pin metrics on the right rail.
              </div>
            </div>

            <div className="dashControls">
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
                Fields
                <select
                  multiple
                  value={selectedFields}
                  onChange={(e) => {
                    const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setSelectedFields(vals.length ? vals : []);
                  }}
                  size={6}
                >
                  {availableFields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Max points
                <input
                  type="number"
                  min="200"
                  max="20000"
                  step="100"
                  value={maxPoints}
                  onChange={(e) => setMaxPoints(Number(e.target.value || 1500))}
                />
              </label>
            </div>
          </div>
        </section>

        <div className="plotsGrid" style={{ marginTop: 12 }}>
          {selectedDevice && selectedFields.length ? (
            selectedFields.map((field) => {
              const seriesKey = `${selectedDevice}:${field}`;
              return <PlotCard key={seriesKey} seriesRef={seriesRef} seriesKey={seriesKey} />;
            })
          ) : (
            <div className="card controls">
              <div className="emptyTitle">No plot selection</div>
              <div className="muted">Select a device and one or more fields to plot.</div>
            </div>
          )}
        </div>
      </section>

      {/* RIGHT RAIL */}
      <aside className="dashRight">
        <section className="card controls">
          <LiveMetrics
            deviceId={selectedDevice}
            devicesRef={devicesRef}
            latestRef={latestRef}
            seriesRef={seriesRef}
          />
        </section>
      </aside>
    </div>
  );
}
