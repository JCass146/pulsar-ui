import React, { useEffect, useMemo, useState } from "react";
import PlotCard from "./PlotCard.jsx";
import VirtualizedNotifications from "./VirtualizedNotifications.jsx";
import TopControlBar from "./TopControlBar.jsx";
import LiveMetricsRail from "./LiveMetricsRail.jsx";
import HealthSummaryBar from "./HealthSummaryBar.jsx";
import RetainedSnapshotBar from "./RetainedSnapshotBar.jsx";
import { useDebounceCallback } from "../hooks/useDebounce.js";
import { APP_CONFIG } from "../config-constants.js";
import { loadPinnedMetrics } from "../utils/persistence.js";

function pillClassForBool(v) {
  if (v === true) return "ok";
  if (v === false) return "bad";
  return "neutral";
}

function devStatusClass(d) {
  if (!d?.online) return "bad";
  if (d?.stale) return "warn";
  return "ok";
}

function toBoolish(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    if (["1", "true", "on", "yes", "armed"].includes(s)) return true;
    if (["0", "false", "off", "no", "disarmed"].includes(s)) return false;
  }
  return null;
}

// Heuristic: try to surface relay states from retained state OR latest telemetry fields
function extractRelayBadges(dev, latest) {
  const out = [];

  // 1) retained state candidates
  // common patterns: state/relays => { "1":1, "2":0 } OR { r1:true } OR { relay1:1 }
  const rel = dev?.state?.get?.("relays") || dev?.state?.get?.("relay") || dev?.state?.get?.("outputs");
  if (rel && typeof rel === "object") {
    for (const [k, v] of Object.entries(rel)) {
      const b = toBoolish(v);
      if (b === null) continue;
      out.push({ label: `relay ${k}`, state: b });
    }
    if (out.length) return out.slice(0, 8);
  }

  // 2) telemetry fallback: fields like relay1, relay_1, relay_1_state
  const f = latest?.fields && typeof latest.fields === "object" ? latest.fields : null;
  const obj = f || latest;
  if (obj && typeof obj === "object") {
    const keys = Object.keys(obj);
    const relayKeys = keys.filter((k) => /^relay[_]?\d+/.test(k.toLowerCase()));
    for (const k of relayKeys.slice(0, 8)) {
      const b = toBoolish(obj[k]);
      if (b === null) continue;
      out.push({ label: k, state: b });
    }
  }

  return out.slice(0, 8);
}

// show a few “interesting” retained/meta/status keys as buttons without hardcoding your future schema
function extractStatusBadges(dev) {
  const out = [];

  // status payload (not the topic kind, the content)
  const st = dev?.latestStatus;
  if (st && typeof st === "object") {
    if ("time_ok" in st) out.push({ label: "time_ok", state: toBoolish(st.time_ok) });
    if ("online" in st) out.push({ label: "online", state: toBoolish(st.online) });
  }

  // meta/capabilities quick surfacing
  const caps = dev?.meta?.get?.("capabilities");
  if (caps && typeof caps === "object") {
    if (caps.device_type) out.push({ label: `type:${caps.device_type}`, state: null });
    if (caps.fw) out.push({ label: `fw:${caps.fw}`, state: null });
  }

  return out.filter(Boolean).slice(0, 8);
}

const WATCH_KEY = "pulsarui:watchedFields:v1";

function loadWatchedFields() {
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    if (Array.isArray(arr) && arr.length) return arr.map(String);
  } catch {
    /* noop */
  }
  return ["pressure_psi", "mass_g", "temp_c"];
}

function saveWatchedFields(fields, onNotify) {
  try {
    localStorage.setItem(WATCH_KEY, JSON.stringify(fields));
  } catch (err) {
    // Handle storage quota exceeded or other localStorage errors
    if (err.name === "QuotaExceededError") {
      console.warn("localStorage quota exceeded: cannot save watched fields");
      if (onNotify) {
        onNotify("warn", "Storage Full", "Could not save watched fields - localStorage quota exceeded", null);
      }
    } else {
      console.error("localStorage error:", err);
      if (onNotify) {
        onNotify("bad", "Storage Error", "Could not save watched fields", null);
      }
    }
  }
}

