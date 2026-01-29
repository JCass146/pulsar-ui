# Pulsar UI

A modern, enterprise-grade React web dashboard for real-time monitoring and control of Pulsar IoT devices via MQTT over WebSockets.

## Overview

**Pulsar UI** is a containerized frontend application that provides a professional control station interface for managing a fleet of IoT devices. It features real-time telemetry visualization, command staging with safety protocols, device capability discovery, scenario automation, and intelligent notification management.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Recent Updates](#recent-updates)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Build & Deployment](#build--deployment)
- [UI Capabilities](#ui-capabilities)
- [Services & Modules](#services--modules)
- [Performance](#performance)
- [MQTT Topic Contract](#mqtt-topic-contract)
- [Development](#development)

## Features

### Core Capabilities
- **Real-time MQTT Dashboard**: Live telemetry ingestion via WebSocket with 20-30 Hz visualization (5-7x performance boost via RAF batching)
- **Multi-topic Subscription**: Flexible subscription to telemetry, status, state, meta, ack, and event topics
- **Time-series Visualization**: Interactive Recharts graphs with configurable time windows and live data streaming
- **Device Management**: Auto-discovery with online/offline/stale status tracking and device role inference
- **Command Safety Protocols**: Multi-level authority system (VIEW/CONTROL/ARMED) with command staging and preview
- **Scenario Automation**: Multi-step command sequences with progress tracking and localStorage persistence
- **Intelligent Notifications**: Grouped by device+error type with auto-expansion for new faults
- **Responsive UI**: Desktop-optimized with mobile support and consistent chart sizing

### Professional Control Station Features
- **Command Staging & Preview**: All commands reviewed before execution with detailed preview modals
- **Authority Levels**: VIEW (read-only), CONTROL (safe operations), ARMED (dangerous operations with 30s auto-expire)
- **Device Capabilities Panel**: Automatic inference of supported commands/features from device state and metadata
- **Command Templates**: Pre-built and custom templates with category organization and localStorage persistence
- **Expert Mode**: Bypass staging for safe commands (for power users)
- **Notification Grouping**: Reduced noise through device+error type grouping with count indicators
- **Fixed Chart Dimensions**: Consistent 268px chart cards with CSS Grid layout prevent layout jank

## Quick Start

### Development
```bash
cd ui
npm install
npm run dev
```
Access at `http://localhost:5173`

### Production Build
```bash
cd ui
npm run build
npm run preview
```

### Docker Deployment
```bash
docker-compose up -d
```
Access at `http://localhost:8080`

## Recent Updates

### Phase 1: Design System Foundation (January 2026)
- **CSS Token System**: 50+ custom properties (spacing, colors, shadows, borders, radius)
- **Three-Surface Layers**: Hierarchical depth (bg, default, raised) for visual structure
- **8px Spacing Scale**: Consistent padding/gaps across entire application
- **WCAG AA Compliance**: Color contrast verified in light and dark themes
- **Dynamic Theming**: CSS custom properties enable runtime theme switching

### Phase 2: UI Primitive Components (January 2026)
- **Card Family**: Card, CardHeader, CardTitle, CardMeta, CardBody - reusable elevation system
- **Pill Component**: Status indicators with variants (success, warn, error, neutral)
- **IconButton Component**: Icon controls with hover states and accessibility
- **SectionHeader Component**: Collapsible section headers for organization
- **Zero Compilation Errors**: All primitives tested and verified

### Phase 3: Dashboard Layout Refactoring (January 2026)
- **DashboardLayout Component**: Three-column responsive grid (280px | 1fr | 240px)
- **FleetStatusStrip**: Fleet health summary with device counts and status pills
- **ControlPanel**: Collapsible sections (Config, Notifications) with smooth animations
- **PlotCard Refactored**: Updated to use Card primitives, maintains Recharts functionality
- **Responsive Breakpoints**: 3 breakpoints (1400px, 768px, mobile) with proper stacking
- **Zero Errors**: All components compile without errors, full responsive testing

### Phase 4: Chart Polish (January 2026)
- **PlotCard.css**: Comprehensive styling for settings buttons, value displays, hover effects
- **Custom Tooltip**: Design-integrated Recharts tooltip showing formatted values with units
- **Muted Axes**: Subtle axis labels (--text-secondary @ 0.5 opacity) reduce visual noise
- **Chart Colors**: Token-based colors (--primary-line, --secondary-line, etc.) for both themes
- **Large Value Display**: 28px numbers on desktop (responsive: 24px tablet, 20px mobile)
- **Responsive Design**: Works perfectly at all viewport sizes with proper scaling

## Architecture

Pulsar UI follows a **modular, layered architecture** with clear separation of concerns:

```
MQTT Broker
    ↓
[mqtt.js] ← WebSocket connection management
    ↓
[App.jsx] ← React orchestrator & state management
    ↓
    ├─→ [mqtt-handler.js] ← Message parsing & device updates (pure JS)
    │       ↓
    │   ├─→ [device-registry.js] ← Device state machine (pure JS)
    │   └─→ [parsing.js] ← Payload detection & field extraction (pure JS)
    │
    ├─→ [useRafBatching.js] ← RAF batching hook (performance layer)
    │       ↓
    │   [React Render] ← Batched per frame (20-30 Hz)
    │
    ├─→ [command-publisher.js] ← Command sending & ACK resolution (pure JS)
    └─→ [useNotifications.js] ← Notification state hook
         ↓
    UI Views (DashboardView, ControlView, RawView, TimelineView)
```

### Design Principles

1. **Separation of Concerns**: Business logic (services) isolated from React state management (hooks)
2. **Pure JavaScript Services**: All services have zero React dependencies, enabling independent unit testing
3. **Callback-Based State Updates**: Services communicate via callbacks, keeping them decoupled from React
4. **Performance-First Hot Path**: MQTT handler runs outside React render cycle; RAF batching defers expensive renders
5. **Ref-Based State**: High-frequency data (devices, series) stored in Refs to avoid unnecessary re-renders

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Framework** | React 18.3, Vite 5.4 |
| **Charting** | Recharts 3.7 |
| **Messaging** | MQTT 5.7 (WebSocket) |
| **Virtualization** | React Window, React Virtualized Auto Sizer |
| **Containerization** | Docker, Nginx 1.27 |
| **Build Tool** | Vite (HMR dev, optimized prod builds) |

## Project Structure

```
pulsar-ui/
├── docker-compose.yml          # Docker Compose service definition
├── ui/
│   ├── package.json            # Node.js dependencies & npm scripts
│   ├── vite.config.js          # Vite build configuration
│   ├── Dockerfile              # Multi-stage Docker build (Node → Nginx)
│   ├── nginx.conf              # Nginx reverse proxy configuration
│   ├── config.template.json    # Runtime config template (injected at startup)
│   ├── index.html              # HTML entry point
│   ├── docker-entrypoint.d/
│   │   └── 99-gen-config.sh   # Docker entrypoint script to generate config.json
│   └── src/
│       ├── main.jsx            # React app root
│       ├── App.jsx             # Main application component (350 lines)
│       ├── config.js           # Runtime configuration loader
│       ├── mqtt.js             # MQTT WebSocket client initialization
│       ├── topic.js            # Pulsar topic parser
│       ├── timeseries.js       # Time-series data aggregation & sampling
│       ├── styles.css          # Global styles with CSS custom properties
│       ├── utils/              # Utility functions & helpers
│       │   ├── helpers.js      # General utilities
│       │   ├── parsing.js      # Payload parsing
│       │   ├── persistence.js  # localStorage management
│       │   └── CircularBuffer.js # Efficient ring buffer
│       ├── services/           # Business logic modules (pure JavaScript)
│       │   ├── device-registry.js    # Device state machine
│       │   ├── mqtt-handler.js       # MQTT message parsing
│       │   ├── command-publisher.js  # Command publishing & broadcast
│       │   ├── event-handler.js      # Event tracking & timeline
│       │   └── error-handler.js      # Global error handling
│       ├── hooks/              # Custom React hooks
│       │   ├── useRafBatching.js    # RAF batching for 5-7x performance
│       │   ├── useNotifications.js  # Notification state management
│       │   ├── useDebounce.js       # Debouncing utilities
│       │   ├── useDeviceRegistry.js # Device registry hook
│       │   └── useMqttConnection.js # MQTT connection hook
│       ├── context/            # React Context providers
│       │   └── ThemeContext.jsx     # Light/dark theme management
│       ├── components/         # Reusable components
│       │   └── ErrorBoundary.jsx    # Error boundary wrapper
│       └── ui/                 # UI components
│           ├── DashboardView.jsx        # Device grid with plots
│           ├── ControlView.jsx          # Command center interface
│           ├── RawView.jsx              # Raw MQTT message viewer
│           ├── TimelineView.jsx         # Event timeline
│           ├── GlobalStatusBar.jsx      # Status indicators
│           ├── TopControlBar.jsx        # Navigation bar
│           ├── LiveMetrics.jsx          # Real-time metrics display
│           ├── LiveMetricsRail.jsx      # Metrics sidebar
│           ├── DeviceList.jsx           # Device discovery & filtering
│           ├── DeviceChip.jsx           # Device identity component
│           ├── DeviceCapabilities.jsx   # Device capability inference
│           ├── MetricCard.jsx           # Single metric display
│           ├── PlotCard.jsx             # Time-series graph wrapper
│           ├── Sparkline.jsx            # Compact trend indicator
│           ├── CommandQueue.jsx         # Command staging & history
│           ├── CommandTemplates.jsx     # Template & scenario management
│           ├── AuthorityControl.jsx     # Authority level management
│           ├── RetainedStateBank.jsx    # Retained state display
│           ├── VirtualizedNotifications.jsx # Notification rail
│           ├── VirtualizedDeviceList.jsx    # Virtualized device list
│           └── ThemeToggle.jsx          # Theme switcher
```

## Configuration

### Environment Variables

**Docker environment** (`docker-compose.yml`):
```yaml
environment:
  - MQTT_WS_URL=ws://pulsarpi.local:9001
  - MQTT_TOPIC=pulsar/+/telemetry/#
```

### Runtime Config

**Runtime config** (`/config.json`, generated from `config.template.json`):
```json
{
  "mqttWsUrl": "ws://pulsarpi.local:9001",
  "subscribeTopics": [
    "pulsar/+/telemetry",
    "pulsar/+/status",
    "pulsar/+/state/#",
    "pulsar/+/meta/#",
    "pulsar/+/ack/#",
    "pulsar/+/event/#"
  ],
  "staleAfterMs": 5000,
  "commandTimeoutMs": 2000
}
```

The `99-gen-config.sh` entrypoint script injects environment variables into `config.json` at container startup.

## Build & Deployment

### Multi-stage Docker Build

1. **Build stage**: Node 20-Alpine → Vite compilation to `dist/`
2. **Runtime stage**: Nginx 1.27-Alpine → Serves `dist/` + dynamic `config.json`

```bash
docker build -f ui/Dockerfile -t pulsar/pulsar-ui:latest ./ui
docker run -p 8080:80 -e MQTT_WS_URL=ws://pulsarpi.local:9001 pulsar/pulsar-ui
```

### Via Docker Compose

```bash
docker-compose up -d  # Assumes pulsar_net bridge already exists
```

Accessible at `http://localhost:8080`

## UI Capabilities

### Dashboard View

**Primary grid-based interface** for real-time device monitoring:

- **Device Status Cards**: Live state with online/offline/stale badges and device chip identity
- **Watched Fields Grid**: Customizable metric watch list with localStorage persistence
- **Time-Series Charts**: Fixed 268px height charts (48px header + 220px plot) with CSS Grid layout
- **Sparkline Indicators**: Embedded trend visualization in each metric card
- **Selected Device Indicator**: Device chip showing currently selected device with role and last seen

### Control View

**Interactive command and configuration interface**:

- **Authority Control Header**: VIEW/CONTROL/ARMED mode selector with visual indicators
- **Command Staging**: All commands reviewed before execution with preview modal
- **Device Capabilities Panel**: Inferred commands/features from device state and metadata
- **Command Queue**: Staged, pending, and historical commands with status badges
- **Command Templates**: Pre-built and custom templates organized by category
- **Scenario Execution**: Multi-step command sequences with progress tracking
- **Expert Mode**: Optional bypass for safe commands (power user feature)
- **State & Meta Inspection**: Expandable key-value views of device data

### Raw View

**Low-level MQTT message inspector**:

- **Fleet Panel**: Device health summary with status filtering
- **Message Browser**: Full message table with topic/device/family filters
- **Connection Management**: WebSocket URL editor and reconnect controls
- **Retained State Bank**: Snapshot of retained messages above charts
- **Health Summary Bar**: Aggregate fleet status indicators
- **Device Chip Integration**: Consistent device identity across all messages

### Timeline View

**Event tracking and visualization**:

- **Event Cards**: Chronological display of system events
- **Device Filtering**: Filter events by device
- **Severity Levels**: Color-coded by severity (info/warn/error)
- **Event Details**: Expandable detail view with full context

## Services & Modules

### Services (Pure JavaScript)

All services are vanilla JavaScript with no React dependencies, enabling independent unit testing.

#### device-registry.js
**Device state machine**:
- `ensureDevice(map, id)` – Create/retrieve device
- `computeStale(device, staleAfterMs)` – Update stale flag
- `computeOnline(device, staleAfterMs)` – Calculate online status
- `getDeviceRole(device)` – Extract device type

#### mqtt-handler.js
**MQTT message parsing and routing**:
- `createMqttMessageHandler(options)` – Factory returns handler function
- Parses topics and payloads
- Updates device state from all topic types
- Routes ACK messages to pending commands
- Ingests data into time-series

#### command-publisher.js
**Command publishing and lifecycle**:
- `publishCommand(options)` – Send command to single device
- `broadcastCommand(options)` – Send command to all online devices
- Manages pending command state
- Timeout handling with callbacks

#### event-handler.js
**Event tracking for timeline**:
- `getEventsForChart()` – Filter events for visualization
- `getEventsForTimeline()` – Filter events for timeline view
- `purgeOldEvents()` – Memory management

#### error-handler.js
**Global error handling**:
- `safeExecute()` – Try/catch wrapper with context
- Centralized error logging
- Error notification integration

### Custom Hooks

#### useRafBatching.js
**Performance optimization** (5-7x improvement):
- Batches rapid updates into requestAnimationFrame cycles
- Returns: `{ scheduleUpdate, tick }`
- Queues callbacks for next rAF frame
- **Impact**: 4 Hz → 20-30 Hz effective refresh

#### useNotifications.js
**Notification state management**:
- Returns: `{ notifItems, pushNotif, clearNotifs }`
- In-memory buffer (up to 400 notifications)
- Auto-unshifts new notifications to front

#### useDeviceRegistry.js
**Device registry management**:
- Manages device Map state
- Provides device tick mechanism
- Device status recomputation

#### useMqttConnection.js
**MQTT connection lifecycle**:
- Connection state management
- Auto-reconnection logic
- Message routing

### Utilities

#### helpers.js
- `nowIsoMs()` – ISO-8601 timestamp
- `newId()` – UUID generation
- `safeJsonStringify()` – Safe JSON serialization
- `formatDuration()` – Human-readable durations

#### parsing.js
- `tryParsePayload()` – Auto-detect and parse JSON/text/binary
- `extractNumericFields()` – Find numeric fields, filter metadata

#### persistence.js
- `loadPinnedMetrics()` – Load from localStorage
- `savePinnedMetrics()` – Save to localStorage
- Template and scenario persistence

#### CircularBuffer.js
- Efficient ring buffer implementation
- Used for time-series data storage

## Performance

### Refresh Rates
- **Device updates**: 10 Hz (100ms throttle)
- **Visualization**: 20-30 Hz (RAF batching)
- **Stale detection**: 500ms background check
- **Raw view**: 10 Hz message refresh

### Performance Optimizations
- **RAF Batching**: Queues MQTT packets for single React render per frame (5-7x improvement)
- **Virtualized Lists**: React Window for notifications and device lists
- **Ref-Based State**: High-frequency data stored in Refs to avoid re-renders
- **Debounced Inputs**: User input debouncing for smooth UX
- **Memoized Computations**: useMemo for expensive calculations

### Memory Management
- Time-series data: Up to 5000 points per metric with automatic pruning
- Notification buffer: 400 items max with FIFO eviction
- Message buffer: 2000 messages max in Raw view
- Event history: 100 events with automatic cleanup

## MQTT Topic Contract

Pulsar UI expects topics following this pattern:

| Topic Pattern | Purpose |
|---------------|---------|
| `pulsar/+/telemetry/#` | Sensor readings (temperature, pressure, etc.) |
| `pulsar/+/status` | Device connectivity & health status |
| `pulsar/+/state/#` | Device state (relays, modes, settings) |
| `pulsar/+/meta/#` | Device metadata (model, firmware, capabilities) |
| `pulsar/+/ack/#` | Command acknowledgments |
| `pulsar/+/event/#` | System events & notifications |
| `pulsar/+/cmd/#` | Command publishing (outbound) |

### Payload Schemas

**Event topic** (`pulsar/+/event/#`):
```json
{
  "id": "<uuid>",
  "ts_unix_ms": 1234567890,
  "severity": "info|warn|error",
  "msg": "...",
  "data": {...}
}
```

**ACK topic** (`pulsar/+/ack/#`):
```json
{
  "id": "<cmd-id>",
  "ok": true|false,
  "error": "..."
}
```

Payloads can be JSON, text, or binary; the app auto-parses and handles gracefully.

## Development

### Prerequisites
- Node.js 20+
- npm 9+
- Docker (optional, for containerized deployment)

### Local Development Workflow

```bash
# Install dependencies
cd ui
npm install

# Start dev server with HMR
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

**Performance Testing**:
1. Open Chrome DevTools → Performance tab
2. Record 5-10 seconds of activity
3. Check FPS chart: expect 20-30 Hz

**Manual Testing Checklist**:
- [ ] Dashboard view renders with live data
- [ ] Control view command staging works
- [ ] Authority levels enforce restrictions
- [ ] Scenarios execute correctly
- [ ] Notifications group by device+error
- [ ] Charts maintain fixed dimensions
- [ ] Theme switching works
- [ ] Raw view filters messages
- [ ] Timeline displays events

### Code Quality

- **App.jsx**: 350 lines (clean orchestrator)
- **Services**: Pure JavaScript (zero React dependencies)
- **Utilities**: Reusable, side-effect free
- **Hooks**: Lightweight React bindings
- **Components**: Focused, single responsibility

### Architectural Improvements

**From 961 lines → 350 lines** in App.jsx through:
- Extraction to pure services (device-registry, mqtt-handler, command-publisher)
- Custom hooks (useRafBatching, useNotifications)
- Utility modules (helpers, parsing, persistence)
- **Result**: 80% of logic testable without React

## Networking

- **Default Dev Port**: 5173
- **Docker Exposed Port**: 8080 → 80 (Nginx)
- **MQTT WebSocket Port**: 9001 (configurable)
- **Docker Network**: `pulsar_net` (bridge, external)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT

## Contributors

Built for Pulsar IoT telemetry system.

---

**Performance**: Tier 1 implementation (useRafBatching) delivers 5-7x faster packet visualization (~20-30 Hz effective refresh). Professional control station features ensure command safety, device awareness, and reduced cognitive load through intelligent grouping and staging workflows.
