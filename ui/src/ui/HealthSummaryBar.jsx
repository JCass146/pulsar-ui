/**
 * HealthSummaryBar.jsx
 *
 * Global health summary strip displayed at top of Dashboard and Raw tabs.
 * Shows fleet-wide health counts: Online, Stale, Offline, Alerts
 *
 * Clicking a number filters the Raw tab to that subset.
 */
import React, { useMemo, useCallback } from "react";
import {
  computeFleetHealthSummary,
  HEALTH_STATES,
  HEALTH_CONFIG,
} from "../utils/health.js";

/**
 * Single health stat display
 */
function HealthStat({ label, count, state, onClick, active }) {
  const config = HEALTH_CONFIG[state] || HEALTH_CONFIG[HEALTH_STATES.UNKNOWN];

  const style = {
    "--stat-color": config.color,
    "--stat-bg": config.bgColor,
    "--stat-border": config.borderColor,
  };

  return (
    <button
      type="button"
      className={`healthStat healthStat--${state} ${active ? "healthStat--active" : ""}`}
      style={style}
      onClick={() => onClick?.(state)}
      title={`${count} ${label.toLowerCase()} device${count !== 1 ? "s" : ""} - click to filter`}
    >
      <span className="healthStat__icon">{config.icon}</span>
      <span className="healthStat__count mono">{count}</span>
      <span className="healthStat__label">{label}</span>
    </button>
  );
}

/**
 * Alert badge for total issues
 */
function AlertBadge({ count, onClick, active }) {
  if (count === 0) return null;

  return (
    <button
      type="button"
      className={`healthAlertBadge ${active ? "healthAlertBadge--active" : ""}`}
      onClick={() => onClick?.("alerts")}
      title={`${count} alert${count !== 1 ? "s" : ""} (stale + offline) - click to filter`}
    >
      <span className="healthAlertBadge__icon">⚠</span>
      <span className="healthAlertBadge__count mono">{count}</span>
      <span className="healthAlertBadge__label">Alerts</span>
    </button>
  );
}

/**
 * HealthSummaryBar - Main component
 *
 * @param {object} props
 * @param {Array} props.deviceList - Array of device objects with online/stale props
 * @param {function} props.onFilterChange - Callback when filter is clicked (receives filter state)
 * @param {string} props.activeFilter - Currently active filter ("all", "healthy", "warning", "offline", "alerts")
 * @param {function} props.onNavigateToRaw - Callback to switch to Raw tab
 * @param {string} props.className - Additional CSS classes
 */
export default function HealthSummaryBar({
  deviceList,
  onFilterChange,
  activeFilter = "all",
  onNavigateToRaw,
  className = "",
}) {
  // Compute health summary
  const summary = useMemo(() => {
    return computeFleetHealthSummary(deviceList);
  }, [deviceList]);

  // Handle stat click - filters and optionally navigates to Raw
  const handleStatClick = useCallback(
    (filter) => {
      if (onFilterChange) {
        onFilterChange(filter);
      }
      if (onNavigateToRaw) {
        onNavigateToRaw();
      }
    },
    [onFilterChange, onNavigateToRaw]
  );

  // Handle "show all" click
  const handleShowAll = useCallback(() => {
    if (onFilterChange) {
      onFilterChange("all");
    }
  }, [onFilterChange]);

  return (
    <div className={`healthSummaryBar ${className}`}>
      <div className="healthSummaryBar__inner">
        {/* Fleet total */}
        <div className="healthSummaryBar__total">
          <span className="healthSummaryBar__totalLabel">Fleet:</span>
          <span className="healthSummaryBar__totalCount mono">{summary.total}</span>
        </div>

        {/* Divider */}
        <div className="healthSummaryBar__divider" />

        {/* Health stats */}
        <div className="healthSummaryBar__stats">
          <HealthStat
            label="Online"
            count={summary.healthy}
            state={HEALTH_STATES.HEALTHY}
            onClick={handleStatClick}
            active={activeFilter === HEALTH_STATES.HEALTHY}
          />
          <HealthStat
            label="Stale"
            count={summary.warning}
            state={HEALTH_STATES.WARNING}
            onClick={handleStatClick}
            active={activeFilter === HEALTH_STATES.WARNING}
          />
          <HealthStat
            label="Offline"
            count={summary.offline}
            state={HEALTH_STATES.OFFLINE}
            onClick={handleStatClick}
            active={activeFilter === HEALTH_STATES.OFFLINE}
          />
        </div>

        {/* Alerts badge (if any) */}
        <AlertBadge
          count={summary.alerts}
          onClick={handleStatClick}
          active={activeFilter === "alerts"}
        />

        {/* Clear filter button */}
        {activeFilter !== "all" && (
          <button
            type="button"
            className="healthSummaryBar__clearFilter"
            onClick={handleShowAll}
            title="Show all devices"
          >
            ✕ Clear filter
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact version for inline use (e.g., in cards)
 */
export function HealthSummaryCompact({ deviceList, className = "" }) {
  const summary = useMemo(() => {
    return computeFleetHealthSummary(deviceList);
  }, [deviceList]);

  return (
    <div className={`healthSummaryCompact ${className}`}>
      <span
        className="healthSummaryCompact__stat healthSummaryCompact__stat--healthy"
        title={`${summary.healthy} online`}
      >
        <span className="healthSummaryCompact__icon">●</span>
        <span className="mono">{summary.healthy}</span>
      </span>
      <span
        className="healthSummaryCompact__stat healthSummaryCompact__stat--warning"
        title={`${summary.warning} stale`}
      >
        <span className="healthSummaryCompact__icon">◐</span>
        <span className="mono">{summary.warning}</span>
      </span>
      <span
        className="healthSummaryCompact__stat healthSummaryCompact__stat--offline"
        title={`${summary.offline} offline`}
      >
        <span className="healthSummaryCompact__icon">○</span>
        <span className="mono">{summary.offline}</span>
      </span>
    </div>
  );
}