export default function DashboardView({
  // existing props
  selectedDevice,
  setSelectedDevice,
  plotDevices,
  deviceList,
  maxPoints,
  setMaxPoints,
  devicesRef,
  latestRef,
  seriesRef,
  getDeviceRole,
  notifItems,
  clearNotifs,
  broadcastCommand,
  // new props for Milestone 1
  sendCommand,
  pushNotif,
  // NEW: HealthSummaryBar navigation props
  onNavigateToRaw,
  onHealthFilterChange,
  healthFilter = "all",
}) {
  // Watched fields (no multi-select dropdown needed)
  const [watchedFields, setWatchedFields] = useState(() => loadWatchedFields());
  const [watchedText, setWatchedText] = useState(() => loadWatchedFields().join(", "));
  const [showOnlyOnline, setShowOnlyOnline] = useState(true);
  const [configCollapsed, setConfigCollapsed] = useState(true);
  const [notifCollapsed, setNotifCollapsed] = useState(true);
  const [pinnedMetrics] = useState(() => loadPinnedMetrics());

  // Auto-expand notifications on errors/warnings
  useEffect(() => {
    const hasErrors = notifItems.some(n => n.level === "bad" || n.level === "warn");
    if (hasErrors && notifCollapsed) {
      setNotifCollapsed(false);
    }
  }, [notifItems, notifCollapsed]);

  useEffect(() => {
    // keep text in sync if loaded
    setWatchedText(watchedFields.join(", "));
  }, []); // once

  // Auto-apply watched fields with debounce
  useDebounceCallback(
    watchedText,
    APP_CONFIG.DEBOUNCE_INPUT_MS,
    (debouncedText) => {
      const next = debouncedText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const uniq = [];
      const seen = new Set();
      for (const f of next) {
        if (seen.has(f)) continue;
        seen.add(f);
        uniq.push(f);
      }
      const final = uniq.length ? uniq : ["pressure_psi"];
      setWatchedFields(final);
      saveWatchedFields(final);
    }
  );

  // Pick a stable device order: online first, then stale, then offline
  const devicesOrdered = useMemo(() => {
    const arr = [...deviceList];
    arr.sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      if (a.stale !== b.stale) return a.stale ? 1 : -1;
      return a.id.localeCompare(b.id);
    });
    return showOnlyOnline ? arr.filter((d) => d.online) : arr;
  }, [deviceList, showOnlyOnline]);

  // Build the “chart wall” series keys: device:field (only if we’ve seen that field for that device)
  const wallSeries = useMemo(() => {
    const out = [];
    for (const d of devicesOrdered) {
      const latest = latestRef.current.get(d.id);
      if (!latest) continue;

      // which numeric fields exist (best-effort)
      const fieldsObj = latest?.fields && typeof latest.fields === "object" ? latest.fields : null;
      const keys = new Set([
        ...Object.keys(fieldsObj || {}),
        ...Object.keys(latest || {})
      ]);

      for (const f of watchedFields) {
        if (keys.has(f)) out.push({ device: d.id, field: f, seriesKey: `${d.id}:${f}` });
      }
    }
    return out;
  }, [devicesOrdered, watchedFields, latestRef]);

  function applyWatched() {
    const next = watchedText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const uniq = [];
    const seen = new Set();
    for (const f of next) {
      if (seen.has(f)) continue;
      seen.add(f);
      uniq.push(f);
    }
    const final = uniq.length ? uniq : ["pressure_psi"];
    setWatchedFields(final);
    saveWatchedFields(final);
  }

  const selectedDevObj = selectedDevice ? devicesRef.current.get(selectedDevice) : null;
  const selectedRole = selectedDevObj ? getDeviceRole(selectedDevObj) : "—";

  return (
    <div className="dashSimple">
      {/* HEALTH SUMMARY BAR - Global fleet health at top */}
      <HealthSummaryBar
        deviceList={deviceList}
        onFilterChange={onHealthFilterChange}
        activeFilter={healthFilter}
        onNavigateToRaw={onNavigateToRaw}
      />

      {/* MAIN CONTENT */}
      <div className="dashSimpleMain">
        {/* LEFT RAIL - Control Station & Notifications */}
        <aside className="dashSimpleLeft">
          {/* Control Station */}
          <section className="card controls">
            <div className="dashControlsRow">
              <div className="dashTitleBlock">
                <div className="dashTitle">🎛️ Control Station</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Observe live telemetry • Charts always visible
                </div>
              </div>

              <div className="statusStrip">
                <span className="pillTag2 mono">selected {selectedDevice || "—"}</span>
                <span className="pillTag2">{selectedRole}</span>
                <span className="pillTag2 mono">watched {watchedFields.length}</span>
                <span className="pillTag2 mono">charts {wallSeries.length}</span>
              </div>
            </div>
          </section>

          <TopControlBar
            deviceList={deviceList}
            devicesRef={devicesRef}
            broadcastCommand={broadcastCommand}
          />

          {/* Dashboard Config - collapsible */}
          <section className="card controls" style={{ marginTop: 12 }}>
            <div
              className="row"
              style={{ alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
              onClick={() => setConfigCollapsed((v) => !v)}
            >
              <h2 style={{ margin: 0 }}>⚙️ Config</h2>
              <span className="muted">{configCollapsed ? "▶" : "▼"}</span>
            </div>

            {!configCollapsed && (
              <div className="form" style={{ marginTop: 12 }}>
                <label>
                  Watched fields (comma separated)
                  <input
                    value={watchedText}
                    onChange={(e) => setWatchedText(e.target.value)}
                    placeholder="pressure_psi, mass_g, temp_c"
                    spellCheck={false}
                  />
                  <div className="hint">
                    These fields become charts for each device.
                  </div>
                </label>

                <div className="row">
                  <button type="button" className="secondary" onClick={applyWatched}>
                    Apply
                  </button>
                  <button
                    type="button"
                    className={showOnlyOnline ? "secondary" : ""}
                    onClick={() => setShowOnlyOnline((v) => !v)}
                  >
                    {showOnlyOnline ? "Online only" : "All devices"}
                  </button>
                </div>

                <label>
                  Max points (history)
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
            )}
          </section>

          {/* Notifications - Collapsed by default */}
          <section className="card controls" style={{ marginTop: 12 }}>
            <div
              className="row"
              style={{ alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
              onClick={() => setNotifCollapsed((v) => !v)}
            >
              <h2 style={{ margin: 0 }}>🔔 Notifications {notifItems.length > 0 && `(${notifItems.length})`}</h2>
              <div className="row" style={{ gap: 8 }}>
                {!notifCollapsed && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={(e) => { e.stopPropagation(); clearNotifs(); }}
                  >
                    Clear
                  </button>
                )}
                <span className="muted">{notifCollapsed ? "▶" : "▼"}</span>
              </div>
            </div>

            {!notifCollapsed && (
              <>
                <VirtualizedNotifications
                  notifItems={notifItems}
                  clearNotifs={clearNotifs}
                  showStickyFaults={true}
                  maxHeight={360}
                />
                <div className="hint" style={{ marginTop: 8 }}>
                  Full message history in <span className="mono">Raw</span> tab.
                </div>
              </>
            )}
          </section>
        </aside>

        {/* CENTER - Charts Wall */}
        <section className="dashSimpleCenter">
          {/* Retained State Strip */}
          {pinnedMetrics && pinnedMetrics.length > 0 && (
            <RetainedSnapshotBar
              pinnedMetrics={pinnedMetrics}
              devicesRef={devicesRef}
              latestRef={latestRef}
            />
          )}

          {/* CHART WALL */}
          <div className="plotsGrid">
            {wallSeries.length ? (
              wallSeries.map(({ seriesKey }) => (
                <PlotCard
                  key={seriesKey}
                  seriesRef={seriesRef}
                  seriesKey={seriesKey}
                  height={220}
                  devicesRef={devicesRef}
                />
              ))
            ) : (
              <div className="card controls">
                <div className="emptyTitle">No charts yet</div>
                <div className="muted">
                  Waiting for telemetry on watched fields.
                </div>
                <div className="hint" style={{ marginTop: 12 }}>
                  Default fields: <span className="mono">{watchedFields.join(", ")}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT RAIL - Pinned Metrics */}
        <aside className="dashSimpleRight">
          <LiveMetricsRail
            devicesRef={devicesRef}
            latestRef={latestRef}
            seriesRef={seriesRef}
            deviceList={deviceList}
            selectedDevice={selectedDevice}
            pushNotif={pushNotif}
          />
        </aside>
      </div>
    </div>
  );
}
