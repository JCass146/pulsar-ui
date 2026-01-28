/**
 * RawView.jsx - REDESIGNED as Fleet & Debug Hub
 *
 * Raw tab responsibilities:
 * - MQTT message feed
 * - Topic filters
 * - Device filters
 * - Retained snapshots
 * - Timeline links
 * - Fleet list with device health
 *
 * This tab is for EXPERTS - do NOT simplify it.
 */
import React, { useMemo, useState } from "react";
import { formatBytes } from "../topic.js";
import DeviceChip from "./DeviceChip.jsx";
import HealthSummaryBar from "./HealthSummaryBar.jsx";
import RetainedStateBank from "./RetainedStateBank.jsx";
import {
  computeDeviceHealth,
  getHealthConfig,
  filterDevicesByHealth,
  formatLastSeen,
  getDeviceFriendlyName,
  formatShortDeviceId,
} from "../utils/health.js";
import { getDeviceRole } from "../services/device-registry.js";

function safeJsonStringify(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export default function RawView({
  // connection
  wsUrl,
  setWsUrl,
  subTopic,
  setSubTopic,
  subscribeTopics,
  setSubscribeTopics,
  resubscribe,
  paused,
  setPaused,
  clearMessages,

  // stats
  messagesCount,
  devicesSeenCount,

  // filters
  rawDeviceFilter,
  setRawDeviceFilter,
  rawFamilyFilter,
  setRawFamilyFilter,
  plotDevices,
  deviceList,
  setSelectedDevice,
  selectedDevice,

  // feed
  filteredMessages,

  // NEW: Device registry and state for Fleet panel
  devicesRef,
  latestRef,
  sendCommand,
  broadcastCommand,
  healthFilter = "all",
  onHealthFilterChange,
}) {
  // State for expanded device details panel
  const [expandedDevice, setExpandedDevice] = useState(null);

  // Filter devices by health status
  const filteredDeviceList = useMemo(() => {
    return filterDevicesByHealth(deviceList, healthFilter);
  }, [deviceList, healthFilter]);

  // Get expanded device details
  const expandedDeviceObj = expandedDevice && devicesRef?.current
    ? devicesRef.current.get(expandedDevice)
    : null;

  return (
    <div className="rawViewLayout">
      {/* Health Summary Bar at top */}
      <HealthSummaryBar
        deviceList={deviceList}
        onFilterChange={onHealthFilterChange}
        activeFilter={healthFilter}
      />

      <main className="rawViewMain">
        {/* LEFT PANEL: Connection + Filters */}
        <section className="card controls rawViewControls">
          <h2>🔌 Connection</h2>

        <form className="form" onSubmit={resubscribe}>
          <div className="connectionStatus">
            <div className="connectionStatusLabel">WebSocket Connection</div>
            <div className="connectionStatusValue mono">
              {wsUrl || "(pending)"}
            </div>
            <div className="hint">
              Connected via runtime config (<span className="mono">/config.json</span>)
            </div>
          </div>

          <label>
            Subscribe topic (single)
            <input
              value={subTopic}
              onChange={(e) => {
                setSubTopic(e.target.value);
                setSubscribeTopics(null); // manual override => single-topic mode
              }}
              placeholder="pulsar/+/telemetry/#"
              spellCheck={false}
            />
            <div className="hint">
              Wildcards supported: + and #. If you use multi-topic config, this field acts as a manual override.
            </div>
          </label>

          {subscribeTopics && subscribeTopics.length ? (
            <div className="hint" style={{ marginTop: 8 }}>
              Multi-subscribe active:
              <ul style={{ margin: "6px 0 0 18px" }}>
                {subscribeTopics.map((t) => (
                  <li key={t}>
                    <span className="mono">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="row">
            <button type="submit">Reconnect + Subscribe</button>
            <button type="button" className="secondary" onClick={() => setPaused((p) => !p)}>
              {paused ? "Resume" : "Pause"}
            </button>
            <button type="button" className="danger" onClick={clearMessages}>
              Clear
            </button>
          </div>
        </form>

        <div className="stats">
          <div className="stat">
            <div className="statLabel">Messages</div>
            <div className="statValue mono">{messagesCount}</div>
          </div>
          <div className="stat">
            <div className="statLabel">Devices (seen)</div>
            <div className="statValue mono">{devicesSeenCount}</div>
          </div>
        </div>

        <h3>🔍 Message Filters</h3>
        <div className="form">
          <label>
            Device
            <select value={rawDeviceFilter} onChange={(e) => setRawDeviceFilter(e.target.value)}>
              <option value="all">all</option>
              {plotDevices.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <label>
            Family
            <select value={rawFamilyFilter} onChange={(e) => setRawFamilyFilter(e.target.value)}>
              <option value="all">all</option>
              <option value="status">status</option>
              <option value="meta">meta</option>
              <option value="state">state (retained)</option>
              <option value="telemetry">telemetry</option>
              <option value="event">event</option>
              <option value="cmd">cmd</option>
              <option value="ack">ack</option>
            </select>
          </label>
        </div>
        </section>

        {/* CENTER: Message Feed */}
        <section className="card feed rawViewFeed">
          <h2>📨 Message Feed</h2>

          <div className="feedList">
            {filteredMessages.map((m) => (
              <article key={m.id} className="msg">
                <div className="msgMeta">
                  <span className="mono muted">{m.t}</span>
                  <span className="mono topic">{m.topic}</span>
                  <span className="muted mono">{formatBytes(m.payloadLen)}</span>
                </div>

                <div className="msgBody">
                  {m.parsed.kind === "json" ? (
                    <pre className="pre">{safeJsonStringify(m.parsed.json)}</pre>
                  ) : m.parsed.kind === "text" ? (
                    <pre className="pre">{m.parsed.text}</pre>
                  ) : (
                    <span className="muted">(empty)</span>
                  )}
                </div>

                {m.topicParsed?.isPulsar && (
                  <div className="msgFooter">
                    <DeviceChip
                      deviceId={m.topicParsed.device}
                      devicesRef={devicesRef}
                      size="small"
                      compact
                      clickable
                      onClick={(id) => {
                        setExpandedDevice(id);
                        setSelectedDevice(id);
                      }}
                    />
                    <span className="badge">
                      kind: <span className="mono">{m.topicParsed.kind || "?"}</span>
                    </span>
                    {m.topicParsed.path ? (
                      <span className="badge">
                        path: <span className="mono">{m.topicParsed.path}</span>
                      </span>
                    ) : null}
                  </div>
                )}
              </article>
            ))}

            {filteredMessages.length === 0 && (
              <div className="empty">
                <div className="emptyTitle">No messages yet</div>
                <div className="muted">
                  Make sure Mosquitto has <span className="mono">listener 9001</span> with{" "}
                  <span className="mono">protocol websockets</span>, and that you’re publishing/subscribed correctly.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANEL: Fleet List */}
        <aside className="rawViewFleet">
          <section className="card controls">
            <h2>�️ Fleet</h2>
            <div className="hint" style={{ marginBottom: 12 }}>
              {filteredDeviceList.length} device{filteredDeviceList.length !== 1 ? "s" : ""}
              {healthFilter !== "all" && ` (filtered: ${healthFilter})`}
            </div>

            <div className="fleetPanel__list">
              {filteredDeviceList.map((d) => {
                const dev = devicesRef?.current?.get(d.id);
                const healthConfig = getHealthConfig(d);
                const friendlyName = getDeviceFriendlyName(dev, devicesRef);
                const role = getDeviceRole(dev || d);
                const isSelected = expandedDevice === d.id;

                return (
                  <div
                    key={d.id}
                    className={`fleetDevice ${isSelected ? "fleetDevice--selected" : ""}`}
                    onClick={() => setExpandedDevice(isSelected ? null : d.id)}
                  >
                    <span
                      className="fleetDevice__health"
                      style={{ color: healthConfig.color }}
                      title={healthConfig.label}
                    >
                      {healthConfig.icon}
                    </span>

                    <div className="fleetDevice__identity">
                      {friendlyName ? (
                        <>
                          <span className="fleetDevice__name">{friendlyName}</span>
                          <span className="fleetDevice__id mono">{formatShortDeviceId(d.id)}</span>
                        </>
                      ) : (
                        <span className="fleetDevice__name mono">{formatShortDeviceId(d.id)}</span>
                      )}
                    </div>

                    <div className="fleetDevice__meta">
                      {role && role !== "unknown" && (
                        <span className="fleetDevice__role">{role}</span>
                      )}
                      <span className="mono">{formatLastSeen(d.lastSeenMs)}</span>
                    </div>
                  </div>
                );
              })}

              {filteredDeviceList.length === 0 && (
                <div className="muted" style={{ padding: 12 }}>
                  {healthFilter !== "all"
                    ? `No ${healthFilter} devices.`
                    : "No devices detected yet."}
                </div>
              )}
            </div>
          </section>

          {/* Device Details Panel */}
          {expandedDeviceObj && (
            <section className="card controls deviceDetailsPanel" style={{ marginTop: 12 }}>
              <div className="deviceDetailsPanel__header">
                <DeviceChip
                  device={expandedDeviceObj}
                  devicesRef={devicesRef}
                  showRole
                  showLastSeen
                />
                <button
                  type="button"
                  className="deviceDetailsPanel__close"
                  onClick={() => setExpandedDevice(null)}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <h3>Retained State</h3>
              <RetainedStateBank
                devicesRef={devicesRef}
                latestRef={latestRef}
                deviceList={[{ id: expandedDevice, ...expandedDeviceObj }]}
                selectedDevice={expandedDevice}
                onSendCommand={sendCommand}
                broadcastCommand={broadcastCommand}
                compact
              />
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}
