/**
 * FleetView.jsx
 * Fleet-wide management and operations with device detail drill-down
 * - Fleet status overview
 * - Device grid with health indicators
 * - Broadcast command center
 * - Tag management
 * - Device detail panel (slides in when device selected)
 */

import React, { useState, useMemo } from "react";
import FleetStatusStrip from "./FleetStatusStrip.jsx";
import VirtualizedDeviceList from "./VirtualizedDeviceList.jsx";
import TopControlBar from "./TopControlBar.jsx";
import HealthSummaryBar from "./HealthSummaryBar.jsx";
import FleetDeviceDetail from "./FleetDeviceDetail.jsx";

export default function FleetView({
  deviceList,
  devicesRef,
  latestRef,
  selectedDevice,
  setSelectedDevice,
  getDeviceRole,
  broadcastCommand,
  deviceTick,
  
  // Calibration props
  calEditorText,
  setCalEditorText,
  calAutoSync,
  setCalAutoSync,
  sendCalibration,
  resetCalEditorToCurrent,
  
  // Authority props
  authorityLevel,
  canExecuteCommand,
  refreshArmed,
}) {
  const [healthFilter, setHealthFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState(null);

  // Fleet statistics
  const fleetStats = useMemo(() => {
    const online = deviceList.filter((d) => d.online && !d.stale).length;
    const stale = deviceList.filter((d) => d.stale).length;
    const offline = deviceList.filter((d) => !d.online).length;
    const total = deviceList.length;

    return { total, online, stale, offline };
  }, [deviceList]);

  // Filter devices by health
  const filteredDevices = useMemo(() => {
    let filtered = [...deviceList];

    if (healthFilter === "healthy") {
      filtered = filtered.filter((d) => d.online && !d.stale);
    } else if (healthFilter === "warning") {
      filtered = filtered.filter((d) => d.stale);
    } else if (healthFilter === "offline") {
      filtered = filtered.filter((d) => !d.online);
    }

    if (tagFilter) {
      filtered = filtered.filter((d) => d.tags?.includes(tagFilter));
    }

    return filtered;
  }, [deviceList, healthFilter, tagFilter]);

  // Get all unique tags from devices
  const allTags = useMemo(() => {
    const tags = new Set();
    deviceList.forEach((d) => {
      if (d.tags) {
        d.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [deviceList]);

  return (
    <main className="fleetViewMain">
      {/* Fleet Status Header */}
      <div className="fleetViewHeader">
        <FleetStatusStrip
          online={fleetStats.online}
          stale={fleetStats.stale}
          offline={fleetStats.offline}
        />
      </div>

      {/* Health Summary Bar with Filters */}
      <HealthSummaryBar
        deviceList={deviceList}
        healthFilter={healthFilter}
        onHealthFilterChange={setHealthFilter}
      />

      <div className="view-grid">
        {/* Broadcast Control Center */}
        <section className="card" style={{ gridColumn: "1 / -1" }}>
          <h2>🎯 Fleet Commands</h2>
          <TopControlBar
            devicesRef={devicesRef}
            latestRef={latestRef}
            deviceList={deviceList}
            broadcastCommand={broadcastCommand}
            deviceTick={deviceTick}
          />
        </section>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <section className="card" style={{ padding: "12px 16px", gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Filter by tag:</span>
              <button
                className={`pill ${!tagFilter ? "active" : ""}`}
                onClick={() => setTagFilter(null)}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={`pill ${tagFilter === tag ? "active" : ""}`}
                  onClick={() => setTagFilter(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Master-Detail Grid */}
        <div className={`fleet-view-grid ${selectedDevice ? 'with-detail' : ''}`}>
        {/* Device Grid (Master) */}
        <section className="card feed fleet-view-grid__list">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2>Devices ({filteredDevices.length})</h2>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {healthFilter !== "all" && (
                <button
                  className="secondary"
                  onClick={() => setHealthFilter("all")}
                  style={{ fontSize: 12, padding: "4px 8px" }}
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>

          <VirtualizedDeviceList
            devices={filteredDevices}
            selectedDevice={selectedDevice}
            onSelect={setSelectedDevice}
            devicesRef={devicesRef}
            latestRef={latestRef}
            getDeviceRole={getDeviceRole}
            showHealth={true}
            showLastSeen={true}
            compact={false}
          />
        </section>

        {/* Device Detail Panel (Detail - slides in) */}
        {selectedDevice && (
          <FleetDeviceDetail
            deviceId={selectedDevice}
            devicesRef={devicesRef}
            deviceTick={deviceTick}
            onClose={() => setSelectedDevice(null)}
            getDeviceRole={getDeviceRole}
            calEditorText={calEditorText}
            setCalEditorText={setCalEditorText}
            calAutoSync={calAutoSync}
            setCalAutoSync={setCalAutoSync}
            sendCalibration={sendCalibration}
            resetCalEditorToCurrent={resetCalEditorToCurrent}
            authorityLevel={authorityLevel}
            canExecuteCommand={canExecuteCommand}
            refreshArmed={refreshArmed}
          />
        )}
        </div>
      </div>
    </main>
  );
}
