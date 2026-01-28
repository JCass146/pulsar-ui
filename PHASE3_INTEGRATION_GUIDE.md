# DashboardView Integration Guide

## Overview

This guide shows how to integrate the newly created dashboard components (DashboardLayout, FleetStatusStrip, ControlPanel) into the existing DashboardView component.

## Files Created in Phase 3

### Layout Components
- `DashboardLayout.jsx` - Three-column layout container
- `DashboardLayout.css` - Layout styling with responsive behavior
- `FleetStatusStrip.jsx` - Fleet health summary
- `FleetStatusStrip.css` - Fleet status styling
- `ControlPanel.jsx` - Collapsible control sections
- `ControlPanel.css` - Control panel styling
- `dashboardIndex.js` - Centralized exports

### Modified Components
- `PlotCard.jsx` - Refactored to use Card primitives instead of custom HTML

## Integration Steps

### Step 1: Update DashboardView Imports

Add the new dashboard components to your DashboardView imports:

```jsx
import { DashboardLayout, FleetStatusStrip, ControlPanel } from './dashboardIndex.js';
import TopControlBar from './TopControlBar.jsx';
import LiveMetricsRail from './LiveMetricsRail.jsx';
import VirtualizedNotifications from './VirtualizedNotifications.jsx';
import PlotCard from './PlotCard.jsx';
```

### Step 2: Prepare Data for Components

In your DashboardView component, organize the data needed:

```jsx
export default function DashboardView({
  devices = [],
  selectedDevices = [],
  watchedFields = [],
  // ... other props
}) {
  // ... existing hooks and state
  
  // Prepare fleet status data
  const fleetStatusProps = {
    devices: devices,
  };
  
  // Prepare control panel sections
  const controlSections = [
    {
      title: 'Fleet',
      expanded: true,
      children: (
        <div style={{ paddingTop: 'var(--space-sm)' }}>
          {/* Your device selection list component */}
          {/* Example: <DeviceSelectList devices={devices} onChange={...} /> */}
        </div>
      ),
    },
    {
      title: 'Metrics',
      expanded: true,
      children: (
        <div style={{ paddingTop: 'var(--space-sm)' }}>
          {/* Your metric selector component */}
          {/* Example: <MetricSelector watched={watchedFields} onChange={...} /> */}
        </div>
      ),
    },
    {
      title: 'Options',
      expanded: false,
      children: (
        <div style={{ paddingTop: 'var(--space-sm)' }}>
          {/* Additional controls */}
        </div>
      ),
    },
  ];
  
  // Build chart grid
  const chartCards = useMemo(() => {
    return selectedDevices.flatMap(deviceId => {
      const device = devices.find(d => d.id === deviceId);
      return watchedFields.map(field => (
        <PlotCard
          key={`${deviceId}:${field}`}
          seriesKey={`${deviceId}:${field}`}
          seriesRef={seriesRef} // Your existing ref
          devicesRef={devicesRef} // Your existing ref
          // ... other props
        />
      ));
    });
  }, [selectedDevices, watchedFields, devices]);
  
  // Build components for layout
  const topBar = <TopControlBar />;
  const fleetStrip = <FleetStatusStrip {...fleetStatusProps} />;
  const controlPanel = <ControlPanel sections={controlSections} />;
  const metricsRail = <LiveMetricsRail devices={devices} />;
  const notifications = <VirtualizedNotifications />;
  
  return (
    <DashboardLayout
      topBar={topBar}
      fleetStrip={fleetStrip}
      controlPanel={controlPanel}
      chartGrid={chartCards}
      metricsRail={metricsRail}
      notifications={notifications}
    />
  );
}
```

### Step 3: Update Styling

The new components use CSS tokens and are fully styled. No additional CSS updates needed unless you want to customize:

```css
/* Optional: Customize left sidebar width */
.dashboard-layout__main {
  grid-template-columns: 300px 1fr 250px; /* Adjust if needed */
}

/* Optional: Adjust notification height */
.dashboard-layout__notifications {
  max-height: 250px; /* Increase if needed */
}
```

## Component Props Reference

### DashboardLayout

```jsx
<DashboardLayout
  topBar={component}           // Optional: top bar component
  fleetStrip={component}       // Optional: fleet status component
  controlPanel={component}     // Optional: control panel component
  chartGrid={component}        // Optional: chart grid children
  metricsRail={component}      // Optional: right sidebar component
  notifications={component}    // Optional: notifications component
/>
```

### FleetStatusStrip

```jsx
<FleetStatusStrip
  devices={array}  // Array of device objects with .online and .stale properties
/>
```

### ControlPanel

```jsx
<ControlPanel
  sections={[
    {
      title: "Section Title",
      expanded: true,              // Optional: default expansion state
      children: <div>Content</div> // Section content
    },
    // ... more sections
  ]}
/>
```

