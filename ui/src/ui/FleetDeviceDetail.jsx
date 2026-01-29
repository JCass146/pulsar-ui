/**
 * FleetDeviceDetail.jsx
 * Detail panel for selected device in Fleet view
 * - Tabbed interface: Overview | Calibration | State/Meta
 * - Slides in from right when device selected
 */

import React, { useState, useMemo } from "react";
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

export default function FleetDeviceDetail({
  deviceId,
  devicesRef,
  deviceTick,
  onClose,
  getDeviceRole,
  
  // Calibration props
  calEditorText,
  setCalEditorText,
  calAutoSync,
  setCalAutoSync,
  sendCalibration,
  resetCalEditorToCurrent,
  authorityLevel,
  canExecuteCommand,
  refreshArmed,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const dev = deviceId ? devicesRef.current.get(deviceId) : null;

  const stateEntries = useMemo(() => {
    if (!dev?.state) return [];
    return Array.from(dev.state.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [dev, deviceTick, deviceId]);

  const metaEntries = useMemo(() => {
    if (!dev?.meta) return [];
    return Array.from(dev.meta.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [dev, deviceTick, deviceId]);

  const currentCal = dev?.state?.get("calibration");

  // Authority-aware calibration send
  const handleSendCalibration = (mode) => {
    const isDangerous = mode === "apply";
    if (!canExecuteCommand || !canExecuteCommand(isDangerous)) {
      return;
    }
    if (refreshArmed) refreshArmed();
    sendCalibration(mode);
  };

  if (!deviceId || !dev) {
    return null;
  }

  return (
    <aside className="fleet-device-detail">
      {/* Header with close button */}
      <div className="fleet-device-detail__header">
        <DeviceChip
          deviceId={deviceId}
          devicesRef={devicesRef}
          size="medium"
          showRole
          showLastSeen
        />
        <button
          className="fleet-device-detail__close"
          onClick={onClose}
          title="Close detail panel"
        >
          ✕
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="fleet-device-detail__tabs">
        <button
          className={`fleet-device-detail__tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`fleet-device-detail__tab ${activeTab === 'calibration' ? 'active' : ''}`}
          onClick={() => setActiveTab('calibration')}
        >
          🔬 Calibration
        </button>
        <button
          className={`fleet-device-detail__tab ${activeTab === 'state' ? 'active' : ''}`}
          onClick={() => setActiveTab('state')}
        >
          State/Meta
        </button>
      </div>

      {/* Tab Content */}
      <div className="fleet-device-detail__content">
        {activeTab === 'overview' && (
          <div className="fleet-device-detail__overview">
            <DeviceCapabilities
              selectedDevice={deviceId}
              devicesRef={devicesRef}
              deviceTick={deviceTick}
            />
          </div>
        )}

        {activeTab === 'calibration' && (
          <div className="fleet-device-detail__calibration">
            <CommandGate level={authorityLevel} isDangerous={false}>
              <div className="hint" style={{ marginBottom: 10 }}>
                Reads <span className="mono">pulsar/{deviceId}/state/calibration</span>. 
                Writes <span className="mono">pulsar/{deviceId}/cmd/calibration.set</span>
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
                    {currentCal ? safeJsonStringify(currentCal) : "(no retained calibration)"}
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
                  <div className="hint">Edit, then Dry run / Apply.</div>
                </label>

                <div className="row">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => handleSendCalibration("dry_run")}
                    disabled={!deviceId || authorityLevel === "view"}
                  >
                    Dry run
                  </button>
                  <CommandGate level={authorityLevel} isDangerous={true}>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleSendCalibration("apply")}
                      disabled={!deviceId || authorityLevel !== "armed"}
                    >
                      ⚠ Apply + Persist
                    </button>
                  </CommandGate>
                  <button type="button" onClick={resetCalEditorToCurrent} disabled={!currentCal}>
                    Reset
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setCalAutoSync((v) => !v)}
                    disabled={!deviceId}
                  >
                    Auto: {calAutoSync ? "On" : "Off"}
                  </button>
                </div>
              </div>
            </CommandGate>
          </div>
        )}

        {activeTab === 'state' && (
          <div className="fleet-device-detail__state">
            <h3>State</h3>
            {stateEntries.length ? (
              <div className="feedList" style={{ maxHeight: 240 }}>
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
              <div className="muted">No retained state topics yet.</div>
            )}

            <h3 style={{ marginTop: 14 }}>Meta</h3>
            {metaEntries.length ? (
              <div className="feedList" style={{ maxHeight: 240 }}>
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
              <div className="muted">No retained meta topics yet.</div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
