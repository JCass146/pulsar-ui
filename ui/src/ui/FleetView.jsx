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
import HealthSummaryBar from "./HealthSummaryBar.jsx";
import FleetDeviceDetail from "./FleetDeviceDetail.jsx";
import { TimelineContent } from "./TimelineView.jsx";

export default function FleetView({
  deviceList,
  devicesRef,
  latestRef,
  selectedDevice,
  setSelectedDevice,
  getDeviceRole,
  deviceTick,
  
  // Timeline props
  events,
  cmdHistory,
  
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
        activeFilter={healthFilter}
        onFilterChange={setHealthFilter}
      />

      <div className="view-grid view-grid--fleet">
        {/* Left Column: Device Grid */}
        <section className="card feed">
          <div className="fleetDeviceHeader">
            <h2>Devices ({filteredDevices.length})</h2>
            <div className="fleetDeviceHeaderActions">
              {healthFilter !== "all" && (
                <button
                  className="secondary fleetClearFilterBtn"
                  onClick={() => setHealthFilter("all")}
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

        {/* Right Column: Device Detail + Timeline stacked */}
        <div className="fleet-right-column">
          {/* Device Detail (always visible when device selected) */}
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

          {/* Timeline */}
          <section className="card feed fleet-timeline">
            <h2>⏱️ Timeline</h2>
            <TimelineContent
              events={events || []}
              commandHistory={cmdHistory || []}
              devices={deviceList}
              onDeviceSelect={setSelectedDevice}
              selectedDeviceId={selectedDevice}
              embedded={true}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
