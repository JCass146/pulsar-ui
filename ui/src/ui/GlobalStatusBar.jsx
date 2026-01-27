/**
 * GlobalStatusBar.jsx
 *
 * Top-level system status bar showing MQTT connection state,
 * fleet health summary, armed state, mode, and active inhibits.
 *
 * Part of Milestone 2.1 - Global System Status Bar
 * Enhanced in Milestone 3.3 - Authority indicator
 */
import React, { useMemo } from "react";
import { AuthorityBadge, AUTHORITY_LEVELS } from "./AuthorityControl.jsx";

/**
 * Compute derived fleet statistics from device list.
 */
function computeFleetStats(deviceList, devicesRef) {
  const stats = {
    total: deviceList.length,
    online: 0,
    stale: 0,
    offline: 0,
    pending: 0,
    faults: 0,
    armed: 0,
    inhibited: 0,
  };

  for (const d of deviceList) {
    if (d.online && !d.stale) stats.online++;
    else if (d.online && d.stale) stats.stale++;
    else stats.offline++;

    if (d.pending > 0) stats.pending++;

    // Check device state for faults, armed, inhibits
    const dev = devicesRef.current.get(d.id);
    if (dev) {
      const stateMap = dev.state;
      if (stateMap instanceof Map) {
        // Faults
        const faults = stateMap.get("faults") || stateMap.get("errors");
        if (faults && Array.isArray(faults) && faults.length > 0) {
          stats.faults++;
        }

        // Armed state
        const armed = stateMap.get("armed");
        if (armed === true || armed === 1 || armed === "armed") {
          stats.armed++;
        }

        // Inhibits
        const inhibits = stateMap.get("inhibits") || stateMap.get("inhibit");
        if (inhibits && (Array.isArray(inhibits) ? inhibits.length > 0 : inhibits === true)) {
          stats.inhibited++;
        }
      }
    }
  }

  return stats;
}

/**
 * Determine overall system health level.
 */
function computeSystemHealth(stats, mqttStatus) {
  // MQTT not connected = critical
  if (mqttStatus !== "connected") return "critical";

  // Any faults = critical
  if (stats.faults > 0) return "critical";

  // All offline = critical
  if (stats.total > 0 && stats.online === 0) return "critical";

  // Any inhibited = warning
  if (stats.inhibited > 0) return "warn";

  // Any stale = warning
  if (stats.stale > 0) return "warn";

  // Pending commands = info
  if (stats.pending > 0) return "info";

  return "ok";
}

/**
 * MQTT status indicator component.
 */
function MqttStatusIndicator({ status, url }) {
  const statusText = status || "idle";
  const statusClass = statusText === "connected" ? "ok" :
    statusText === "reconnecting" ? "warn" :
    statusText === "error" ? "critical" : "neutral";

  return (
    <div className={`gsbMqttStatus ${statusClass}`}>
      <span className="gsbMqttIcon">
        {statusClass === "ok" ? "●" : statusClass === "warn" ? "◐" : "○"}
      </span>
      <span className="gsbMqttText">{statusText}</span>
      {url && <span className="gsbMqttUrl mono muted">{url}</span>}
    </div>
  );
}

/**
 * Fleet count badges component.
 */
function FleetCountBadges({ stats }) {
  return (
    <div className="gsbFleetCounts">
      <div className={`gsbCountBadge ${stats.online > 0 ? "ok" : "neutral"}`}>
        <span className="gsbCountNum">{stats.online}</span>
        <span className="gsbCountLabel">online</span>
      </div>

      {stats.stale > 0 && (
        <div className="gsbCountBadge warn">
          <span className="gsbCountNum">{stats.stale}</span>
          <span className="gsbCountLabel">stale</span>
        </div>
      )}

      {stats.offline > 0 && (
        <div className="gsbCountBadge bad">
          <span className="gsbCountNum">{stats.offline}</span>
          <span className="gsbCountLabel">offline</span>
        </div>
      )}

      {stats.pending > 0 && (
        <div className="gsbCountBadge info">
          <span className="gsbCountNum">{stats.pending}</span>
          <span className="gsbCountLabel">pending</span>
        </div>
      )}
    </div>
  );
}

