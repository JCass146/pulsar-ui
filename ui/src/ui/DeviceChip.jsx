/**
 * DeviceChip.jsx
 *
 * Reusable component showing device identity with:
 * - Friendly name (if exists)
 * - Short device ID (e.g., 743B…CBB0)
 * - Health dot
 * - Optional role/tag
 *
 * Mandatory Usage:
 * - Every chart header
 * - Every pinned metric
 * - Control target selector
 * - Device details panel
 *
 * Rule: No metric or chart may exist without a visible device source.
 */
import React from "react";
import {
  computeDeviceHealth,
  getHealthConfig,
  getDeviceFriendlyName,
  formatShortDeviceId,
  formatLastSeen,
  HEALTH_STATES,
} from "../utils/health.js";
import { getDeviceRole } from "../services/device-registry.js";

/**
 * Size variants for the chip
 */
const SIZES = {
  small: {
    fontSize: "11px",
    padding: "3px 8px",
    gap: "5px",
    dotSize: "7px",
  },
  medium: {
    fontSize: "12px",
    padding: "4px 10px",
    gap: "6px",
    dotSize: "8px",
  },
  large: {
    fontSize: "13px",
    padding: "6px 12px",
    gap: "8px",
    dotSize: "10px",
  },
};

/**
 * DeviceChip - Displays device identity with health status
 *
 * @param {object} props
 * @param {object} props.device - Device object (from deviceList or devicesRef)
 * @param {string} props.deviceId - Device ID (used if device object not provided)
 * @param {object} props.devicesRef - Ref to devices Map for full lookup
 * @param {string} props.size - "small" | "medium" | "large" (default: "medium")
 * @param {boolean} props.showRole - Whether to show device role/tag
 * @param {boolean} props.showLastSeen - Whether to show last seen time
 * @param {boolean} props.clickable - Whether chip is clickable
 * @param {function} props.onClick - Click handler (receives deviceId)
 * @param {boolean} props.selected - Whether chip is selected/active
 * @param {boolean} props.compact - Use minimal display (health dot + short ID only)
 * @param {string} props.className - Additional CSS classes
 */
