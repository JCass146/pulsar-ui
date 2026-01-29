import React, { useMemo, useState } from "react";
import DeviceList from "./DeviceList.jsx";
import CommandQueue from "./CommandQueue.jsx";
import CommandTemplates from "./CommandTemplates.jsx";
import AuthorityControl, { CommandGate } from "./AuthorityControl.jsx";
import DeviceChip, { DeviceChipGroup } from "./DeviceChip.jsx";
import DeviceCapabilities from "./DeviceCapabilities.jsx";

function safeJsonStringify(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/**
 * CommandPreviewModal - Shows command details before execution
 */
function CommandPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  deviceId,
  action,
  args,
  isDangerous = false,
  authorityLevel,
}) {
  if (!isOpen) return null;

  const topic = `pulsar/${deviceId}/cmd/${action}`;
  const payload = safeJsonStringify(args);

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent commandPreviewModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3>⚠ Command Preview</h3>
          <button type="button" className="modalClose" onClick={onClose}>×</button>
        </div>

        <div className="modalBody">
          <div className="commandPreviewSection">
            <h4>Target Device</h4>
            <div className="commandPreviewDevice">
              <DeviceChip
                device={{ id: deviceId }}
                isSelected={false}
                onClick={() => {}}
                showRole={true}
                compact={false}
              />
            </div>
          </div>

          <div className="commandPreviewSection">
            <h4>MQTT Topic</h4>
            <div className="mono commandPreviewTopic">{topic}</div>
          </div>

          <div className="commandPreviewSection">
            <h4>Command Payload</h4>
            <pre className="commandPreviewPayload">{payload}</pre>
          </div>

          {isDangerous && (
            <div className="commandPreviewWarning">
              <div className="warningIcon">⚠</div>
              <div className="warningText">
                <strong>Dangerous Command</strong>
                <p>This operation may cause device instability, data loss, or require manual recovery.</p>
                <p>Authority Level: <span className="authorityBadge">{authorityLevel.toUpperCase()}</span></p>
              </div>
            </div>
          )}
        </div>

        <div className="modalFooter">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`primary ${isDangerous ? 'danger' : ''}`}
            onClick={onConfirm}
          >
            {isDangerous ? '⚠ Execute Dangerous Command' : 'Execute Command'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ControlView({
  // device selection
  selectedDevice,
  setSelectedDevice,
  plotDevices,
  deviceList,
  deviceTick,
  devicesRef,
  getDeviceRole,

  // command center
  cmdAction,
  setCmdAction,
  cmdArgsText,
  setCmdArgsText,
  sendGenericCommand,
  cmdHistory,
  commandTimeoutMs,

  // calibration
  calEditorText,
  setCalEditorText,
  calAutoSync,
  setCalAutoSync,
  sendCalibration,
  resetCalEditorToCurrent,

  // Milestone 3: Command Workflows
  authorityLevel = "control",
  setAuthorityLevel,
  armedExpiresAt,
  handleArmedExpire,
  canExecuteCommand,
  refreshArmed,
  onCancelCommand,
  onRetryCommand,
  sendCommand,
}) {
  const dev = selectedDevice ? devicesRef.current.get(selectedDevice) : null;

  // Panel collapse states
  const [queueCollapsed, setQueueCollapsed] = useState(false);
  const [templatesCollapsed, setTemplatesCollapsed] = useState(false);

  // Command preview modal state
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    deviceId: null,
    action: null,
    args: null,
    isDangerous: false,
    onConfirm: null,
  });

  // Command staging state
  const [stagedCommands, setStagedCommands] = useState([]);
  const [expertMode, setExpertMode] = useState(false);

  // Determine if a command is dangerous
  const isCommandDangerous = (action, args) => {
    const dangerousActions = [
      'system.reboot',
      'firmware.update',
      'firmware.flash',
      'system.factory_reset',
      'calibration.apply',
      'relay.all_off', // Emergency all-off is dangerous
    ];

    if (dangerousActions.includes(action)) return true;

    // Check for dangerous args patterns
    if (args && typeof args === 'object') {
      if (args.factory_reset || args.force || args.dangerous) return true;
    }

    return false;
  };

  const stateEntries = useMemo(() => {
    if (!dev?.state) return [];
    return Array.from(dev.state.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [dev, deviceTick, selectedDevice]);

  const metaEntries = useMemo(() => {
    if (!dev?.meta) return [];
    return Array.from(dev.meta.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [dev, deviceTick, selectedDevice]);

  const currentCal = dev?.state?.get("calibration");

  // Execute a template command (M3.2)
  const handleExecuteTemplate = (deviceId, action, args, isDangerous = false) => {
    const dangerous = isDangerous || isCommandDangerous(action, args);

    // Check authority
    if (!canExecuteCommand || !canExecuteCommand(dangerous)) {
      return; // Blocked by authority
    }

    // Fast-track safe commands in expert mode
    if (!dangerous && expertMode) {
      if (refreshArmed) refreshArmed(); // Keep ARMED timer alive
      if (sendCommand) {
        sendCommand(deviceId, action, args);
      }
      return;
    }

    // Stage command for review
    const stagedCmd = {
      deviceId,
      action,
      args,
      isDangerous: dangerous,
      deviceCount: 1,
      timestamp: Date.now(),
    };

    setStagedCommands(prev => [...prev, stagedCmd]);
  };

  // Authority-aware send generic command
  const handleSendGenericCommand = () => {
    if (!selectedDevice) return;

    let parsedArgs;
    try {
      parsedArgs = cmdArgsText.trim() ? JSON.parse(cmdArgsText) : {};
    } catch (e) {
      alert(`Invalid JSON in args: ${e.message}`);
      return;
    }

    const dangerous = isCommandDangerous(cmdAction, parsedArgs);

    // Check authority
    if (!canExecuteCommand || !canExecuteCommand(dangerous)) {
      return; // Blocked by authority
    }

    // Fast-track safe commands in expert mode
    if (!dangerous && expertMode) {
      if (refreshArmed) refreshArmed();
      sendGenericCommand();
      return;
    }

    // Stage command for review
    const stagedCmd = {
      deviceId: selectedDevice,
      action: cmdAction,
      args: parsedArgs,
      isDangerous: dangerous,
      deviceCount: 1,
      timestamp: Date.now(),
    };

    setStagedCommands(prev => [...prev, stagedCmd]);
  };

  // Handle executing staged commands
  const handleExecuteStaged = (stagedCmd) => {
    if (refreshArmed) refreshArmed();
    if (sendCommand) {
      sendCommand(stagedCmd.deviceId, stagedCmd.action, stagedCmd.args);
    }
    // Remove from staged commands
    setStagedCommands(prev => prev.filter(cmd => cmd !== stagedCmd));
  };

  // Handle canceling staged commands
  const handleCancelStaged = (stagedCmd) => {
    setStagedCommands(prev => prev.filter(cmd => cmd !== stagedCmd));
  };

  // Toggle expert mode
  const handleToggleExpertMode = () => {
    setExpertMode(prev => !prev);
  };

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
    <main className="controlViewMain">
      {/* Unified Header Bar */}
      <div className="controlViewHeader">
        <div className="controlViewHeaderRow">
          {/* Authority Control */}
          <AuthorityControl
            level={authorityLevel}
            onLevelChange={setAuthorityLevel}
            armedExpiresAt={armedExpiresAt}
            onArmedExpire={handleArmedExpire}
          />

          {/* Selected Device Indicator */}
          {selectedDevice && (
            <div className="selectedDeviceIndicator">
              <span className="selectedDeviceLabel">Selected:</span>
              <DeviceChip
                device={selectedDevice}
                isSelected={true}
                onClick={() => {}}
                showRole={true}
                compact={false}
              />
            </div>
          )}

          {/* Safe Mode Banner */}
          {authorityLevel === "control" && (
            <div className="controlSafeMode">
              <span className="controlSafeMode__icon">🛡️</span>
              <span className="controlSafeMode__text">
                <strong>SAFE MODE</strong> — All commands require preview confirmation. Dangerous operations blocked.
              </span>
              <button
                type="button"
                className="controlAdvancedToggle"
                onClick={() => setAuthorityLevel("armed")}
              >
                Enter ARMED Mode
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid">
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

        <section className="card feed">
          <h2>Command Center</h2>

          <CommandGate level={authorityLevel} isDangerous={false}>
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
                  Device should ack on <span className="mono">pulsar/&lt;device&gt;/ack/&lt;action&gt;</span> and echo{" "}
                  <span className="mono">id</span>.
                </div>
              </label>

              <div className="row">
                <button type="button" className="secondary" onClick={handleSendGenericCommand} disabled={!selectedDevice || authorityLevel === "view"}>
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
          </CommandGate>

          {/* Command Queue (M3.1) - replaces old command log */}
          <CommandQueue
            devicesRef={devicesRef}
            cmdHistory={cmdHistory}
            deviceTick={deviceTick}
            onCancelCommand={onCancelCommand}
            onRetryCommand={onRetryCommand}
            collapsed={queueCollapsed}
            onToggleCollapse={() => setQueueCollapsed((v) => !v)}
            stagedCommands={stagedCommands}
            onExecuteStaged={handleExecuteStaged}
            onCancelStaged={handleCancelStaged}
            expertMode={expertMode}
            onToggleExpertMode={handleToggleExpertMode}
          />
        </section>

        {/* Command Templates (M3.2) */}
        <section className="card controls">
          <CommandTemplates
            onExecuteTemplate={handleExecuteTemplate}
            selectedDevice={selectedDevice}
            authorityLevel={authorityLevel}
            collapsed={templatesCollapsed}
            onToggleCollapse={() => setTemplatesCollapsed((v) => !v)}
          />
        </section>

        <section className="card controls">
          <h2>Calibration</h2>

          <CommandGate level={authorityLevel} isDangerous={false}>
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
                <button type="button" className="secondary" onClick={() => handleSendCalibration("dry_run")} disabled={!selectedDevice || authorityLevel === "view"}>
                  Dry run
                </button>
                <CommandGate level={authorityLevel} isDangerous={true}>
                  <button type="button" className="danger" onClick={() => handleSendCalibration("apply")} disabled={!selectedDevice || authorityLevel !== "armed"}>
                    Apply + Persist
                  </button>
                </CommandGate>
                <button type="button" onClick={resetCalEditorToCurrent} disabled={!currentCal}>
                  Reset editor to current
                </button>
                <button type="button" className="secondary" onClick={() => setCalAutoSync((v) => !v)} disabled={!selectedDevice}>
                  Auto-sync: {calAutoSync ? "On" : "Off"}
                </button>
              </div>
            </div>
          </CommandGate>
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
      </div>

      {/* Command Preview Modal */}
      <CommandPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false })}
        onConfirm={previewModal.onConfirm}
        deviceId={previewModal.deviceId}
        action={previewModal.action}
        args={previewModal.args}
        isDangerous={previewModal.isDangerous}
        authorityLevel={authorityLevel}
      />
    </main>
  );
}
