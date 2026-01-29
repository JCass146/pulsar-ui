/**
 * DeviceView.jsx
 * Single device deep-dive and calibration
 * - Device selection and info
 * - Device capabilities
 * - State/Meta viewer
 * - Calibration editor (ARMED-gated)
 */

import React, { useMemo, useState } from "react";
import DeviceList from "./DeviceList.jsx";
import DeviceChip from "./DeviceChip.jsx";
import DeviceCapabilities from "./DeviceCapabilities.jsx";
import { CommandGate } from "./AuthorityControl.jsx";

function safeJsonStringify(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export default function DeviceView({
  // device selection
  selectedDevice,
  setSelectedDevice,
  plotDevices,
  deviceList,
  deviceTick,
  devicesRef,
  getDeviceRole,

  // calibration
  calEditorText,
  setCalEditorText,
  calAutoSync,
  setCalAutoSync,
  sendCalibration,
  resetCalEditorToCurrent,

  // authority
  authorityLevel = "control",
  canExecuteCommand,
  refreshArmed,
}) {
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

  // Authority-aware calibration send
  const handleSendCalibration = (mode) => {
    const isDangerous = mode === "apply";
    if (!canExecuteCommand || !canExecuteCommand(isDangerous)) {
      return; // Blocked by authority
    }
    if (refreshArmed) refreshArmed();
    sendCalibration(mode);
  };

  return (
    <main className="deviceViewMain">
      {/* Device Selection Header */}
      <div className="deviceViewHeader">
        {selectedDevice ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: "var(--glass-light)", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Selected Device:</span>
            <DeviceChip
              deviceId={selectedDevice}
              devicesRef={devicesRef}
              size="medium"
              showRole
              showLastSeen
            />
          </div>
        ) : (
          <div style={{ padding: "12px 20px", background: "var(--glass-light)", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            No device selected
          </div>
        )}
      </div>

      <div className="grid">
        {/* Device Selection Panel */}
        <section className="card controls">
          <h2>Device Selection</h2>

          <div className="form">
            <label>
              Selected device
              <select value={selectedDevice || ""} onChange={(e) => setSelectedDevice(e.target.value)}>
                <option value="">-- Select a device --</option>
                {plotDevices.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <DeviceList
            title="Quick select"
            devices={deviceList}
            selectedDevice={selectedDevice}
            onSelect={(id) => setSelectedDevice(id)}
            compact
          />

          <DeviceCapabilities
            selectedDevice={selectedDevice}
            devicesRef={devicesRef}
            deviceTick={deviceTick}
          />
        </section>

        {/* Calibration Panel */}
        <section className="card controls">
          <h2>🔬 Calibration</h2>

          {!selectedDevice ? (
            <div className="hint">Select a device to view/edit calibration</div>
          ) : (
            <CommandGate level={authorityLevel} isDangerous={false}>
              <div className="hint" style={{ marginBottom: 10 }}>
                Reads retained <span className="mono">pulsar/&lt;device&gt;/state/calibration</span>. Writes{" "}
                <span className="mono">pulsar/&lt;device&gt;/cmd/calibration.set</span> (dry-run/apply).
              </div>

              <div className="stats" style={{ marginBottom: 10 }}>
                <div className="stat">
                  <div className="statLabel">Current</div>
                  <div className="statValue mono">{currentCal ? "loaded" : "—"}</div>
                </div>
                <div className="stat">
                  <div className="statLabel">Auto-sync</div>
                  <div className="statValue mono">{calAutoSync ? "on" : "off"}</div>
                </div>
                <div className="stat">
                  <div className="statLabel">Role</div>
                  <div className="statValue mono">{dev ? getDeviceRole(dev) : "—"}</div>
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
                  <div className="hint">Tip: start from current retained payload, edit, then Dry run / Apply.</div>
                </label>

                <div className="row">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => handleSendCalibration("dry_run")}
                    disabled={!selectedDevice || authorityLevel === "view"}
                  >
                    Dry run
                  </button>
                  <CommandGate level={authorityLevel} isDangerous={true}>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleSendCalibration("apply")}
                      disabled={!selectedDevice || authorityLevel !== "armed"}
                    >
                      ⚠ Apply + Persist
                    </button>
                  </CommandGate>
                  <button type="button" onClick={resetCalEditorToCurrent} disabled={!currentCal}>
                    Reset editor
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
            </CommandGate>
          )}
        </section>

        {/* State + Meta Panel */}
        <section className="card feed">
          <h2>State + Meta (retained)</h2>

          {!selectedDevice ? (
            <div className="hint">Select a device to view retained state and meta</div>
          ) : (
            <>
              <h3>State</h3>
              {stateEntries.length ? (
                <div className="feedList" style={{ maxHeight: 300 }}>
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
                <div className="feedList" style={{ maxHeight: 300 }}>
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
            </>
          )}
        </section>
      </div>
    </main>
  );
}
