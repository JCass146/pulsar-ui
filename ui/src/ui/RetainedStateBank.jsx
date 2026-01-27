/**
 * RetainedStateBank.jsx
 *
 * Always-visible retained state display showing relay states
 * and key state/* values with aggregated fleet health view.
 *
 * Part of Milestone 1.2 - Retained State Bank
 */
import React, { useMemo, useCallback } from "react";

/**
 * Convert various truthy/falsy representations to boolean.
 */
function toBoolish(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    if (["1", "true", "on", "yes", "armed", "active", "open"].includes(s)) return true;
    if (["0", "false", "off", "no", "disarmed", "inactive", "closed"].includes(s)) return false;
  }
  return null;
}

/**
 * Determine color class based on state.
 */
function stateToTone(state, invert = false) {
  if (state === null || state === undefined) return "unknown";
  const b = toBoolish(state);
  if (b === null) return "unknown";
  return invert ? (b ? "bad" : "ok") : (b ? "ok" : "off");
}

/**
 * Extract relay states from a device's retained state/telemetry.
 */
function extractRelayStates(dev, latest) {
  const relays = [];

  // 1) Check retained state for relays
  const stateMap = dev?.state;
  if (stateMap instanceof Map) {
    // state/relays or state/relay
    const relObj = stateMap.get("relays") || stateMap.get("relay") || stateMap.get("outputs");
    if (relObj && typeof relObj === "object") {
      for (const [k, v] of Object.entries(relObj)) {
        relays.push({ key: `relay_${k}`, value: v, source: "retained" });
      }
    }
  }

  // 2) Fallback to latest telemetry fields
  if (relays.length === 0 && latest) {
    const fields = latest.fields || latest;
    if (fields && typeof fields === "object") {
      for (const [k, v] of Object.entries(fields)) {
        if (/^relay[_]?\d+/i.test(k)) {
          relays.push({ key: k, value: v, source: "telemetry" });
        }
      }
    }
  }

  return relays.slice(0, 8);
}

/**
 * Extract key state values (non-relay retained state).
 */
function extractKeyStates(dev) {
  const states = [];
  const stateMap = dev?.state;

  if (!(stateMap instanceof Map)) return states;

  // Skip relay-related keys
  const skipKeys = new Set(["relays", "relay", "outputs", "calibration"]);

  for (const [k, v] of stateMap) {
    if (skipKeys.has(k)) continue;
    if (typeof v === "object" && v !== null) {
      // Flatten one level for nested objects
      for (const [subK, subV] of Object.entries(v)) {
        if (typeof subV !== "object") {
          states.push({ key: `${k}.${subK}`, value: subV });
        }
      }
    } else {
      states.push({ key: k, value: v });
    }
  }

  return states.slice(0, 12);
}

/**
 * Compute fleet-wide aggregated state counts.
 */
function computeFleetAggregation(deviceList, devicesRef, latestRef) {
  const agg = {
    total: deviceList.length,
    online: 0,
    stale: 0,
    offline: 0,
    relaysOn: 0,
    relaysOff: 0,
    relaysUnknown: 0,
    faults: 0,
  };

  for (const d of deviceList) {
    if (d.online && !d.stale) agg.online++;
    else if (d.online && d.stale) agg.stale++;
    else agg.offline++;

    const dev = devicesRef.current.get(d.id);
    const latest = latestRef.current.get(d.id);
    const relays = extractRelayStates(dev, latest);

    for (const r of relays) {
      const b = toBoolish(r.value);
      if (b === true) agg.relaysOn++;
      else if (b === false) agg.relaysOff++;
      else agg.relaysUnknown++;
    }

    // Check for faults in state
    const stateMap = dev?.state;
    if (stateMap instanceof Map) {
      const faults = stateMap.get("faults") || stateMap.get("errors");
      if (faults && Array.isArray(faults) && faults.length > 0) {
        agg.faults++;
      }
    }
  }

  return agg;
}


/**
 * Single relay button with click-to-toggle.
 */
function RelayButton({ deviceId, relayKey, value, onToggle, disabled }) {
  const b = toBoolish(value);
  const tone = b === true ? "on" : b === false ? "off" : "unknown";
  const label = relayKey.replace(/^relay[_]?/i, "R");

  return (
    <button
      className={`relayBtn ${tone}`}
      onClick={() => onToggle(deviceId, relayKey, !b)}
      disabled={disabled}
      title={`${relayKey}: ${b === true ? "ON" : b === false ? "OFF" : "UNKNOWN"} — Click to toggle`}
      type="button"
    >
      <span className="relayLabel">{label}</span>
      <span className="relayState">{b === true ? "ON" : b === false ? "OFF" : "?"}</span>
    </button>
  );
}


/**
 * Fleet aggregation summary bar.
 */
