/**
 * VirtualizedNotifications.jsx
 *
 * Upgraded notifications rail with category labels,
 * sticky last-fault tracking, and improved visibility.
 *
 * Part of Milestone 1.4 - Notifications Rail Upgrade
 */
import React, { useMemo, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

/**
 * Category definitions for notifications.
 */
const CATEGORIES = {
  bad: { label: "Errors", icon: "✕", priority: 1 },
  warn: { label: "Warnings", icon: "⚠", priority: 2 },
  ok: { label: "Success", icon: "✓", priority: 3 },
  info: { label: "Info", icon: "ℹ", priority: 4 },
};

/**
 * Format timestamp for display.
 */
function formatTime(ms) {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Format relative time.
 */
function formatRelativeTime(ms) {
  if (!ms) return "";
  const age = Date.now() - ms;
  if (age < 5000) return "just now";
  if (age < 60000) return `${Math.floor(age / 1000)}s ago`;
  if (age < 3600000) return `${Math.floor(age / 60000)}m ago`;
  return `${Math.floor(age / 3600000)}h ago`;
}

/**
 * Extract last fault per device from notifications.
 */
function extractLastFaults(notifItems) {
  const faults = new Map();

  for (const notif of notifItems) {
    if (notif.level !== "bad") continue;
    const deviceId = notif.deviceId || notif.title;
    if (!deviceId) continue;

    // Keep only the most recent fault per device
    if (!faults.has(deviceId) || faults.get(deviceId).t_ms < notif.t_ms) {
      faults.set(deviceId, notif);
    }
  }

  return Array.from(faults.values()).sort((a, b) => b.t_ms - a.t_ms);
}

/**
 * Sticky fault chip component.
 */
function StickyFaultChip({ fault, onDismiss }) {
  return (
    <div className="stickyFaultChip">
      <div className="stickyFaultContent">
        <span className="stickyFaultIcon">✕</span>
        <span className="stickyFaultDevice mono">{fault.deviceId || fault.title}</span>
        <span className="stickyFaultDetail">{fault.detail || "fault"}</span>
        <span className="stickyFaultTime muted">{formatRelativeTime(fault.t_ms)}</span>
      </div>
      {onDismiss && (
        <button
          className="stickyFaultDismiss"
          onClick={() => onDismiss(fault)}
          title="Acknowledge fault"
          type="button"
        >
          ACK
        </button>
      )}
    </div>
  );
}

/**
 * Category filter chips.
 */
function CategoryFilters({ activeCategories, onToggle, counts }) {
  return (
    <div className="notifCategoryFilters">
      {Object.entries(CATEGORIES).map(([key, cat]) => {
        const count = counts[key] || 0;
        const active = activeCategories.includes(key);
        return (
          <button
            key={key}
            className={`notifCategoryChip ${key} ${active ? "active" : ""}`}
            onClick={() => onToggle(key)}
            type="button"
            title={`${active ? "Hide" : "Show"} ${cat.label}`}
          >
            <span className="notifCategoryIcon">{cat.icon}</span>
            <span className="notifCategoryCount">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Main VirtualizedNotifications component.
 */
function VirtualizedNotifications({
  notifItems,
  clearNotifs,
  onAcknowledgeFault,
  showStickyFaults = true,
  maxHeight = 400,
}) {
  const [activeCategories, setActiveCategories] = useState(["bad", "warn", "ok", "info"]);
  const [acknowledgedFaults, setAcknowledgedFaults] = useState(new Set());

  // Count notifications by category
  const counts = useMemo(() => {
    const c = { bad: 0, warn: 0, ok: 0, info: 0 };
    for (const notif of notifItems) {
      const level = notif.level || "info";
      if (c[level] !== undefined) c[level]++;
    }
    return c;
  }, [notifItems]);

  // Filter notifications by active categories
  const filteredNotifications = useMemo(() => {
    return notifItems.filter((n) => activeCategories.includes(n.level || "info"));
  }, [notifItems, activeCategories]);

  // Extract sticky faults (not yet acknowledged)
  const stickyFaults = useMemo(() => {
    if (!showStickyFaults) return [];
    return extractLastFaults(notifItems).filter(
      (f) => !acknowledgedFaults.has(f.id)
    ).slice(0, 3); // Max 3 sticky faults
  }, [notifItems, acknowledgedFaults, showStickyFaults]);

  // Toggle category filter
  const toggleCategory = (cat) => {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Acknowledge a fault
  const handleAcknowledgeFault = (fault) => {
    setAcknowledgedFaults((prev) => new Set([...prev, fault.id]));
    if (onAcknowledgeFault) onAcknowledgeFault(fault);
  };

  // Row renderer for virtualized list
  const Row = ({ index, style }) => {
    const notif = filteredNotifications[index];
    const level = notif.level || 'info';
    const cat = CATEGORIES[level] || CATEGORIES.info;

    return (
      <div style={style} className="notifRowWrapper">
        <div className={`notifRow ${level}`}>
          <div className="notifTop">
            <span className="notifCategoryLabel">
              <span className="notifIcon">{cat.icon}</span>
            </span>
            <span className="mono notifTitle">{notif.title}</span>
            <span className="mono muted notifTime">
              {formatTime(notif.t_ms)}
            </span>
          </div>
          {notif.detail && (
            <div className="muted notifDetail">{notif.detail}</div>
          )}
          {notif.deviceId && notif.deviceId !== notif.title && (
            <div className="notifDeviceTag mono">{notif.deviceId}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="notificationsRail">
      {/* Sticky fault chips */}
      {stickyFaults.length > 0 && (
        <div className="stickyFaultsSection">
          <div className="stickyFaultsHeader">
            <span className="stickyFaultsTitle">Active Faults</span>
            <span className="stickyFaultsCount">{stickyFaults.length}</span>
          </div>
          {stickyFaults.map((fault) => (
            <StickyFaultChip
              key={fault.id}
              fault={fault}
              onDismiss={handleAcknowledgeFault}
            />
          ))}
        </div>
      )}

      {/* Category filters */}
      <CategoryFilters
        activeCategories={activeCategories}
        onToggle={toggleCategory}
        counts={counts}
      />

      {/* Notification list */}
      <div className="notifList" style={{ height: maxHeight }}>
        {filteredNotifications.length === 0 ? (
          <div className="notifEmpty muted">
            {notifItems.length === 0
              ? "No notifications yet."
              : "No notifications in selected categories."}
          </div>
        ) : (
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                itemCount={filteredNotifications.length}
                itemSize={72}
                width={width}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        )}
      </div>

      {/* Footer with total count */}
      {notifItems.length > 0 && (
        <div className="notifFooter">
          <span className="muted">
            {filteredNotifications.length} of {notifItems.length} shown
          </span>
        </div>
      )}
    </div>
  );
}

export default VirtualizedNotifications;