import React, { useEffect, useMemo, useRef, useState } from "react";
import { connectMqtt } from "./mqtt.js";
import { parsePulsarTopic, formatBytes } from "./topic.js";
import { loadRuntimeConfig } from "./config.js";

function nowIsoMs() {
  return new Date().toISOString();
}

function tryParsePayload(payloadU8) {
  let text = "";
  try {
    if (typeof payloadU8?.toString === "function" && payloadU8?.toString !== Uint8Array.prototype.toString) {
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

export default function App() {
  const [wsUrl, setWsUrl] = useState("");
  const [subTopic, setSubTopic] = useState("pulsar/+/telemetry/#");

  const [status, setStatus] = useState({ status: "loading", url: "" });
  const [paused, setPaused] = useState(false);
  const [messages, setMessages] = useState([]);

  const controllerRef = useRef(null);

  const devices = useMemo(() => {
    const map = new Map();
    for (const m of messages) {
      const p = parsePulsarTopic(m.topic);
      if (p.device) map.set(p.device, (map.get(p.device) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [messages]);

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
        onMessage: (topic, payload) => {
          if (paused) return;

          const parsed = tryParsePayload(payload);
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
      onMessage: (topic, payload) => {
        if (paused) return;

        const parsed = tryParsePayload(payload);
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
    });

    controllerRef.current = newCtl;
    newCtl.subscribe(subTopic);
  }

  function clearMessages() {
    setMessages([]);
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
              <div className="hint">This is loaded from <span className="mono">/config.json</span> on startup.</div>
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

      <footer className="footer muted">Built for Pulsar telemetry • nginx runtime config • MQTT.js</footer>
    </div>
  );
}