function FleetSummaryBar({ agg }) {
  return (
    <div className="fleetSummaryBar">
      <div className="fleetStat">
        <span className="fleetStatValue">{agg.online}</span>
        <span className="fleetStatLabel ok">online</span>
      </div>
      <div className="fleetStat">
        <span className="fleetStatValue">{agg.stale}</span>
        <span className="fleetStatLabel warn">stale</span>
      </div>
      <div className="fleetStat">
        <span className="fleetStatValue">{agg.offline}</span>
        <span className="fleetStatLabel bad">offline</span>
      </div>
      <div className="fleetStatDivider" />
      <div className="fleetStat">
        <span className="fleetStatValue">{agg.relaysOn}</span>
        <span className="fleetStatLabel on">relays on</span>
      </div>
      <div className="fleetStat">
        <span className="fleetStatValue">{agg.relaysOff}</span>
        <span className="fleetStatLabel off">relays off</span>
      </div>
      {agg.faults > 0 && (
        <div className="fleetStat fault">
          <span className="fleetStatValue">{agg.faults}</span>
          <span className="fleetStatLabel">faults</span>
        </div>
      )}
    </div>
  );
}


/**
 * RetainedStateBank - Main component
 */
export default function RetainedStateBank({
  devicesRef,
  latestRef,
  deviceList,
  selectedDevice,
  onSendCommand,
  broadcastCommand,
}) {
  // Compute fleet aggregation
  const fleetAgg = useMemo(() => {
    return computeFleetAggregation(deviceList, devicesRef, latestRef);
  }, [deviceList, devicesRef, latestRef]);

  // Get selected device's relay and state info
  const selectedDeviceData = useMemo(() => {
    if (!selectedDevice) return null;

    const dev = devicesRef.current.get(selectedDevice);
    const latest = latestRef.current.get(selectedDevice);
    if (!dev) return null;

    return {
      relays: extractRelayStates(dev, latest),
      keyStates: extractKeyStates(dev),
      device: dev,
    };
  }, [selectedDevice, devicesRef, latestRef]);

  // Handle relay toggle command
  const handleRelayToggle = useCallback((deviceId, relayKey, newState) => {
    if (!onSendCommand) return;

    // Extract relay number from key (e.g., "relay_1" -> 1)
    const match = relayKey.match(/(\d+)/);
    const relayNum = match ? parseInt(match[1], 10) : 1;

    onSendCommand(deviceId, "relay.set", {
      relay: relayNum,
      state: newState ? 1 : 0,
    });
  }, [onSendCommand]);

  // Handle broadcast all-off
  const handleAllOff = useCallback(() => {
    if (!broadcastCommand) return;

    // This broadcasts to all online devices
    broadcastCommand("relay.set", { relay: "all", state: 0 });
  }, [broadcastCommand]);

  return (
    <section className="retainedStateBank card controls">
      <div className="rsbHeader">
        <h2>Retained State</h2>
        <button
          className="allOffBtn danger"
          onClick={handleAllOff}
          title="Send all-off to all online devices (requires confirmation)"
          type="button"
        >
          ALL OFF
        </button>
      </div>

      {/* Fleet-wide summary */}
      <FleetSummaryBar agg={fleetAgg} />

      {/* Selected device detailed view */}
      {selectedDevice && selectedDeviceData ? (
        <div className="rsbDeviceDetail">
          <div className="rsbDeviceHeader">
            <span className="mono">{selectedDevice}</span>
            <span className="rsbDeviceStatus">
              {selectedDeviceData.device?.online
                ? selectedDeviceData.device?.stale
                  ? "STALE"
                  : "LIVE"
                : "OFFLINE"}
            </span>
          </div>

          {/* Relay buttons */}
          {selectedDeviceData.relays.length > 0 && (
            <div className="rsbRelayGrid">
              {selectedDeviceData.relays.map((r) => (
                <RelayButton
                  key={r.key}
                  deviceId={selectedDevice}
                  relayKey={r.key}
                  value={r.value}
                  onToggle={handleRelayToggle}
                  disabled={!selectedDeviceData.device?.online}
                />
              ))}
            </div>
          )}

          {/* Key state values */}
          {selectedDeviceData.keyStates.length > 0 && (
            <div className="rsbKeyStates">
              {selectedDeviceData.keyStates.map((s) => {
                const tone = stateToTone(s.value);
                return (
                  <div key={s.key} className={`rsbStateItem ${tone}`}>
                    <span className="rsbStateKey mono">{s.key}</span>
                    <span className="rsbStateValue mono">
                      {typeof s.value === "boolean"
                        ? s.value
                          ? "TRUE"
                          : "FALSE"
                        : String(s.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {selectedDeviceData.relays.length === 0 &&
            selectedDeviceData.keyStates.length === 0 && (
              <div className="muted" style={{ padding: "10px 0" }}>
                No retained state available for this device.
              </div>
            )}
        </div>
      ) : (
        <div className="muted" style={{ padding: "10px 0" }}>
          Select a device to see detailed retained state.
        </div>
      )}
    </section>
  );
}