## Testing the Integration

After integration, verify:

1. **Layout Rendering**
   - [ ] Three-column layout displays correctly
   - [ ] Left sidebar shows fleet status and controls
   - [ ] Center shows chart grid
   - [ ] Right sidebar shows metrics rail
   - [ ] Notifications appear below charts

2. **Responsiveness**
   - [ ] Desktop (1400px+): Three columns visible
   - [ ] Tablet (768-1400px): Single column, sidebars hidden
   - [ ] Mobile (<768px): Single column, stacked vertically

3. **Functionality**
   - [ ] Control panel sections collapse/expand
   - [ ] Charts render with new Card styling
   - [ ] Settings button works
   - [ ] Device selection works
   - [ ] Notifications display correctly

4. **Theming**
   - [ ] Light theme: colors render correctly
   - [ ] Dark theme: colors render correctly
   - [ ] Theme switch doesn't break layout

5. **Accessibility**
   - [ ] Keyboard navigation works
   - [ ] Tab order is logical
   - [ ] Focus states visible
   - [ ] Color contrast WCAG AA compliant

## Common Issues and Solutions

### Issue: Sidebar doesn't appear
**Solution**: Ensure chart grid has enough width. Check viewport is wider than 1400px.

### Issue: Charts not rendering
**Solution**: Verify PlotCard receives correct `seriesRef` and `devicesRef` props.

### Issue: Control panel doesn't collapse
**Solution**: Check ControlPanel receives `sections` array with correct structure.

### Issue: Responsive layout broken
**Solution**: Verify CSS file is imported. Check browser DevTools that CSS is applied.

### Issue: Notifications cut off
**Solution**: Increase `.dashboard-layout__notifications` max-height in CSS.

## Next Steps

After successful integration:

1. **Verify Performance**
   - Profile with DevTools
   - Ensure RAF batching still working
   - Check no performance regression

2. **Test Data Flow**
   - Update device filters
   - Add/remove watched fields
   - Verify charts update correctly

3. **Polish Visual Details**
   - Adjust spacing if needed
   - Fine-tune control panel widths
   - Update colors if brand changes

4. **Phase 4: Chart Polish**
   - Update axis labels
   - Style gridlines
   - Add hover animations
   - Polish metric displays

## Example: Complete Integration

```jsx
import React, { useRef, useMemo, useState } from 'react';
import {
  DashboardLayout,
  FleetStatusStrip,
  ControlPanel,
} from './dashboardIndex.js';
import TopControlBar from './TopControlBar.jsx';
import LiveMetricsRail from './LiveMetricsRail.jsx';
import VirtualizedNotifications from './VirtualizedNotifications.jsx';
import PlotCard from './PlotCard.jsx';
import './DashboardView.css';

export default function DashboardView({
  devices = [],
  latestRef = null,
  devicesRef = null,
  seriesRef = null,
}) {
  const [selectedDevices, setSelectedDevices] = useState(
    devices.slice(0, 3).map(d => d.id)
  );
  const [watchedFields, setWatchedFields] = useState([
    'temperature',
    'pressure',
    'humidity',
  ]);

  // Build chart cards
  const chartCards = useMemo(() => {
    return selectedDevices.flatMap(deviceId => {
      return watchedFields.map(field => (
        <PlotCard
          key={`${deviceId}:${field}`}
          seriesKey={`${deviceId}:${field}`}
          seriesRef={seriesRef}
          devicesRef={devicesRef}
          height={220}
        />
      ));
    });
  }, [selectedDevices, watchedFields]);

  // Control panel sections
  const controlSections = [
    {
      title: 'Devices',
      expanded: true,
      children: (
        <div>
          {/* Device selection UI here */}
        </div>
      ),
    },
    {
      title: 'Metrics',
      expanded: true,
      children: (
        <div>
          {/* Metric selector UI here */}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      topBar={<TopControlBar />}
      fleetStrip={<FleetStatusStrip devices={devices} />}
      controlPanel={<ControlPanel sections={controlSections} />}
      chartGrid={chartCards}
      metricsRail={<LiveMetricsRail devices={devices} />}
      notifications={<VirtualizedNotifications />}
    />
  );
}
```

## Support

For detailed component documentation:
- **DashboardLayout**: See `DashboardLayout.jsx` comments
- **FleetStatusStrip**: See `FleetStatusStrip.jsx` comments
- **ControlPanel**: See `ControlPanel.jsx` comments
- **Design System**: See [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md)

## Files Reference

- Component files: `ui/src/ui/Dashboard*.jsx`
- CSS files: `ui/src/ui/*.css`
- Design tokens: `ui/src/styles.css`
- Documentation: `PHASE3_DASHBOARD_REFACTORING.md`