/**
 * System mode/state indicators component.
 */
function SystemStateIndicators({ stats }) {
  return (
    <div className="gsbStateIndicators">
      {/* Armed indicator */}
      {stats.armed > 0 && (
        <div className="gsbStateChip armed">
          <span className="gsbStateIcon">⚡</span>
          <span className="gsbStateText">ARMED</span>
          <span className="gsbStateCount">{stats.armed}</span>
        </div>
      )}

      {/* Faults indicator */}
      {stats.faults > 0 && (
        <div className="gsbStateChip fault">
          <span className="gsbStateIcon">✕</span>
          <span className="gsbStateText">FAULTS</span>
          <span className="gsbStateCount">{stats.faults}</span>
        </div>
      )}

      {/* Inhibits indicator */}
      {stats.inhibited > 0 && (
        <div className="gsbStateChip inhibit">
          <span className="gsbStateIcon">⊘</span>
          <span className="gsbStateText">INHIBIT</span>
          <span className="gsbStateCount">{stats.inhibited}</span>
        </div>
      )}
    </div>
  );
}

/**
 * GlobalStatusBar - Main component
 */
export default function GlobalStatusBar({
  mqttStatus,
  mqttUrl,
  deviceList,
  devicesRef,
  paused,
  onTogglePause,
  // Milestone 3.3: Authority control (optional)
  authorityLevel,
  onAuthorityClick,
  armedExpiresAt,
}) {
  // Compute fleet statistics
  const stats = useMemo(() => {
    return computeFleetStats(deviceList, devicesRef);
  }, [deviceList, devicesRef]);

  // Determine system health
  const health = useMemo(() => {
    return computeSystemHealth(stats, mqttStatus);
  }, [stats, mqttStatus]);

  return (
    <div className={`globalStatusBar ${health}`}>
      {/* Left: MQTT Status */}
      <div className="gsbSection gsbLeft">
        <MqttStatusIndicator status={mqttStatus} url={mqttUrl} />
      </div>

      {/* Center: Fleet Counts */}
      <div className="gsbSection gsbCenter">
        <FleetCountBadges stats={stats} />
        <SystemStateIndicators stats={stats} />
      </div>

      {/* Right: Controls */}
      <div className="gsbSection gsbRight">
        {/* Authority badge (M3.3) - shown when on non-Control tabs */}
        {authorityLevel && (
          <div className="gsbAuthorityWrapper">
            <AuthorityBadge level={authorityLevel} onClick={onAuthorityClick} />
            {authorityLevel === "armed" && armedExpiresAt && (
              <span className="gsbArmedTimer">
                {Math.max(0, Math.ceil((armedExpiresAt - Date.now()) / 1000))}s
              </span>
            )}
          </div>
        )}

        {/* Pause/Resume button */}
        <button
          className={`gsbPauseBtn ${paused ? "paused" : ""}`}
          onClick={onTogglePause}
          title={paused ? "Resume data ingestion" : "Pause data ingestion"}
          type="button"
        >
          {paused ? "▶ RESUME" : "⏸ LIVE"}
        </button>

        {/* System health indicator */}
        <div className={`gsbHealthIndicator ${health}`}>
          <span className="gsbHealthIcon">
            {health === "ok" ? "●" :
              health === "info" ? "◐" :
              health === "warn" ? "◐" : "○"}
          </span>
          <span className="gsbHealthText">
            {health === "ok" ? "HEALTHY" :
              health === "info" ? "ACTIVE" :
              health === "warn" ? "WARNING" : "CRITICAL"}
          </span>
        </div>
      </div>
    </div>
  );
}
