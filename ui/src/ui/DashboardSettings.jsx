/**
 * DashboardSettings.jsx
 * Settings modal for dashboard configuration
 */
import React from 'react';
import './DashboardSettings.css';

export function DashboardSettings({
  isOpen,
  onClose,
  watchedText,
  setWatchedText,
  showOnlyOnline,
  setShowOnlyOnline,
  maxPoints,
  setMaxPoints,
  onApply,
}) {
  if (!isOpen) return null;

  return (
    <div className="dashboard-settings-overlay" onClick={onClose}>
      <div className="dashboard-settings" onClick={(e) => e.stopPropagation()}>
        <div className="dashboard-settings__header">
          <h3>Dashboard Settings</h3>
          <button className="dashboard-settings__close" onClick={onClose}>×</button>
        </div>

        <div className="dashboard-settings__body">
          <div className="form">
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
              <div className="hint">
                Number of data points to keep in memory for charts.
              </div>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showOnlyOnline}
                onChange={(e) => setShowOnlyOnline(e.target.checked)}
              />
              <span>Show only online devices</span>
            </label>
          </div>
        </div>

        <div className="dashboard-settings__footer">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={() => { onApply(); onClose(); }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default DashboardSettings;
