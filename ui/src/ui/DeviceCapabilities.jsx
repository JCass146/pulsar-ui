/**
 * DeviceCapabilities.jsx - Step 13
 *
 * Device Capabilities Panel
 * Shows supported commands/features inferred from device state and meta
 */

import React, { useMemo } from "react";
import { getDeviceRole } from "../services/device-registry.js";

function DeviceCapabilities({
  selectedDevice,
  devicesRef,
  deviceTick,
}) {
  const device = selectedDevice ? devicesRef.current.get(selectedDevice) : null;

  const capabilities = useMemo(() => {
    if (!device) return null;

    const caps = {
      role: getDeviceRole(selectedDevice),
      commands: new Set(),
      features: new Set(),
      sensors: new Set(),
      actuators: new Set(),
    };

    // Infer from state topics
    if (device.state) {
      for (const [key, value] of device.state.entries()) {
        if (key.includes('relay')) {
          caps.actuators.add('relays');
          caps.commands.add('relay.set');
          caps.commands.add('relay.all_off');
        }
        if (key.includes('calibration')) {
          caps.features.add('calibration');
          caps.commands.add('calibration.apply');
          caps.commands.add('calibration.dry_run');
        }
        if (key.includes('pressure') || key.includes('temp') || key.includes('humidity')) {
          caps.sensors.add(key.split('.')[0]);
        }
        if (key.includes('firmware')) {
          caps.features.add('firmware_update');
          caps.commands.add('firmware.update');
        }
      }
    }

    // Infer from meta topics
    if (device.meta) {
      for (const [key, value] of device.meta.entries()) {
        if (key.includes('capabilities') || key.includes('features')) {
          // Parse meta capabilities if available
          try {
            const metaCaps = typeof value === 'string' ? JSON.parse(value) : value;
            if (metaCaps.commands) {
              metaCaps.commands.forEach(cmd => caps.commands.add(cmd));
            }
            if (metaCaps.features) {
              metaCaps.features.forEach(feature => caps.features.add(feature));
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    // Infer from observed command acks
    if (device.commandHistory) {
      device.commandHistory.forEach(cmd => {
        if (cmd.status === 'acked') {
          caps.commands.add(cmd.action);
        }
      });
    }

    // Convert sets to arrays for display
    caps.commands = Array.from(caps.commands).sort();
    caps.features = Array.from(caps.features).sort();
    caps.sensors = Array.from(caps.sensors).sort();
    caps.actuators = Array.from(caps.actuators).sort();

    return caps;
  }, [device, selectedDevice, deviceTick]);

  if (!selectedDevice) {
    return (
      <div className="deviceCapabilities">
        <div className="deviceCapabilitiesEmpty">
          Select a device to view capabilities
        </div>
      </div>
    );
  }

  if (!capabilities) {
    return (
      <div className="deviceCapabilities">
        <div className="deviceCapabilitiesEmpty">
          <div className="deviceCapabilitiesIcon">🔍</div>
          <div className="deviceCapabilitiesText">
            Capabilities: Unknown
          </div>
          <div className="deviceCapabilitiesHint">
            Subscribe to meta/status topics to see device capabilities
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="deviceCapabilities">
      <div className="deviceCapabilitiesHeader">
        <div className="deviceCapabilitiesTitle">Device Capabilities</div>
        <div className="deviceCapabilitiesRole">{capabilities.role}</div>
      </div>

      {capabilities.commands.length > 0 && (
        <div className="deviceCapabilitiesSection">
          <div className="deviceCapabilitiesSectionTitle">Supported Commands</div>
          <div className="deviceCapabilitiesList">
            {capabilities.commands.map(cmd => (
              <span key={cmd} className="deviceCapabilitiesItem command">
                {cmd}
              </span>
            ))}
          </div>
        </div>
      )}

      {capabilities.features.length > 0 && (
        <div className="deviceCapabilitiesSection">
          <div className="deviceCapabilitiesSectionTitle">Features</div>
          <div className="deviceCapabilitiesList">
            {capabilities.features.map(feature => (
              <span key={feature} className="deviceCapabilitiesItem feature">
                {feature.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {(capabilities.sensors.length > 0 || capabilities.actuators.length > 0) && (
        <div className="deviceCapabilitiesSection">
          <div className="deviceCapabilitiesSectionTitle">Hardware</div>
          <div className="deviceCapabilitiesList">
            {capabilities.sensors.map(sensor => (
              <span key={sensor} className="deviceCapabilitiesItem sensor">
                📊 {sensor}
              </span>
            ))}
            {capabilities.actuators.map(actuator => (
              <span key={actuator} className="deviceCapabilitiesItem actuator">
                ⚙️ {actuator}
              </span>
            ))}
          </div>
        </div>
      )}

      {capabilities.commands.length === 0 &&
       capabilities.features.length === 0 &&
       capabilities.sensors.length === 0 &&
       capabilities.actuators.length === 0 && (
        <div className="deviceCapabilitiesEmpty">
          <div className="deviceCapabilitiesIcon">🔍</div>
          <div className="deviceCapabilitiesText">
            Capabilities: Unknown
          </div>
          <div className="deviceCapabilitiesHint">
            Subscribe to meta/status topics to see device capabilities
          </div>
        </div>
      )}
    </div>
  );
}

export default DeviceCapabilities;