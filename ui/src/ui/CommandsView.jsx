/**
 * CommandsView.jsx
 * Command center - send and manage commands
 * - Authority control
 * - Generic command sender
 * - Command queue (staged/pending/history)
 * - Command templates
 */

import React, { useState, useCallback } from "react";
import DeviceList from "./DeviceList.jsx";
import CommandQueue from "./CommandQueue.jsx";
import CommandTemplates from "./CommandTemplates.jsx";
import AuthorityControl, { CommandGate } from "./AuthorityControl.jsx";
import DeviceChip from "./DeviceChip.jsx";

export default function CommandsView({
  // device selection
  selectedDevice,
  setSelectedDevice,
  plotDevices,
  deviceList,
  deviceTick,
  devicesRef,

  // command center
  cmdAction,
  setCmdAction,
  cmdArgsText,
  setCmdArgsText,
  sendGenericCommand,
  cmdHistory,
  commandTimeoutMs,

  // authority
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
  // Panel collapse states
  const [queueCollapsed, setQueueCollapsed] = useState(false);
  const [templatesCollapsed, setTemplatesCollapsed] = useState(false);

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
      'relay.all_off',
    ];

    if (dangerousActions.includes(action)) return true;

    if (args && typeof args === 'object') {
      if (args.factory_reset || args.force || args.dangerous) return true;
    }

    return false;
  };

  // Execute a template command
  const handleExecuteTemplate = (deviceId, action, args, isDangerous = false) => {
    const dangerous = isDangerous || isCommandDangerous(action, args);

    if (!canExecuteCommand || !canExecuteCommand(dangerous)) {
      return;
    }

    if (!dangerous && expertMode) {
      if (refreshArmed) refreshArmed();
      if (sendCommand) {
        sendCommand(deviceId, action, args);
      }
      return;
    }

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

    if (!canExecuteCommand || !canExecuteCommand(dangerous)) {
      return;
    }

    if (!dangerous && expertMode) {
      if (refreshArmed) refreshArmed();
      sendGenericCommand();
      return;
    }

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

  return (
    <main className="commandsViewMain">
      {/* Authority Control Header */}
      <div className="commandsViewHeader">
        <div className="commandsViewHeaderRow">
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
                <strong>SAFE MODE</strong> — All commands require preview. Dangerous operations blocked.
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

      <div className="view-grid view-grid--commands">
        {/* Device Selection */}
        <section className="card controls commands-device-selection">
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
        </section>

        {/* Command Center */}
        <section className="card feed commands-command-center">
          <h2>⚡ Command Center</h2>

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
                  Device should ack on <span className="mono">pulsar/&lt;device&gt;/ack/&lt;action&gt;</span>
                </div>
              </label>

              <div className="row">
                <button
                  type="button"
                  className="secondary"
                  onClick={handleSendGenericCommand}
                  disabled={!selectedDevice || authorityLevel === "view"}
                >
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

          {/* Command Queue */}
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

        {/* Command Templates */}
        <section className="card controls commands-templates">
          <CommandTemplates
            onExecuteTemplate={handleExecuteTemplate}
            selectedDevice={selectedDevice}
            authorityLevel={authorityLevel}
            collapsed={templatesCollapsed}
            onToggleCollapse={() => setTemplatesCollapsed((v) => !v)}
          />
        </section>
      </div>
    </main>
  );
}
