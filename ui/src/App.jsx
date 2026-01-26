import React, { useEffect, useMemo, useRef, useState } from "react";
import { connectMqtt } from "./mqtt.js";
import { parsePulsarTopic, formatBytes } from "./topic.js";
import { loadRuntimeConfig } from "./config.js";
import { pushPoint } from "./timeseries.js";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend
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

function newId() {
  try {
    return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  } catch {
    return `${Date.now()}-${Math.random()}`;
  }
}

function safeJsonStringify(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function ensureDevice(map, id) {
  if (!id) return null;
  let d = map.get(id);
  if (!d) {
    d = {
      id,
      online: false,
      lastSeenMs: 0,
      stale: true,

      // Latest views
      latestTelemetry: null,
      latestStatus: null,

      // State/meta stores keyed by path, e.g. "calibration", "relays", "capabilities"
      state: new Map(),
      meta: new Map(),

      // pending command tracking
      pendingCommands: new Map() // id -> { id, action, tStart, status, error, timeoutId }
    };
    map.set(id, d);
  }
  return d;
}

/**
 * Extract numeric fields from a JSON payload in a future-proof way.
 * Supports:
 *  - flat objects: { temp_c: 1, pressure_psi: 2 }
 *  - fields objects: { fields: { temp_c: 1, ... } }
 *  - canonical single-value: { value: 1 }
 */
function extractNumericFields(obj) {
  if (!obj || typeof obj !== "object") return [];
  const out = [];

  // canonical single-value
  if (isFiniteNumber(obj.value)) out.push(["value", obj.value]);

  // canonical multi-field
  const fieldsObj = obj.fields && typeof obj.fields === "object" ? obj.fields : null;
  if (fieldsObj) {
    for (const [k, v] of Object.entries(fieldsObj)) {
      if (isFiniteNumber(v)) out.push([k, v]);
    }
  }

  // flat numeric keys (ignore typical metadata keys)
  const ignore = new Set(["t_ms", "ts_unix_ms", "ts", "seq", "uptime_ms", "ts_uptime_ms", "v"]);
  for (const [k, v] of Object.entries(obj)) {
    if (ignore.has(k)) continue;
    if (k === "fields") continue;
    if (isFiniteNumber(v)) out.push([k, v]);
  }

  // de-dupe
  const seen = new Set();
  return out.filter(([k]) => {
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Chart-only component: re-renders on a timer so the rest of the UI stays clickable.
 */
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
        <ResponsiveContainer width="100%" height="100%" minHeight={260}>
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

export default function App() {
  // Connection/config
  const [wsUrl, setWsUrl] = useState("");
  const [subTopic, setSubTopic] = useState("pulsar/+/telemetry/#");
  const [subscribeTopics, setSubscribeTopics] = useState(null); // null => single-topic mode

  const [staleAfterMs, setStaleAfterMs] = useState(5000);
  const [commandTimeoutMs, setCommandTimeoutMs] = useState(2000);

  const [status, setStatus] = useState({ status: "loading", url: "" });

  // UI state
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const [messages, setMessages] = useState([]);

  // Tabs
  const [tab, setTab] = useState("dashboard"); // "dashboard" | "control" | "raw"

  // Device registry (core model)
  const devicesRef = useRef(new Map()); // device_id -> device record
  const [deviceTick, setDeviceTick] = useState(0); // lightweight re-render trigger

  // Plot store (in-memory)
  const seriesRef = useRef(new Map()); // key `${device}:${field}` -> [{t, v}]
  const latestRef = useRef(new Map()); // device -> latest telemetry JSON (for field discovery/health)

  // Plot controls
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedFields, setSelectedFields] = useState(["pressure_psi"]);
  const [maxPoints, setMaxPoints] = useState(1500);

  // Raw filters
  const [rawDeviceFilter, setRawDeviceFilter] = useState("all");
  const [rawFamilyFilter, setRawFamilyFilter] = useState("all");

  // Command Center (generic)
  const [cmdAction, setCmdAction] = useState("relay.set");
  const [cmdArgsText, setCmdArgsText] = useState('{"relay":1,"state":1}');
  const [cmdHistory, setCmdHistory] = useState([]); // latest first

  // Calibration panel (specialized)
  const [calEditorText, setCalEditorText] = useState("");
  const [calAutoSync, setCalAutoSync] = useState(true); // keep editor synced to device state until user edits

  const controllerRef = useRef(null);

  function bumpDeviceTick() {
    setDeviceTick((x) => (x + 1) % 1_000_000);
  }

  function computeStale(device) {
    const last = device?.lastSeenMs || 0;
    device.stale = !last || Date.now() - last > staleAfterMs;
  }

  function getDeviceRole(dev) {
    const caps = dev?.meta?.get("capabilities");
    const t = caps?.device_type;
    return t ? String(t) : "unknown";
  }

  function ingestForPlots(topic, parsed) {
    if (parsed.kind !== "json" || !parsed.json) return;

    const tp = parsePulsarTopic(topic);
    const device = tp.device || "unknown";
    const obj = parsed.json;

    // choose timestamp: prefer device time if present, else browser time
    const t =
      (isFiniteNumber(obj.ts_unix_ms) && obj.ts_unix_ms) ||
      (isFiniteNumber(obj.t_ms) && obj.t_ms) ||
      Date.now();

    // latest snapshot for health/fields
    latestRef.current.set(device, obj);

    // numeric fields
    const pairs = extractNumericFields(obj);
    for (const [k, v] of pairs) {
      const key = `${device}:${k}`;
      pushPoint(seriesRef.current, key, { t, v }, maxPoints);
    }
  }

  function resolveAck(deviceId, ackAction, ackJson) {
    const dev = ensureDevice(devicesRef.current, deviceId);
    if (!dev || !ackJson || typeof ackJson !== "object") return;

    const id = ackJson.id || ackJson.req_id || ackJson.request_id;
    if (!id) return;

    const pending = dev.pendingCommands.get(id);
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    pending.status = ackJson.ok === false ? "failed" : "acked";
    pending.error = ackJson.err || ackJson.error || null;

    setCmdHistory((prev) =>
      [
        {
          id,
          device: deviceId,
          action: pending.action || ackAction,
          status: pending.status,
          t: nowIsoMs(),
          error: pending.error,
          payload: ackJson
        },
        ...prev
      ].slice(0, 60)
    );

    dev.pendingCommands.delete(id);
  }

  function upsertDeviceFromMessage(topic, parsed) {
    const tp = parsePulsarTopic(topic);
    if (!tp?.isPulsar || !tp.device) return;

    const dev = ensureDevice(devicesRef.current, tp.device);
    if (!dev) return;

    dev.lastSeenMs = Date.now();
    computeStale(dev);

    const kind = tp.kind || "";
    const path = tp.path || "";

    // status (LWT / presence)
    if (kind === "status") {
      if (parsed.kind === "json" && parsed.json && typeof parsed.json === "object") {
        dev.latestStatus = parsed.json;
        if (typeof parsed.json.online === "boolean") dev.online = parsed.json.online;
        else dev.online = true;
      } else if (parsed.kind === "text") {
        const s = String(parsed.text || "").toLowerCase();
        if (s.includes("offline")) dev.online = false;
        else if (s.includes("online")) dev.online = true;
        dev.latestStatus = { text: parsed.text };
      } else {
        dev.online = true;
      }
      return;
    }

    // meta (retained)
    if (kind === "meta") {
      const key = path || "root";
      if (parsed.kind === "json") dev.meta.set(key, parsed.json);
      else dev.meta.set(key, { text: parsed.text ?? "" });
      return;
    }

    // state (retained)
    if (kind === "state") {
      const key = path || "root";
      if (parsed.kind === "json") dev.state.set(key, parsed.json);
      else dev.state.set(key, { text: parsed.text ?? "" });
      return;
    }

    // ack
    if (kind === "ack") {
      if (parsed.kind === "json") resolveAck(tp.device, path || "unknown", parsed.json);
      return;
    }

    // telemetry / events imply online
    if (kind === "telemetry" || kind === "event") {
      dev.online = true;
      if (kind === "telemetry" && parsed.kind === "json") dev.latestTelemetry = parsed.json;
      return;
    }

    // unknown family: still consider it activity
    dev.online = true;
  }

  function handleIncoming(topic, payload) {
    const parsed = tryParsePayload(payload);

    // plots always ingest (even if raw paused)
    ingestForPlots(topic, parsed);

    // device registry always updates
    upsertDeviceFromMessage(topic, parsed);

    // trigger light re-render for registry changes
    bumpDeviceTick();

    // raw feed respects pause
    if (pausedRef.current) return;

    const entry = {
      id: newId(),
      t: nowIsoMs(),
      topic,
      topicParsed: parsePulsarTopic(topic),
      payloadLen: payload?.length ?? payload?.byteLength ?? 0,
      parsed
    };

    setMessages((prev) => [entry, ...prev].slice(0, 600));
  }

  // Periodic stale recompute (so UI updates even without messages)
  useEffect(() => {
    const id = setInterval(() => {
      let changed = false;
      for (const dev of devicesRef.current.values()) {
        const prev = dev.stale;
        computeStale(dev);
        if (prev !== dev.stale) changed = true;
      }
      if (changed) bumpDeviceTick();
    }, 500);
    return () => clearInterval(id);
  }, [staleAfterMs]);

  // Load runtime config, then connect
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const cfg = await loadRuntimeConfig();
      if (!isMounted) return;

      // Backwards compat: config.js currently returns only { mqttWsUrl, mqttTopic }.
      // This App.jsx supports optional future keys if you extend config.json + config.js later.
      const mqttWs = cfg.mqttWsUrl;
      const mqttTopic = cfg.mqttTopic;

      const subs =
        Array.isArray(cfg.subscribeTopics) && cfg.subscribeTopics.length
          ? cfg.subscribeTopics.map((s) => String(s).trim()).filter(Boolean)
          : null;

      const stale =
        isFiniteNumber(cfg.staleAfterMs) && cfg.staleAfterMs > 0 ? cfg.staleAfterMs : 5000;

      const cmdTo =
        isFiniteNumber(cfg.commandTimeoutMs) && cfg.commandTimeoutMs > 0
          ? cfg.commandTimeoutMs
          : 2000;

      setWsUrl(mqttWs);
      setSubTopic(mqttTopic);
      setSubscribeTopics(subs);
      setStaleAfterMs(stale);
      setCommandTimeoutMs(cmdTo);

      const ctl = connectMqtt({
        url: mqttWs,
        onState: (s) => setStatus(s),
        onMessage: (topic, payload) => handleIncoming(topic, payload)
      });

      controllerRef.current = ctl;

      // Subscribe
      if (subs && subs.length) {
        for (const t of subs) ctl.subscribe(t);
      } else {
        ctl.subscribe(mqttTopic);
      }
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

    ctl.end();
    setMessages([]);
    setStatus({ status: "reconnecting", url: "" });

    const newCtl = connectMqtt({
      url: wsUrl,
      onState: (s) => setStatus(s),
      onMessage: (topic, payload) => handleIncoming(topic, payload)
    });

    controllerRef.current = newCtl;

    // subscribe according to mode
    if (subscribeTopics && subscribeTopics.length) {
      for (const t of subscribeTopics) newCtl.subscribe(t);
    } else {
      newCtl.subscribe(subTopic);
    }
  }

  function clearMessages() {
    setMessages([]);
  }

  const deviceList = useMemo(() => {
    const arr = Array.from(devicesRef.current.values()).map((d) => ({
      id: d.id,
      online: !!d.online,
      stale: !!d.stale,
      lastSeenMs: d.lastSeenMs || 0,
      role: getDeviceRole(d),
      pending: d.pendingCommands?.size || 0
    }));
    // sort: online first, then stale, then id
    arr.sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      if (a.stale !== b.stale) return a.stale ? 1 : -1;
      return a.id.localeCompare(b.id);
    });
    return arr;
  }, [deviceTick]);

  const plotDevices = useMemo(() => {
    const set = new Set();
    for (const d of deviceList) set.add(d.id);
    for (const dev of latestRef.current.keys()) set.add(dev);
    return Array.from(set).sort();
  }, [deviceList]);

  // Keep selectedDevice valid
  useEffect(() => {
    if (!selectedDevice) {
      const first = plotDevices[0];
      if (first) setSelectedDevice(first);
    } else if (!plotDevices.includes(selectedDevice)) {
      const first = plotDevices[0];
      if (first) setSelectedDevice(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotDevices]);

  // Field list derived from latest telemetry so it doesn't jump around
  const availableFields = useMemo(() => {
    if (!selectedDevice) return [];
    const latest = latestRef.current.get(selectedDevice);
    if (!latest) return [];
    const pairs = extractNumericFields(latest);
    return pairs.map(([k]) => k).sort();
  }, [selectedDevice, deviceTick]);

  // Keep calibration editor in sync with retained state unless user edits
  useEffect(() => {
    if (!selectedDevice) return;
    if (!calAutoSync) return;

    const dev = devicesRef.current.get(selectedDevice);
    const cal = dev?.state?.get("calibration");
    if (!cal) return;

    setCalEditorText(safeJsonStringify(cal));
  }, [selectedDevice, deviceTick, calAutoSync]);

  function publishCommand(deviceId, action, args, extra = {}) {
    const ctl = controllerRef.current;
    if (!ctl) return { ok: false, err: "not_connected" };
    if (!deviceId) return { ok: false, err: "no_device" };
    if (!action) return { ok: false, err: "no_action" };

    const id = newId();
    const topic = `pulsar/${deviceId}/cmd/${action}`;

    const payload = {
      v: 1,
      id,
      t_ms: Date.now(),
      args: args ?? {},
      ttl_ms: commandTimeoutMs,
      ...extra
    };

    // track pending
    const dev = ensureDevice(devicesRef.current, deviceId);
    if (dev) {
      const timeoutId = setTimeout(() => {
        const pending = dev.pendingCommands.get(id);
        if (pending) {
          dev.pendingCommands.delete(id);
          setCmdHistory((prev) =>
            [
              {
                id,
                device: deviceId,
                action,
                status: "timeout",
                t: nowIsoMs(),
                error: `No ack within ${commandTimeoutMs} ms`
              },
              ...prev
            ].slice(0, 60)
          );
          bumpDeviceTick();
        }
      }, commandTimeoutMs);

      dev.pendingCommands.set(id, {
        id,
        action,
        tStart: Date.now(),
        status: "pending",
        error: null,
        timeoutId
      });
    }

    // publish (mqtt.js supports object payload)
    ctl.publish(topic, payload);

    // history
    setCmdHistory((prev) =>
      [
        {
          id,
          device: deviceId,
          action,
          status: "sent",
          t: nowIsoMs(),
          payload
        },
        ...prev
      ].slice(0, 60)
    );

    bumpDeviceTick();
    return { ok: true, id };
  }

  function sendGenericCommand() {
    let args = {};
    try {
      args = cmdArgsText.trim() ? JSON.parse(cmdArgsText) : {};
    } catch (err) {
      setCmdHistory((prev) =>
        [
          {
            id: newId(),
            device: selectedDevice || "(none)",
            action: cmdAction,
            status: "ui_error",
            t: nowIsoMs(),
            error: `Invalid JSON args: ${String(err?.message || err)}`
          },
          ...prev
        ].slice(0, 60)
      );
      return;
    }

    publishCommand(selectedDevice, cmdAction, args);
  }

  function sendCalibration(mode) {
    // mode: "dry_run" | "apply"
    let calObj = null;
    try {
      calObj = calEditorText.trim() ? JSON.parse(calEditorText) : {};
    } catch (err) {
      setCmdHistory((prev) =>
        [
          {
            id: newId(),
            device: selectedDevice || "(none)",
            action: "calibration.set",
            status: "ui_error",
            t: nowIsoMs(),
            error: `Invalid calibration JSON: ${String(err?.message || err)}`
          },
          ...prev
        ].slice(0, 60)
      );
      return;
    }

    const persist = mode === "apply";
    // We put calibration content under extra fields, not inside args, so firmware can parse cleanly.
    // (args is still included; keep it empty for this command.)
    publishCommand(selectedDevice, "calibration.set", {}, { mode, cal: calObj, persist });
  }

  function resetCalEditorToCurrent() {
    const dev = selectedDevice ? devicesRef.current.get(selectedDevice) : null;
    const cal = dev?.state?.get("calibration");
    if (!cal) return;
    setCalEditorText(safeJsonStringify(cal));
    setCalAutoSync(true);
  }

  const filteredMessages = useMemo(() => {
    if (rawDeviceFilter === "all" && rawFamilyFilter === "all") return messages;

    return messages.filter((m) => {
      const devOk =
        rawDeviceFilter === "all" ? true : (m.topicParsed?.device || "") === rawDeviceFilter;
      const famOk =
        rawFamilyFilter === "all" ? true : (m.topicParsed?.kind || "") === rawFamilyFilter;
      return devOk && famOk;
    });
  }, [messages, rawDeviceFilter, rawFamilyFilter]);

  function Dashboard() {
    const dev = selectedDevice ? devicesRef.current.get(selectedDevice) : null;
    const latest = selectedDevice ? latestRef.current.get(selectedDevice) : null;

    const health = {
      role: dev ? getDeviceRole(dev) : "—",
      online: dev?.online,
      stale: dev?.stale,
      lastSeen: dev?.lastSeenMs ? new Date(dev.lastSeenMs).toLocaleTimeString() : "—",
      pending: dev?.pendingCommands?.size || 0,

      // common telemetry keys if present (optional)
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
                <div className="mono">
                  {health.time_ok === undefined ? "—" : String(health.time_ok)}
                </div>
              </div>
            </div>

            <div className="hint" style={{ marginTop: 10 }}>
              Best practice: publish retained <span className="mono">pulsar/&lt;device&gt;/status</span> with
              LWT. Stale is derived from last seen activity.
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

  function Control() {
    const dev = selectedDevice ? devicesRef.current.get(selectedDevice) : null;

    const stateEntries = useMemo(() => {
      if (!dev?.state) return [];
      return Array.from(dev.state.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [dev, deviceTick, selectedDevice]);

    const metaEntries = useMemo(() => {
      if (!dev?.meta) return [];
      return Array.from(dev.meta.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [dev, deviceTick, selectedDevice]);

    const currentCal = dev?.state?.get("calibration");

    return (
      <main className="grid">
        <section className="card controls">
          <h2>Devices</h2>

          <div className="form">
            <label>
              Selected device
              <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}>
                {plotDevices.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <div className="hint">
                Device status/state/meta are best when you subscribe to{" "}
                <span className="mono">pulsar/+/status</span>, <span className="mono">pulsar/+/state/#</span>,{" "}
                <span className="mono">pulsar/+/meta/#</span>.
              </div>
            </label>
          </div>

          <h3>All devices</h3>
          <div className="chips">
            {deviceList.slice(0, 50).map((d) => {
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
                  <span className="muted mono">{d.role}</span>
                  <span className="muted mono">{label}</span>
                </span>
              );
            })}
            {deviceList.length === 0 && <span className="muted">No device IDs detected yet.</span>}
          </div>
        </section>

        <section className="card feed">
          <h2>Command Center</h2>

          <div className="form">
            <label>
              Action
              <input
                value={cmdAction}
                onChange={(e) => setCmdAction(e.target.value)}
                placeholder="relay.set"
                spellCheck={false}
              />
              <div className="hint">
                Publishes to{" "}
                <span className="mono">
                  pulsar/{selectedDevice || "<device>"}/cmd/&lt;action&gt;
                </span>
              </div>
            </label>

            <label>
              Args (JSON)
              <textarea
                value={cmdArgsText}
                onChange={(e) => setCmdArgsText(e.target.value)}
                rows={4}
                spellCheck={false}
              />
              <div className="hint">
                Device should ack on{" "}
                <span className="mono">pulsar/&lt;device&gt;/ack/&lt;action&gt;</span> and echo{" "}
                <span className="mono">id</span>.
              </div>
            </label>

            <div className="row">
              <button type="button" className="secondary" onClick={sendGenericCommand} disabled={!selectedDevice}>
                Send Command
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setCmdAction("relay.set");
                  setCmdArgsText('{"relay":1,"state":1}');
                }}
              >
                Example: relay.set
              </button>
            </div>

            <div className="hint">
              Command timeout: <span className="mono">{commandTimeoutMs}ms</span>
            </div>
          </div>

          {cmdHistory.length ? (
            <>
              <h3 style={{ marginTop: 16 }}>Command log</h3>
              <div className="feedList" style={{ maxHeight: 320 }}>
                {cmdHistory.map((c) => (
                  <article key={c.id + c.t} className="msg">
                    <div className="msgMeta">
                      <span className="mono muted">{c.t}</span>
                      <span className="mono topic">
                        {c.device} • {c.action}
                      </span>
                      <span className="muted mono">{c.status}</span>
                    </div>
                    {c.error ? (
                      <div className="msgBody">
                        <pre className="pre">{String(c.error)}</pre>
                      </div>
                    ) : c.payload ? (
                      <div className="msgBody">
                        <pre className="pre">{safeJsonStringify(c.payload)}</pre>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="hint" style={{ marginTop: 10 }}>
              No commands yet.
            </div>
          )}
        </section>

        <section className="card controls">
          <h2>Calibration</h2>

          <div className="hint" style={{ marginBottom: 10 }}>
            Reads retained <span className="mono">pulsar/&lt;device&gt;/state/calibration</span>. Writes{" "}
            <span className="mono">pulsar/&lt;device&gt;/cmd/calibration.set</span> (dry-run/apply) and expects ack on{" "}
            <span className="mono">pulsar/&lt;device&gt;/ack/calibration.set</span>.
          </div>

          <div className="stats" style={{ marginBottom: 10 }}>
            <div className="stat">
              <div className="statLabel">Current</div>
              <div className="statValue mono">{currentCal ? "loaded" : "—"}</div>
            </div>
            <div className="stat">
              <div className="statLabel">Auto-sync editor</div>
              <div className="statValue mono">{calAutoSync ? "on" : "off"}</div>
            </div>
          </div>

          <div className="form">
            <label>
              Current calibration (read-only)
              <pre className="pre" style={{ maxHeight: 160, overflow: "auto" }}>
                {currentCal ? safeJsonStringify(currentCal) : "(no retained state/calibration yet)"}
              </pre>
            </label>

            <label>
              Edit calibration JSON
              <textarea
                value={calEditorText}
                onChange={(e) => {
                  setCalEditorText(e.target.value);
                  setCalAutoSync(false);
                }}
                rows={10}
                spellCheck={false}
                placeholder='{"v":1,"rev":7,"applied":{"pressure":{"offset":0,"scale":1}}}'
              />
              <div className="hint">
                Tip: start from the current retained payload, edit only what you need, then Dry run / Apply.
              </div>
            </label>

            <div className="row">
              <button
                type="button"
                className="secondary"
                onClick={() => sendCalibration("dry_run")}
                disabled={!selectedDevice}
              >
                Dry run
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => sendCalibration("apply")}
                disabled={!selectedDevice}
              >
                Apply + Persist
              </button>
              <button type="button" onClick={resetCalEditorToCurrent} disabled={!currentCal}>
                Reset editor to current
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setCalAutoSync((v) => !v)}
                disabled={!selectedDevice}
              >
                Auto-sync: {calAutoSync ? "On" : "Off"}
              </button>
            </div>
          </div>
        </section>

        <section className="card feed">
          <h2>State + Meta (retained)</h2>

          <h3>State</h3>
          {stateEntries.length ? (
            <div className="feedList" style={{ maxHeight: 260 }}>
              {stateEntries.map(([k, v]) => (
                <article key={`state-${k}`} className="msg">
                  <div className="msgMeta">
                    <span className="mono topic">state/{k}</span>
                  </div>
                  <div className="msgBody">
                    <pre className="pre">{safeJsonStringify(v)}</pre>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="muted">No retained state topics seen yet for this device.</div>
          )}

          <h3 style={{ marginTop: 14 }}>Meta</h3>
          {metaEntries.length ? (
            <div className="feedList" style={{ maxHeight: 260 }}>
              {metaEntries.map(([k, v]) => (
                <article key={`meta-${k}`} className="msg">
                  <div className="msgMeta">
                    <span className="mono topic">meta/{k}</span>
                  </div>
                  <div className="msgBody">
                    <pre className="pre">{safeJsonStringify(v)}</pre>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="muted">No retained meta topics seen yet for this device.</div>
          )}
        </section>
      </main>
    );
  }

  const devicesSeenCount = deviceList.length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <div className="title">Pulsar UI</div>
            <div className="subtitle">Live telemetry + control via MQTT over WebSockets</div>
          </div>
        </div>

        <div className="status">
          <span className={`pill ${status.status || "idle"}`}>{status.status || "idle"}</span>
          <span className="muted mono">{status.url || "(url pending)"}</span>
        </div>
      </header>

      <div className="tabs">
        <button className={tab === "dashboard" ? "tab active" : "tab"} onClick={() => setTab("dashboard")}>
          Dashboard
        </button>
        <button className={tab === "control" ? "tab active" : "tab"} onClick={() => setTab("control")}>
          Control
        </button>
        <button className={tab === "raw" ? "tab active" : "tab"} onClick={() => setTab("raw")}>
          Raw
        </button>
      </div>

      {tab === "dashboard" ? (
        <main className="grid single">
          <Dashboard />
        </main>
      ) : tab === "control" ? (
        <Control />
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
                  Wildcards supported: + and #. If you add multi-topic config later, this field acts as a manual override.
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
                <div className="statValue mono">{messages.length}</div>
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
