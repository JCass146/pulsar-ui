/**
 * ChartSettingsModal.jsx - Settings modal for chart display options
 *
 * Provides controls for:
 * - Time window (15s, 30s, 60s, 300s, 600s)
 * - Y-axis autoscale toggle
 * - Pause/resume chart updates
 */
import React from "react";

export default function ChartSettingsModal({
  isOpen,
  onClose,
  windowSec,
  onWindowChange,
  yAxisAuto,
  onYAxisAutoChange,
  isPaused,
  onPausedChange,
}) {
  if (!isOpen) return null;

  const windowOptions = [15, 30, 60, 300, 600];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Chart Settings</h2>
          <button
            className="modal-close"
            onClick={onClose}
            title="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <section className="form">
            <label>
              <span>Time Window</span>
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                {windowOptions.map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={windowSec === w ? "primary" : "secondary"}
                    onClick={() => onWindowChange(w)}
                    style={{ padding: "6px 12px", fontSize: "0.9em" }}
                  >
                    {w < 60 ? `${w}s` : `${w / 60}m`}
                  </button>
                ))}
              </div>
              <div className="hint">Adjust how much history is visible in the chart.</div>
            </label>

            <label style={{ marginTop: 16 }}>
              <input
                type="checkbox"
                checked={yAxisAuto}
                onChange={(e) => onYAxisAutoChange(e.target.checked)}
              />
              <span>Auto Y-axis scale</span>
              <div className="hint">When enabled, Y-axis adjusts automatically to fit data.</div>
            </label>

            <label style={{ marginTop: 16 }}>
              <input
                type="checkbox"
                checked={isPaused}
                onChange={(e) => onPausedChange(e.target.checked)}
              />
              <span>{isPaused ? "Resume" : "Pause"} updates</span>
              <div className="hint">Freeze the current chart to inspect it without new updates.</div>
            </label>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
