import React from "react";
import { formatBytes } from "../topic.js";

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

  // feed
  filteredMessages
}) {
  return (
    <main className="grid">
      <section className="card controls">
        <h2>Connection</h2>

        <form className="form" onSubmit={resubscribe}>
          <label>
            WebSocket URL
            <input
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder="ws://broker-host:9001"
              spellCheck={false}
            />
            <div className="hint">
              Loaded from <span className="mono">/config.json</span> on startup.
            </div>
          </label>

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

        <h3>Raw filters</h3>
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
              <option value="state">state</option>
              <option value="telemetry">telemetry</option>
              <option value="event">event</option>
              <option value="cmd">cmd</option>
              <option value="ack">ack</option>
            </select>
          </label>
        </div>

        <h3>Devices</h3>
        <div className="chips">
          {deviceList.slice(0, 12).map((d) => {
            const label = d.online ? (d.stale ? "stale" : "online") : "offline";
            return (
              <span
                key={d.id}
                className="chip"
                onClick={() => setSelectedDevice(d.id)}
                style={{ cursor: "pointer" }}
                title={`${d.role} • ${label} • pending=${d.pending}`}
              >
                <span className="mono">{d.id}</span>
                <span className="muted mono">{label}</span>
              </span>
            );
          })}
          {deviceList.length === 0 && <span className="muted">No device IDs detected yet.</span>}
        </div>
      </section>

      <section className="card feed">
        <h2>Message feed</h2>

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
                  <span className="badge">
                    device: <span className="mono">{m.topicParsed.device || "?"}</span>
                  </span>
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
    </main>
  );
}
