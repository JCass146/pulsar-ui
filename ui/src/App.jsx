import React, { useEffect, useMemo, useRef, useState } from "react";
import { connectMqtt } from "./mqtt.js";
import { parsePulsarTopic } from "./topic.js";
import { loadRuntimeConfig } from "./config.js";
import { pushPoint } from "./timeseries.js";

import DashboardView from "./ui/DashboardView.jsx";
import ControlView from "./ui/ControlView.jsx";
import RawView from "./ui/RawView.jsx";

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

      latestTelemetry: null,
      latestStatus: null,

      state: new Map(),
      meta: new Map(),

      pendingCommands: new Map()
    };
    map.set(id, d);
  }
  return d;
}

function extractNumericFields(obj) {
  if (!obj || typeof obj !== "object") return [];
  const out = [];

  if (isFiniteNumber(obj.value)) out.push(["value", obj.value]);

  const fieldsObj = obj.fields && typeof obj.fields === "object" ? obj.fields : null;
  if (fieldsObj) {
    for (const [k, v] of Object.entries(fieldsObj)) {
      if (isFiniteNumber(v)) out.push([k, v]);
    }
  }

  const ignore = new Set(["t_ms", "ts_unix_ms", "ts", "seq", "uptime_ms", "ts_uptime_ms", "v"]);
  for (const [k, v] of Object.entries(obj)) {
    if (ignore.has(k)) continue;
    if (k === "fields") continue;
    if (isFiniteNumber(v)) out.push([k, v]);
  }

  const seen = new Set();
  return out.filter(([k]) => {
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export default function App() {
  // Connection/config
  const [wsUrl, setWsUrl] = useState("");
  const [subTopic, setSubTopic] = useState("pulsar/+/telemetry/#");
  const [subscribeTopics, setSubscribeTopics] = useState(null);

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
  const [tab, setTab] = useState("dashboard"); // dashboard | control | raw

  // Device registry
  const devicesRef = useRef(new Map());
  const [deviceTick, setDeviceTick] = useState(0);

  // Plot store
  const seriesRef = useRef(new Map());
  const latestRef = useRef(new Map());

  // Plot controls
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedFields, setSelectedFields] = useState(["pressure_psi"]);
  const [maxPoints, setMaxPoints] = useState(1500);

  // Raw filters
  const [rawDeviceFilter, setRawDeviceFilter] = useState("all");
  const [rawFamilyFilter, setRawFamilyFilter] = useState("all");

  // Command Center
  const [cmdAction, setCmdAction] = useState("relay.set");
  const [cmdArgsText, setCmdArgsText] = useState('{"relay":1,"state":1}');
  const [cmdHistory, setCmdHistory] = useState([]);

  // Calibration panel
  const [calEditorText, setCalEditorText] = useState("");
  const [calAutoSync, setCalAutoSync] = useState(true);

  const controllerRef = useRef(null);

  function bumpDeviceTick() {
    setDeviceTick((x) => (x + 1) % 1_000_000);
  }

  function getDeviceRole(dev) {
    const caps = dev?.meta?.get("capabilities");
    const t = caps?.device_type;
    return t ? String(t) : "unknown";
  }

  function computeStale(dev) {
    const last = dev?.lastSeenMs || 0;
    dev.stale = !last || Date.now() - last > staleAfterMs;
  }

  function ingestForPlots(topic, parsed) {
    if (parsed.kind !== "json" || !parsed.json) return;

    const tp = parsePulsarTopic(topic);
    const device = tp.device || "unknown";
    const obj = parsed.json;

    const t =
      (isFiniteNumber(obj.ts_unix_ms) && obj.ts_unix_ms) ||
      (isFiniteNumber(obj.t_ms) && obj.t_ms) ||
      Date.now();

    latestRef.current.set(device, obj);

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

    if (kind === "status") {
      if (parsed.kind === "json" && parsed.json && typeof parsed.json === "object") {
        dev.latestStatus = parsed.json;
        if (typeof parsed.json.online === "boolean") dev.online = parsed.json.online;
        else dev.online = true;
      } else {
        dev.online = true;
      }
      return;
    }

    if (kind === "meta") {
      const key = path || "root";
      if (parsed.kind === "json") dev.meta.set(key, parsed.json);
      else dev.meta.set(key, { text: parsed.text ?? "" });
      return;
    }

    if (kind === "state") {
      const key = path || "root";
      if (parsed.kind === "json") dev.state.set(key, parsed.json);
      else dev.state.set(key, { text: parsed.text ?? "" });
      return;
    }

    if (kind === "ack") {
      if (parsed.kind === "json") resolveAck(tp.device, path || "unknown", parsed.json);
      return;
    }

    if (kind === "telemetry" || kind === "event") {
      dev.online = true;
      if (kind === "telemetry" && parsed.kind === "json") dev.latestTelemetry = parsed.json;
      return;
    }

    dev.online = true;
  }

  function handleIncoming(topic, payload) {
    const parsed = tryParsePayload(payload);

    ingestForPlots(topic, parsed);
    upsertDeviceFromMessage(topic, parsed);
    bumpDeviceTick();

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

  // Periodic stale recompute
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

      const mqttWs = cfg.mqttWsUrl;
      const mqttTopic = cfg.mqttTopic;

      const subs =
        Array.isArray(cfg.subscribeTopics) && cfg.subscribeTopics.length
          ? cfg.subscribeTopics.map((s) => String(s).trim()).filter(Boolean)
          : null;

      const stale =
        isFiniteNumber(cfg.staleAfterMs) && cfg.staleAfterMs > 0 ? cfg.staleAfterMs : 5000;

      const cmdTo =
        isFiniteNumber(cfg.commandTimeoutMs) && cfg.commandTimeoutMs > 0 ? cfg.commandTimeoutMs : 2000;

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

    if (subscribeTopics && subscribeTopics.length) {
      for (const t of subscribeTopics) newCtl.subscribe(t);
    } else {
      newCtl.subscribe(subTopic);
    }
  }

  function clearMessages() {
    setMessages([]);
  }

  // Devices list for UI
  const deviceList = useMemo(() => {
    const arr = Array.from(devicesRef.current.values()).map((d) => ({
      id: d.id,
      online: !!d.online,
      stale: !!d.stale,
      lastSeenMs: d.lastSeenMs || 0,
      role: getDeviceRole(d),
      pending: d.pendingCommands?.size || 0
    }));
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

  const availableFields = useMemo(() => {
    if (!selectedDevice) return [];
    const latest = latestRef.current.get(selectedDevice);
    if (!latest) return [];
    const pairs = extractNumericFields(latest);
    return pairs.map(([k]) => k).sort();
  }, [selectedDevice, deviceTick]);

  // Keep calibration editor synced unless user edits
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

    ctl.publish(topic, payload);

    setCmdHistory((prev) =>
      [
        { id, device: deviceId, action, status: "sent", t: nowIsoMs(), payload },
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
      const devOk = rawDeviceFilter === "all" ? true : (m.topicParsed?.device || "") === rawDeviceFilter;
      const famOk = rawFamilyFilter === "all" ? true : (m.topicParsed?.kind || "") === rawFamilyFilter;
      return devOk && famOk;
    });
  }, [messages, rawDeviceFilter, rawFamilyFilter]);

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
          <DashboardView
            selectedDevice={selectedDevice}
            setSelectedDevice={setSelectedDevice}
            plotDevices={plotDevices}
            deviceList={deviceList}   // ✅ add this
            availableFields={availableFields}
            selectedFields={selectedFields}
            setSelectedFields={setSelectedFields}
            maxPoints={maxPoints}
            setMaxPoints={setMaxPoints}
            devicesRef={devicesRef}
            latestRef={latestRef}
            seriesRef={seriesRef}
            getDeviceRole={getDeviceRole}
          />
        </main>
      ) : tab === "control" ? (
        <ControlView
          selectedDevice={selectedDevice}
          setSelectedDevice={setSelectedDevice}
          plotDevices={plotDevices}
          deviceList={deviceList}
          deviceTick={deviceTick}
          devicesRef={devicesRef}
          getDeviceRole={getDeviceRole}
          cmdAction={cmdAction}
          setCmdAction={setCmdAction}
          cmdArgsText={cmdArgsText}
          setCmdArgsText={setCmdArgsText}
          sendGenericCommand={sendGenericCommand}
          cmdHistory={cmdHistory}
          commandTimeoutMs={commandTimeoutMs}
          calEditorText={calEditorText}
          setCalEditorText={setCalEditorText}
          calAutoSync={calAutoSync}
          setCalAutoSync={setCalAutoSync}
          sendCalibration={sendCalibration}
          resetCalEditorToCurrent={resetCalEditorToCurrent}
        />
      ) : (
        <RawView
          wsUrl={wsUrl}
          setWsUrl={setWsUrl}
          subTopic={subTopic}
          setSubTopic={setSubTopic}
          subscribeTopics={subscribeTopics}
          setSubscribeTopics={setSubscribeTopics}
          resubscribe={resubscribe}
          paused={paused}
          setPaused={setPaused}
          clearMessages={clearMessages}
          messagesCount={messages.length}
          devicesSeenCount={devicesSeenCount}
          rawDeviceFilter={rawDeviceFilter}
          setRawDeviceFilter={setRawDeviceFilter}
          rawFamilyFilter={rawFamilyFilter}
          setRawFamilyFilter={setRawFamilyFilter}
          plotDevices={plotDevices}
          deviceList={deviceList}
          setSelectedDevice={setSelectedDevice}
          filteredMessages={filteredMessages}
        />
      )}

      <footer className="footer muted">Built for Pulsar telemetry • nginx runtime config • MQTT.js</footer>
    </div>
  );
}
