/**
 * StatusBar.jsx
 * Horizontal status bar showing connection, fleet stats, and controls
 */
import React, { useMemo } from 'react';
import ThemeToggle from './ThemeToggle.jsx';
import './StatusBar.css';

function computeFleetStats(deviceList) {
  const stats = {
    online: 0,
    stale: 0,
    offline: 0,
  };

  for (const d of deviceList) {
    if (d.online && !d.stale) stats.online++;
    else if (d.online && d.stale) stats.stale++;
    else stats.offline++;
  }

  return stats;
}

function computeSystemHealth(stats, mqttStatus, deviceCount) {
  if (mqttStatus !== 'connected') return 'critical';
  if (stats.online === 0 && deviceCount > 0) return 'critical';
  if (stats.stale > 0) return 'warn';
  return 'ok';
}

export function StatusBar({
  mqttStatus,
  mqttUrl,
  deviceList = [],
  paused,
  onTogglePause,
}) {
  const stats = useMemo(() => computeFleetStats(deviceList), [deviceList]);
  const health = useMemo(() => computeSystemHealth(stats, mqttStatus, deviceList.length), [stats, mqttStatus, deviceList.length]);

  const statusClass = mqttStatus === 'connected' ? 'ok' :
    mqttStatus === 'reconnecting' ? 'warn' : 'critical';

  return (
    <header className="status-bar">
      {/* Connection Status */}
      <div className={`status-bar__connection ${statusClass}`}>
        <span className="status-bar__dot">●</span>
        <span className="status-bar__status-text">{mqttStatus || 'idle'}</span>
        {mqttUrl && <span className="status-bar__url mono">{mqttUrl}</span>}
      </div>

      {/* Fleet Stats */}
      <div className="status-bar__fleet">
        <span className={`status-bar__stat ${stats.online > 0 ? 'ok' : 'neutral'}`}>
          {stats.online}↑
        </span>
        {stats.stale > 0 && (
          <span className="status-bar__stat warn">
            {stats.stale}⚙
          </span>
        )}
        {stats.offline > 0 && (
          <span className="status-bar__stat bad">
            {stats.offline}↓
          </span>
        )}
      </div>

      {/* System Health */}
      <div className={`status-bar__health ${health}`}>
        <span className="status-bar__health-dot">●</span>
        <span className="status-bar__health-text">
          {health === 'ok' ? 'HEALTHY' : health === 'warn' ? 'WARNING' : 'CRITICAL'}
        </span>
      </div>

      {/* Controls */}
      <div className="status-bar__controls">
        <button
          className={`status-bar__pause ${paused ? 'paused' : ''}`}
          onClick={onTogglePause}
          title={paused ? 'Resume data ingestion' : 'Pause data ingestion'}
        >
          {paused ? '▶ RESUME' : '⏸ LIVE'}
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}

export default StatusBar;
