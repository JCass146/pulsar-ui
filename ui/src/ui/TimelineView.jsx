/**
 * TimelineView.jsx - Milestone 4.2
 *
 * Timeline view showing events, command history, and device transitions
 * in chronological order with filtering and search capabilities.
 */

import React, { useMemo, useState, useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";

function TimelineView({
  events = [],
  commandHistory = [],
  devices = [],
  onDeviceSelect,
  selectedDeviceId
}) {
  const [filterType, setFilterType] = useState("all"); // all, events, commands
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState("1h"); // 1h, 6h, 24h, 7d, all

  // Combine and sort all timeline items
  const timelineItems = useMemo(() => {
    const items = [];

    // Add events
    events.forEach(event => {
      items.push({
        id: `event-${event.id}`,
        type: "event",
        timestamp: event.ts_unix_ms,
        data: event,
        deviceId: event.device
      });
    });

    // Add command history
    commandHistory.forEach(cmd => {
      items.push({
        id: `cmd-${cmd.id}`,
        type: "command",
        timestamp: cmd.t_ms,
        data: cmd,
        deviceId: cmd.device
      });
    });

    // Sort by timestamp descending (newest first)
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [events, commandHistory]);

  // Filter items based on criteria
  const filteredItems = useMemo(() => {
    let filtered = timelineItems;

    // Time range filter
    if (timeRange !== "all") {
      const now = Date.now();
      const ranges = {
        "1h": 60 * 60 * 1000,
        "6h": 6 * 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000
      };
      const cutoff = now - ranges[timeRange];
      filtered = filtered.filter(item => item.timestamp >= cutoff);
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Device filter
    if (selectedDeviceId) {
      filtered = filtered.filter(item => item.deviceId === selectedDeviceId);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const searchable = JSON.stringify(item.data).toLowerCase();
        return searchable.includes(term);
      });
    }

    return filtered;
  }, [timelineItems, filterType, searchTerm, timeRange, selectedDeviceId]);

  // Group items by date
  const groupedItems = useMemo(() => {
    const groups = {};
    filteredItems.forEach(item => {
      const date = format(new Date(item.timestamp), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [filteredItems]);

  const getItemIcon = (type) => {
    switch (type) {
      case "event": return "📢";
      case "command": return "⚡";
      default: return "•";
    }
  };

  const getItemColor = (type) => {
    switch (type) {
      case "event": return "var(--event-color, #ff6b6b)";
      case "command": return "var(--command-color, #4ecdc4)";
      default: return "var(--text-muted)";
    }
  };

  const renderTimelineItem = (item) => {
    const { type, timestamp, data, deviceId } = item;
    const device = devices.find(d => d.id === deviceId);
    const deviceName = device?.name || deviceId || "Unknown";

    return (
      <div key={item.id} className={`timelineItem timelineItem-${type}`}>
        <div className="timelineIcon" style={{ color: getItemColor(type) }}>
          {getItemIcon(type)}
        </div>
        <div className="timelineContent">
          <div className="timelineHeader">
            <span className="timelineType">{type.toUpperCase()}</span>
            <span className="timelineTime">
              {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
            </span>
          </div>

          <div className="timelineDevice">
            <button
              type="button"
              className="timelineDeviceLink"
              onClick={() => onDeviceSelect?.(deviceId)}
              disabled={!device}
            >
              {deviceName}
            </button>
          </div>

          <div className="timelineDetails">
            {type === "event" && (
              <div className="eventDetails">
                <span className={`eventSeverity severity-${data.severity || "info"}`}>
                  {data.severity || "info"}
                </span>
                <span className="eventMessage">{data.msg}</span>
                {data.data && (
                  <pre className="eventData">{JSON.stringify(data.data, null, 2)}</pre>
                )}
              </div>
            )}

            {type === "command" && (
              <div className="commandDetails">
                <span className="commandAction">{data.action}</span>
                <span className={`commandStatus status-${data.status || "unknown"}`}>
                  {data.status || "unknown"}
                </span>
                {data.error && (
                  <span className="commandError">{data.error}</span>
                )}
                {data.args && (
                  <pre className="commandArgs">{JSON.stringify(data.args, null, 2)}</pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="timelineView">
      <div className="timelineControls">
        <div className="timelineFilters">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="timelineFilterSelect"
          >
            <option value="all">All Types</option>
            <option value="events">Events Only</option>
            <option value="commands">Commands Only</option>
          </select>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="timelineFilterSelect"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>

        <div className="timelineSearch">
          <input
            type="text"
            placeholder="Search timeline..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="timelineSearchInput"
          />
        </div>
      </div>

      <div className="timelineContainer">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="timelineEmpty">
            <p>No timeline items match the current filters.</p>
          </div>
        ) : (
          Object.entries(groupedItems)
            .sort(([a], [b]) => b.localeCompare(a)) // Sort dates descending
            .map(([date, items]) => (
              <div key={date} className="timelineDateGroup">
                <div className="timelineDateHeader">
                  <h3>{format(new Date(date), "EEEE, MMMM d, yyyy")}</h3>
                  <span className="timelineDateCount">{items.length} items</span>
                </div>
                <div className="timelineItems">
                  {items.map(renderTimelineItem)}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

export default TimelineView;