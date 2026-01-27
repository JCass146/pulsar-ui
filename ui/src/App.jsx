import React, { useEffect, useMemo, useRef, useState } from "react";
import { connectMqtt } from "./mqtt.js";
import { parsePulsarTopic } from "./topic.js";
import { loadRuntimeConfig } from "./config.js";
import { pushPoint } from "./timeseries.js";
import { useRafBatching } from "./hooks/useRafBatching.js";
import { useNotifications } from "./hooks/useNotifications.js";

// Utilities
import { isFiniteNumber, newId, nowIsoMs, safeJsonStringify } from "./utils/helpers.js";
import { tryParsePayload, extractNumericFields } from "./utils/parsing.js";

// Services
import { ensureDevice, computeStale, computeOnline, getDeviceRole } from "./services/device-registry.js";
import { createMqttMessageHandler } from "./services/mqtt-handler.js";
import { publishCommand, broadcastCommand } from "./services/command-publisher.js";

import DashboardView from "./ui/DashboardView.jsx";
import ControlView from "./ui/ControlView.jsx";
import RawView from "./ui/RawView.jsx";

export default function App() {
  // --- RAF Batching ---
  const { scheduleUpdate: scheduleRafUpdate } = useRafBatching();

  // --- Notifications ---
  const { notifItems, pushNotif, clearNotifs } = useNotifications();

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

  // Tabs
  const [tab, setTab] = useState("dashboard");
  const tabRef = useRef(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  // Messaging
  const messagesRef = useRef([]);
  const [rawTick, setRawTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (tabRef.current === "raw") setRawTick((x) => x + 1);
    }, 200);
    return () => clearInterval(id);
  }, []);

  // Device & data storage
  const devicesRef = useRef(new Map());
  const [deviceTick, setDeviceTick] = useState(0);
  const seriesRef = useRef(new Map());
  const latestRef = useRef(new Map());

  // UI controls
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedFields, setSelectedFields] = useState(["pressure_psi"]);
  const [maxPoints, setMaxPoints] = useState(1500);
  const [rawDeviceFilter, setRawDeviceFilter] = useState("all");
  const [rawFamilyFilter, setRawFamilyFilter] = useState("all");

  // Command/Calibration
  const [cmdAction, setCmdAction] = useState("relay.set");
  const [cmdArgsText, setCmdArgsText] = useState('{"relay":1,"state":1}');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [calEditorText, setCalEditorText] = useState("");
  const [calAutoSync, setCalAutoSync] = useState(true);

  // MQTT controller
  const controllerRef = useRef(null);
  const bumpQueuedRef = useRef(false);

  function bumpDeviceTick() {
    if (bumpQueuedRef.current) return;
    bumpQueuedRef.current = true;
    setTimeout(() => {
      bumpQueuedRef.current = false;
      setDeviceTick((x) => (x + 1) % 1_000_000);
    }, 100);
  }

  // Handle ACK resolution with history logging
  function handleAckResolved(ackInfo) {
    const { deviceId, action, status, error, ackJson } = ackInfo;
    const notifLevel = status === "acked" ? "ok" : "bad";
    const notifDetail = status === "acked" ? "ack" : `failed: ${error || "unknown"}`;

    pushNotif(notifLevel, `${deviceId} • ${action}`, notifDetail, deviceId);

    setCmdHistory((prev) =>
      [
        {
          id: ackJson?.id || "unknown",
          device: deviceId,
          action,
          status,
          t: nowIsoMs(),
          error,
          payload: ackJson
        },
        ...prev
      ].slice(0, 60)
    );
  }

  // Handle command timeout
  function handleCommandTimeout(timeoutInfo) {
    const { id, deviceId, action, timeoutMs } = timeoutInfo;
    pushNotif("warn", `${deviceId} • ${action}`, `timeout after ${timeoutMs} ms`, deviceId);

    setCmdHistory((prev) =>
      [
        {
          id,
          device: deviceId,
          action,
          status: "timeout",
          t: nowIsoMs(),
          error: `No ack within ${timeoutMs} ms`
        },
        ...prev
      ].slice(0, 60)
    );

    bumpDeviceTick();
  }

  // Handle command sent
  function handleCommandSent(sentInfo) {
    const { id, deviceId, action, t, payload } = sentInfo;
    setCmdHistory((prev) =>
      [
        { id, device: deviceId, action, status: "sent", t, payload },
        ...prev
      ].slice(0, 60)
    );
    bumpDeviceTick();
  }

  // Create the MQTT message handler
  const handleIncoming = useMemo(() => {
    return createMqttMessageHandler({
      devicesMap: devicesRef.current,
      seriesMap: seriesRef.current,
      latestMap: latestRef.current,
      messagesRef,
      paused: pausedRef.current,
      parsePulsarTopic,
      onAckResolved: handleAckResolved,
      onDeviceChanged: bumpDeviceTick,
      maxPoints
    });
  }, [maxPoints]);

  // Periodic stale/offline recompute
  useEffect(() => {
    const id = setInterval(() => {
      let changed = false;
      const now = Date.now();

      for (const dev of devicesRef.current.values()) {
        const prevStale = !!dev.stale;
        const prevOnline = !!dev.online;

        computeStale(dev, staleAfterMs);
        dev.online = computeOnline(dev, staleAfterMs);

        if (prevStale !== dev.stale) {
          pushNotif(dev.stale ? "warn" : "ok", dev.id, dev.stale ? "stale" : "fresh", dev.id);
          changed = true;
        }

        if (prevOnline !== dev.online) {
          pushNotif(dev.online ? "ok" : "bad", dev.id, dev.online ? "online" : "offline", dev.id);
          changed = true;
        }
      }

      if (changed) bumpDeviceTick();
    }, 500);

    return () => clearInterval(id);
  }, [staleAfterMs]);

  // Load config and connect MQTT
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const cfg = await loadRuntimeConfig();
      if (!isMounted) return;

      setWsUrl(cfg.mqttWsUrl);
      setSubTopic(cfg.mqttTopic);
      if (Array.isArray(cfg.subscribeTopics) && cfg.subscribeTopics.length) {
        setSubscribeTopics(cfg.subscribeTopics.map((s) => String(s).trim()).filter(Boolean));
      }
      if (isFiniteNumber(cfg.staleAfterMs) && cfg.staleAfterMs > 0) setStaleAfterMs(cfg.staleAfterMs);
      if (isFiniteNumber(cfg.commandTimeoutMs) && cfg.commandTimeoutMs > 0)
        setCommandTimeoutMs(cfg.commandTimeoutMs);

      const ctl = connectMqtt({
        url: cfg.mqttWsUrl,
        onState: (s) => {
          setStatus(s);
          const st = String(s?.status || "");
          if (st === "connected") pushNotif("ok", "MQTT connected", s?.url || "");
          else if (st === "reconnecting") pushNotif("warn", "MQTT reconnecting", s?.url || "");
          else if (st === "disconnected") pushNotif("bad", "MQTT disconnected", s?.url || "");
        },
        onMessage: (topic, payload) => {
          scheduleRafUpdate(() => handleIncoming(topic, payload));
        }
      });

      controllerRef.current = ctl;

      const topics = Array.isArray(cfg.subscribeTopics) && cfg.subscribeTopics.length 
        ? cfg.subscribeTopics 
        : [cfg.mqttTopic];
      
      for (const t of topics) ctl.subscribe(t);
    })();

    return () => {
      isMounted = false;
      controllerRef.current?.end?.();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resubscribe handler
  function resubscribe(e) {
    e?.preventDefault?.();
    if (!controllerRef.current) return;

    controllerRef.current.end();
    messagesRef.current = [];
    setRawTick((x) => x + 1);
    setStatus({ status: "reconnecting", url: "" });

    const ctl = connectMqtt({
      url: wsUrl,
      onState: (s) => {
        setStatus(s);
        const st = String(s?.status || "");
        if (st === "connected") pushNotif("ok", "MQTT connected", s?.url || "");
        else if (st === "reconnecting") pushNotif("warn", "MQTT reconnecting", s?.url || "");
        else if (st === "disconnected") pushNotif("bad", "MQTT disconnected", s?.url || "");
      },
      onMessage: (topic, payload) => {
        scheduleRafUpdate(() => handleIncoming(topic, payload));
      }
    });

    controllerRef.current = ctl;

    const topics = subscribeTopics && subscribeTopics.length ? subscribeTopics : [subTopic];
    for (const t of topics) ctl.subscribe(t);
  }

  // Command publishing wrapper
  function sendCommand(deviceId, action, args, extra) {
    publishCommand({
      controller: controllerRef.current,
      devicesMap: devicesRef.current,
      deviceId,
      action,
      args,
      commandTimeoutMs,
      onCommandSent: handleCommandSent,
      onCommandTimeout: handleCommandTimeout,
      extra
    });
  }

  // Broadcast wrapper
  function doBroadcastCommand(action, args, extra) {
    broadcastCommand({
      deviceList,
      controller: controllerRef.current,
      devicesMap: devicesRef.current,
      action,
      args,
      commandTimeoutMs,
      onCommandSent: handleCommandSent,
      onCommandTimeout: handleCommandTimeout,
      onNotif: ({ level, title, detail }) => pushNotif(level, title, detail)
    });
  }

  // Handlers for Control view
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
    sendCommand(selectedDevice, cmdAction, args);
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
    sendCommand(selectedDevice, "calibration.set", {}, { mode, cal: calObj, persist: mode === "apply" });
  }

  function resetCalEditorToCurrent() {
    const dev = devicesRef.current.get(selectedDevice);
    const cal = dev?.state?.get("calibration");
    if (cal) {
      setCalEditorText(safeJsonStringify(cal));
      setCalAutoSync(true);
    }
  }

  // Computed values
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
    const set = new Set(deviceList.map((d) => d.id));
    for (const dev of latestRef.current.keys()) set.add(dev);
    return Array.from(set).sort();
  }, [deviceList]);

  useEffect(() => {
    if (!selectedDevice && plotDevices[0]) setSelectedDevice(plotDevices[0]);
    else if (selectedDevice && !plotDevices.includes(selectedDevice) && plotDevices[0])
      setSelectedDevice(plotDevices[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotDevices]);

  const availableFields = useMemo(() => {
    if (!selectedDevice) return [];
    const latest = latestRef.current.get(selectedDevice);
    if (!latest) return [];
    return extractNumericFields(latest).map(([k]) => k).sort();
  }, [selectedDevice, deviceTick]);

  useEffect(() => {
    if (!selectedDevice || !calAutoSync) return;
    const dev = devicesRef.current.get(selectedDevice);
    const cal = dev?.state?.get("calibration");
    if (cal) setCalEditorText(safeJsonStringify(cal));
  }, [selectedDevice, deviceTick, calAutoSync]);

  const rawMessagesSnapshot = useMemo(() => messagesRef.current, [rawTick]);

  const filteredMessages = useMemo(() => {
    if (rawDeviceFilter === "all" && rawFamilyFilter === "all") return rawMessagesSnapshot;
    return rawMessagesSnapshot.filter((m) => {
      const devOk = rawDeviceFilter === "all" || (m.topicParsed?.device || "") === rawDeviceFilter;
      const famOk = rawFamilyFilter === "all" || (m.topicParsed?.kind || "") === rawFamilyFilter;
      return devOk && famOk;
    });
  }, [rawMessagesSnapshot, rawDeviceFilter, rawFamilyFilter]);

  // Render
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
            deviceList={deviceList}
            availableFields={availableFields}
            selectedFields={selectedFields}
            setSelectedFields={setSelectedFields}
            maxPoints={maxPoints}
            setMaxPoints={setMaxPoints}
            broadcastCommand={doBroadcastCommand}
            devicesRef={devicesRef}
            latestRef={latestRef}
            seriesRef={seriesRef}
            getDeviceRole={getDeviceRole}
            notifItems={notifItems}
            clearNotifs={clearNotifs}
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
          clearMessages={() => {
            messagesRef.current = [];
            setRawTick((x) => x + 1);
          }}
          messagesCount={messagesRef.current.length}
          devicesSeenCount={deviceList.length}
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
