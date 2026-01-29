/**
 * DashboardLayout Component
 * Three-column grid layout for dashboard
 * Structure: LeftSidebar | Charts | RightSidebar
 */

import React from 'react';
import './DashboardLayout.css';

export function DashboardLayout({
  sidebarCollapsed = false,
  topBar = null,
  fleetStrip = null,
  topControlBar = null,
  controlPanel = null,
  chartGrid = null,
  metricsRail = null,
  notifications = null,
}) {
  const hasLeftSidebar = fleetStrip || topControlBar || controlPanel;
  
  return (
    <div className="dashboard-layout">
      {/* Top bar - full width */}
      {topBar && (
        <div className="dashboard-layout__top">
          {topBar}
        </div>
      )}
      
      {/* Main layout - 2 columns */}
      <div className="dashboard-layout__main">
        {/* Left column: Fleet status strip + control + notifications */}
        <aside className="dashboard-layout__sidebar-left">
          {fleetStrip && (
            <div className="dashboard-layout__fleet-strip">
              {fleetStrip}
            </div>
          )}
          {topControlBar && (
            <div className="dashboard-layout__top-control-bar">
              {topControlBar}
            </div>
          )}
          {controlPanel && (
            <div className="dashboard-layout__control-panel">
              {controlPanel}
            </div>
          )}
        </aside>
        
        {/* Center: Chart grid wall + notifications */}
        <main className="dashboard-layout__center">
          {chartGrid && (
            <div className="dashboard-layout__chart-grid">
              {chartGrid}
            </div>
          )}
          {notifications && (
            <div className="dashboard-layout__notifications">
              {notifications}
            </div>
          )}
        </main>
        
        {/* Right column: Metrics rail */}
        {metricsRail && (
          <aside className="dashboard-layout__sidebar-right">
            {metricsRail}
          </aside>
        )}
      </div>
    </div>
  );
}

export default DashboardLayout;