export default function DeviceChip({
  device,
  deviceId,
  devicesRef,
  size = "medium",
  showRole = false,
  showLastSeen = false,
  clickable = false,
  onClick,
  selected = false,
  compact = false,
  className = "",
}) {
  // Resolve device object
  let resolvedDevice = device;
  const id = device?.id || deviceId;

  if (!resolvedDevice && id && devicesRef?.current) {
    resolvedDevice = devicesRef.current.get(id);
  }

  // If we still don't have a device, create a minimal one from deviceId
  if (!resolvedDevice && id) {
    resolvedDevice = { id, online: false, stale: true, lastSeenMs: 0 };
  }

  if (!resolvedDevice || !id) {
    return (
      <span className={`deviceChip deviceChip--unknown ${className}`}>
        <span className="deviceChip__dot deviceChip__dot--unknown">◌</span>
        <span className="deviceChip__id mono">—</span>
      </span>
    );
  }

  // Compute health
  const health = computeDeviceHealth(resolvedDevice);
  const healthConfig = getHealthConfig(resolvedDevice);

  // Get friendly name and short ID
  const friendlyName = getDeviceFriendlyName(resolvedDevice, devicesRef);
  const shortId = formatShortDeviceId(id);

  // Get role
  const role = showRole ? getDeviceRole(resolvedDevice) : null;
  const displayRole = role && role !== "unknown" ? role : null;

  // Get last seen
  const lastSeen = showLastSeen ? formatLastSeen(resolvedDevice.lastSeenMs) : null;

  // Size styles
  const sizeConfig = SIZES[size] || SIZES.medium;

  // Build chip content
  const chipStyle = {
    "--chip-font-size": sizeConfig.fontSize,
    "--chip-padding": sizeConfig.padding,
    "--chip-gap": sizeConfig.gap,
    "--chip-dot-size": sizeConfig.dotSize,
    "--chip-color": healthConfig.color,
    "--chip-bg": healthConfig.bgColor,
    "--chip-border": healthConfig.borderColor,
  };

  const chipClasses = [
    "deviceChip",
    `deviceChip--${health}`,
    `deviceChip--${size}`,
    clickable && "deviceChip--clickable",
    selected && "deviceChip--selected",
    compact && "deviceChip--compact",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleClick = () => {
    if (clickable && onClick) {
      onClick(id);
    }
  };

  // Title for tooltip
  const tooltip = [
    friendlyName || id,
    `Status: ${healthConfig.label}`,
    lastSeen && `Last seen: ${lastSeen}`,
    displayRole && `Role: ${displayRole}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (compact) {
    return (
      <span
        className={chipClasses}
        style={chipStyle}
        title={tooltip}
        onClick={handleClick}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
      >
        <span className={`deviceChip__dot deviceChip__dot--${health}`}>
          {healthConfig.icon}
        </span>
        <span className="deviceChip__id mono">{shortId}</span>
      </span>
    );
  }

  return (
    <span
      className={chipClasses}
      style={chipStyle}
      title={tooltip}
      onClick={handleClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <span className={`deviceChip__dot deviceChip__dot--${health}`}>
        {healthConfig.icon}
      </span>

      <span className="deviceChip__identity">
        {friendlyName ? (
          <>
            <span className="deviceChip__name">{friendlyName}</span>
            <span className="deviceChip__id mono muted">{shortId}</span>
          </>
        ) : (
          <span className="deviceChip__id mono">{shortId}</span>
        )}
      </span>

      {displayRole && (
        <span className="deviceChip__role">{displayRole}</span>
      )}

      {lastSeen && (
        <span className="deviceChip__lastSeen muted">{lastSeen}</span>
      )}
    </span>
  );
}

/**
 * DeviceChipGroup - Multiple device chips in a row/grid
 */
export function DeviceChipGroup({
  devices,
  devicesRef,
  selectedDevice,
  onSelect,
  size = "small",
  showRole = false,
  maxDisplay = 8,
  className = "",
}) {
  if (!devices || !devices.length) {
    return (
      <div className={`deviceChipGroup ${className}`}>
        <span className="muted">No devices</span>
      </div>
    );
  }

  const displayDevices = devices.slice(0, maxDisplay);
  const remaining = devices.length - maxDisplay;

  return (
    <div className={`deviceChipGroup ${className}`}>
      {displayDevices.map((d) => (
        <DeviceChip
          key={d.id || d}
          device={typeof d === "string" ? null : d}
          deviceId={typeof d === "string" ? d : d.id}
          devicesRef={devicesRef}
          size={size}
          showRole={showRole}
          clickable={!!onSelect}
          onClick={onSelect}
          selected={selectedDevice === (d.id || d)}
        />
      ))}
      {remaining > 0 && (
        <span className="deviceChipGroup__more muted">+{remaining} more</span>
      )}
    </div>
  );
}

/**
 * DeviceChipLegend - Legend for multi-device charts
 */
export function DeviceChipLegend({
  seriesKeys,
  devicesRef,
  size = "small",
  className = "",
}) {
  if (!seriesKeys || !seriesKeys.length) return null;

  // Extract unique device IDs from series keys (format: "deviceId:field")
  const deviceIds = [...new Set(seriesKeys.map((key) => {
    const colonIdx = key.indexOf(":");
    return colonIdx > 0 ? key.slice(0, colonIdx) : key;
  }))];

  if (deviceIds.length <= 1) {
    // Single device - show as chip
    return (
      <div className={`deviceChipLegend ${className}`}>
        <DeviceChip
          deviceId={deviceIds[0]}
          devicesRef={devicesRef}
          size={size}
          compact
        />
      </div>
    );
  }

  // Multiple devices - show all
  return (
    <div className={`deviceChipLegend ${className}`}>
      {deviceIds.map((id) => (
        <DeviceChip
          key={id}
          deviceId={id}
          devicesRef={devicesRef}
          size={size}
          compact
        />
      ))}
    </div>
  );
}
