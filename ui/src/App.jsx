import React, { useEffect, useMemo, useRef, useState } from "react";
import { connectMqtt } from "./mqtt.js";
import { parsePulsarTopic, formatBytes } from "./topic.js";
import { loadRuntimeConfig } from "./config.js";
import { pushPoint, getSeries } from "./timeseries.js";

import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, Legend
} from "recharts";

function nowIsoMs() {
  return new Date().toISOString();
}

function tryParsePayload(payloadU8) {
  let text = "";
  try {
    if (
      typeof payloadU8?.toString === "function" &&
      payloadU8?.toString !== Uint8Array.prototype.toString
    ) {
      text = payloadU8.toString("utf8");
    } else {
      text = new TextDecoder().decode(payloadU8);
    }
  } catch {
    text = "";
  }

  const trimmed = text.trim();
  if (!trimmed) return { kind: "empty", text: "" };

  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const json = JSON.parse(trimmed);
      return { kind: "json", text: trimmed, json };
    } catch {
      // fall through
    }
  }

  return { kind: "text", text };
}

function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

export default function App() {
  const [wsUrl, setWsUrl] = useState("");
  const [subTopic, setSubTopic] = useState("pulsar/+/telemetry/#");

  const [status, setStatus] = useState({ status: "loading", url: "" });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const [messages, setMessages] = useState([]);

  // Tabs
  const [tab, setTab] = useState("dashboard"); // "dashboard" | "raw"

  // Plot store (in-memory)
  const seriesRef = useRef(new Map()); // key `${device}:${field}` -> [{t, v}]
  const latestRef = useRef(new Map()); // device -> latest json

  // Plot controls
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedFields, setSelectedFields] = useState(["pressure_psi"]);
  const [maxPoints, setMaxPoints] = useState(1500);

  const [chartTick, setChartTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setChartTick((x) => x + 1), 200); // 5 fps is plenty
    return () => clearInterval(id);
  }, []);

  const controllerRef = useRef(null);

  const devices = useMemo(() => {
    const map = new Map();
    for (const m of messages) {
      const p = parsePulsarTopic(m.topic);
      if (p.device) map.set(p.device, (map.get(p.device) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [messages]);

  // Devices known for dashboard (derived from series keys too, in case you pause raw feed)
  const plotDevices = useMemo(() => {
    const set = new Set();
    for (const k of seriesRef.current.keys()) {
      const [dev] = k.split(":");
      if (dev) set.add(dev);
    }
    return Array.from(set).sort();
  }, [plotTick]);

  // Keep selectedDevice valid
  useEffect(() => {
    if (!selectedDevice) {
      const first = plotDevices[0] || devices[0]?.[0];
      if (first) setSelectedDevice(first);
    } else {
      const stillExists = plotDevices.includes(selectedDevice) || devices.some(([d]) => d === selectedDevice);
      if (!stillExists) {
        const first = plotDevices[0] || devices[0]?.[0];
        if (first) setSelectedDevice(first);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotDevices, devices]);

  const availableFields = useMemo(() => {
    if (!selectedDevice) return [];
    const set = new Set();
    for (const k of seriesRef.current.keys()) {
      const [dev, field] = k.split(":");
      if (dev === selectedDevice && field) set.add(field);
    }
    return Array.from(set).sort();
  }, [plotTick, selectedDevice]);

  function ingestForPlots(topic, parsed) {
    if (parsed.kind !== "json" || !parsed.json) return;

    const tp = parsePulsarTopic(topic);
    const device = tp.device || "unknown";
    const obj = parsed.json;

    // choose timestamp: prefer device time if present, else browser time
    const t = isFiniteNumber(obj.ts_unix_ms) ? obj.ts_unix_ms : Date.now();

    // latest snapshot for health
    latestRef.current.set(device, obj);

    // store every numeric field (simple + flexible)
    for (const [k, v] of Object.entries(obj)) {
      if (!isFiniteNumber(v)) continue;
      const key = `${device}:${k}`;
      pushPoint(seriesRef.current, key, { t, v }, maxPoints);
    }
  }

  function handleIncoming(topic, payload) {
    const parsed = tryParsePayload(payload);

    // Always ingest for plots even if raw is paused (so dashboard continues)
    ingestForPlots(topic, parsed);

    if (pausedRef.current) return;

    const entry = {
      id: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      t: nowIsoMs(),
      topic,
      topicParsed: parsePulsarTopic(topic),
      payloadLen: payload?.length ?? payload?.byteLength ?? 0,
      parsed
    };

    setMessages((prev) => [entry, ...prev].slice(0, 300));
  }

  // Load runtime config, then connect
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const cfg = await loadRuntimeConfig();
      if (!isMounted) return;

      setWsUrl(cfg.mqttWsUrl);
      setSubTopic(cfg.mqttTopic);

      const ctl = connectMqtt({
        url: cfg.mqttWsUrl,
        onState: (s) => setStatus(s),
        onMessage: (topic, payload) => handleIncoming(topic, payload)
      });

      controllerRef.current = ctl;
      ctl.subscribe(cfg.mqttTopic);
    })();

    return () => {
      isMounted = false;
      controllerRef.current?.end?.();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resubscribe(e) {
    e?.preventDefault?.();

    const ctl = controllerRef.current;
    if (!ctl) return;

    // simplest reliable way: end + reconnect
    ctl.end();

    setMessages([]);
    setStatus({ status: "reconnecting", url: "" });

    const newCtl = connectMqtt({
      url: wsUrl,
      onState: (s) => setStatus(s),
      onMessage: (topic, payload) => handleIncoming(topic, payload)
    });

    controllerRef.current = newCtl;
    newCtl.subscribe(subTopic);
  }

  function clearMessages() {
    setMessages([]);
  }

  function Dashboard() {
    const latest = selectedDevice ? latestRef.current.get(selectedDevice) : null;

    const health = {
      time_ok: latest?.time_ok,
      rssi_dbm: latest?.rssi_dbm,
      heap_free: latest?.heap_free,
      uptime_ms: latest?.uptime_ms ?? latest?.ts_uptime_ms,
      seq: latest?.seq,
      ts_unix_ms: latest?.ts_unix_ms
    };

    return (
      <div className="dash">
        <div className="dashTop">
          <section className="card">
            <h2>Dashboard</h2>

            <div className="form">
              <label>
                Device
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                >
                  {[...new Set([...plotDevices, ...devices.map(([d]) => d)])].map((d) => (
                    <option key={d} value={d}>{d}</option>
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
                    <option key={f} value={f}>{f}</option>
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
            <h2>Node health</h2>

            <div className="healthGrid">
              <div className="healthItem">
                <div className="muted">time_ok</div>
                <div className="mono">{health.time_ok === undefined ? "—" : String(health.time_ok)}</div>
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
            </div>

            <div className="hint" style={{ marginTop: 10 }}>
              Health values are taken from the most recent JSON payload for the selected device.
            </div>
          </section>
        </div>

        <div className="plotsGrid">
          {selectedDevice && selectedFields.length ? (
            selectedFields.map((field) => {
              const key = `${selectedDevice}:${field}`;
              const data = getSeries(seriesRef.current, key).map((p) => ({ t: p.t, v: p.v }));

              return (
                <div className="plotCard" key={key}>
                  <div className="plotTitle mono">{key}</div>
                  <div className="plotInner">
                    <ResponsiveContainer width="100%" height="100%">
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
                        <Line
                          dataKey="v"
                          dot={false}
                          isAnimationActive={false}
                          type="monotone"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
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

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <div className="title">Pulsar UI</div>
            <div className="subtitle">Live telemetry via MQTT over WebSockets</div>
          </div>
        </div>

        <div className="status">
          <span className={`pill ${status.status || "idle"}`}>{status.status || "idle"}</span>
          <span className="muted mono">{status.url || "(url pending)"}</span>
        </div>
      </header>

      <div className="tabs">
        <button
          className={tab === "dashboard" ? "tab active" : "tab"}
          onClick={() => setTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={tab === "raw" ? "tab active" : "tab"}
          onClick={() => setTab("raw")}
        >
          Raw
        </button>
      </div>

      {tab === "dashboard" ? (
        <main className="grid single">
          <Dashboard />
        </main>
      ) : (
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
                  This is loaded from <span className="mono">/config.json</span> on startup.
                </div>
              </label>

              <label>
                Subscribe topic
                <input
                  value={subTopic}
                  onChange={(e) => setSubTopic(e.target.value)}
                  placeholder="pulsar/+/telemetry/#"
                  spellCheck={false}
                />
                <div className="hint">Wildcards supported: + and #</div>
              </label>

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
                <div className="statValue mono">{messages.length}</div>
              </div>
              <div className="stat">
                <div className="statLabel">Devices (seen)</div>
                <div className="statValue mono">{devices.length}</div>
              </div>
            </div>

            <h3>Top devices</h3>
            <div className="chips">
              {devices.slice(0, 10).map(([dev, count]) => (
                <span key={dev} className="chip">
                  <span className="mono">{dev}</span>
                  <span className="muted mono">{count}</span>
                </span>
              ))}
              {devices.length === 0 && <span className="muted">No device IDs detected yet.</span>}
            </div>
          </section>

          <section className="card feed">
            <h2>Message feed</h2>

            <div className="feedList">
              {messages.map((m) => (
                <article key={m.id} className="msg">
                  <div className="msgMeta">
                    <span className="mono muted">{m.t}</span>
                    <span className="mono topic">{m.topic}</span>
                    <span className="muted mono">{formatBytes(m.payloadLen)}</span>
                  </div>

                  <div className="msgBody">
                    {m.parsed.kind === "json" ? (
                      <pre className="pre">{JSON.stringify(m.parsed.json, null, 2)}</pre>
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

              {messages.length === 0 && (
                <div className="empty">
                  <div className="emptyTitle">No messages yet</div>
                  <div className="muted">
                    Make sure Mosquitto has <span className="mono">listener 9001</span> with{" "}
                    <span className="mono">protocol websockets</span>, and that you’re publishing to{" "}
                    <span className="mono">{subTopic}</span>.
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      <footer className="footer muted">Built for Pulsar telemetry • nginx runtime config • MQTT.js</footer>
    </div>
  );
}
