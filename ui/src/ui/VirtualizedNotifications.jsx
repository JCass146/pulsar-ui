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
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Group notifications by device + error type
  const groupedNotifications = useMemo(() => {
    const groups = new Map();

    for (const notif of notifItems) {
      const deviceId = notif.deviceId || notif.title || "unknown";
      const errorType = notif.detail || notif.message || "unknown";
      const groupKey = `${deviceId}:${errorType}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          deviceId,
          errorType,
          level: notif.level || "info",
          notifications: [],
          count: 0,
          latestTime: 0,
          isNew: false,
        });
      }

      const group = groups.get(groupKey);
      group.notifications.push(notif);
      group.count++;
      if (notif.t_ms > group.latestTime) {
        group.latestTime = notif.t_ms;
      }

      // Mark as new if recent (last 30 seconds)
      if (Date.now() - notif.t_ms < 30000) {
        group.isNew = true;
      }
    }

    return Array.from(groups.values()).sort((a, b) => b.latestTime - a.latestTime);
  }, [notifItems]);

  // Auto-expand new fault groups
  React.useEffect(() => {
    const newFaultGroups = groupedNotifications
      .filter(g => g.level === "bad" && g.isNew)
      .map(g => g.key);

    setExpandedGroups(prev => new Set([...prev, ...newFaultGroups]));
  }, [groupedNotifications]);

  // Count notifications by category
  const counts = useMemo(() => {
    const c = { bad: 0, warn: 0, ok: 0, info: 0 };
    for (const notif of notifItems) {
      const level = notif.level || "info";
      if (c[level] !== undefined) c[level]++;
    }
    return c;
  }, [notifItems]);

  // Filter groups by active categories
  const filteredGroups = useMemo(() => {
    return groupedNotifications.filter((g) => activeCategories.includes(g.level));
  }, [groupedNotifications, activeCategories]);

  // Extract sticky faults (last 3 devices with errors, not acknowledged)
  const stickyFaults = useMemo(() => {
    if (!showStickyFaults) return [];

    const errorGroups = groupedNotifications
      .filter(g => g.level === "bad")
      .filter(g => !acknowledgedFaults.has(g.key))
      .slice(0, 3); // Max 3 sticky faults

    return errorGroups.map(g => ({
      ...g.notifications[0], // Use the latest notification from the group
      groupKey: g.key,
      count: g.count,
    }));
  }, [groupedNotifications, acknowledgedFaults, showStickyFaults]);

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

      {/* Notification groups */}
      <div className="notifList" style={{ height: maxHeight }}>
        {filteredGroups.length === 0 ? (
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
                itemCount={filteredGroups.length}
                itemSize={80}
                width={width}
              >
                {({ index, style }) => {
                  const group = filteredGroups[index];
                  const isExpanded = expandedGroups.has(group.key);

                  return (
                    <div style={style}>
                      <div
                        className={`notifGroup ${group.level} ${isExpanded ? 'expanded' : ''} ${group.isNew ? 'new' : ''}`}
                        onClick={() => {
                          setExpandedGroups(prev => {
                            const next = new Set(prev);
                            if (next.has(group.key)) {
                              next.delete(group.key);
                            } else {
                              next.add(group.key);
                            }
                            return next;
                          });
                        }}
                      >
                        <div className="notifGroupHeader">
                          <div className="notifGroupIcon">
                            {CATEGORIES[group.level]?.icon || "•"}
                          </div>
                          <div className="notifGroupContent">
                            <div className="notifGroupDevice mono">{group.deviceId}</div>
                            <div className="notifGroupError">{group.errorType}</div>
                          </div>
                          <div className="notifGroupMeta">
                            <span className="notifGroupCount">{group.count}</span>
                            <span className="notifGroupTime">{formatRelativeTime(group.latestTime)}</span>
                            <span className="notifGroupExpand">{isExpanded ? "▼" : "▶"}</span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="notifGroupDetails">
                            {group.notifications.map((notif, idx) => (
                              <div key={idx} className="notifGroupItem">
                                <div className="notifTime">{formatTime(notif.t_ms)}</div>
                                <div className="notifMessage">{notif.message || notif.detail}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              </List>
            )}
          </AutoSizer>
        )}
      </div>

      {/* Footer with total count */}
      {notifItems.length > 0 && (
        <div className="notifFooter">
          <span className="muted">
            {filteredGroups.length} of {groupedNotifications.length} groups shown
          </span>
        </div>
      )}
    </div>
  );
}

export default VirtualizedNotifications;