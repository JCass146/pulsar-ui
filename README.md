# Pulsar UI

A modern React-based web dashboard for monitoring and controlling Pulsar IoT devices via MQTT in real-time.

## Implemented Milestones & Recent Work (2026-01-27)

Summary of recent fixes and Milestone 3 implementation integrated into the codebase.

- **Theme / CSS overhaul**: Reworked theming to use CSS custom properties for light/dark parity. Key changes in `ui/src/styles.css` include variables such as `--glass-bg`, `--card-gradient-*`, and `--bg-gradient-*` and replacement of hardcoded rgba() colors so the Light theme renders correctly.

- **Milestone 3 — Command Workflows (implemented)**:
  - `ui/src/ui/CommandQueue.jsx` — Active command queue / intent panel showing pending commands, progress bars, and history with cancel/retry support.
  - `ui/src/ui/CommandTemplates.jsx` — Command template library with builtin templates, custom templates persisted to localStorage, editor modal, and category/search filters.
  - `ui/src/ui/AuthorityControl.jsx` — Authority layers (`view` / `control` / `armed`) with `useAuthorityControl()` hook, `AuthorityBadge`, `ArmedTimer` (30s auto-expire), `AuthoritySelector` modal, and `CommandGate` wrapper to block commands when not allowed.

- **Integration**:
  - `App.jsx` now imports and uses `useAuthorityControl`, and passes authority-related props to `ControlView` and `GlobalStatusBar` (compact badge in the status bar when not on Control tab).
  - `ControlView.jsx` was updated to embed the Command Queue, Command Templates, and the AuthorityControl header; authority-aware send/cancel/retry flows and gated dangerous actions (e.g., apply calibration) are enforced.

- **Persistence**: Command templates persisted via `ui/src/utils/persistence.js` under the key `COMMAND_TEMPLATES` (stored as `pulsarui:cmdTemplates:v1`). Builtin templates are provided and custom templates are saved/loaded automatically.

- **Utilities**: Added `formatDuration()` to `ui/src/utils/helpers.js` which is used by the Command Queue for elapsed/progress display.

Usage notes

- To run locally (development):

```bash
cd ui
npm install
npm run dev
```

- To build for production:

```bash
cd ui
npm run build
```

Behavior highlights

- ARMED mode requires typing `ARM` in the Authority selector modal and auto-expires after 30 seconds of inactivity; ARMED is required for dangerous templates (marked `danger`) and actions such as `Apply + Persist` calibration.
- Command Queue exposes cancel and retry actions. Cancel removes the pending command and records a `cancelled` entry in the command history.
- Templates can be executed against the selected device from the Control view; duplicates can be created and custom templates edited and deleted.

Files added/modified (high level)

- Added: `ui/src/ui/CommandQueue.jsx`, `ui/src/ui/CommandTemplates.jsx`, `ui/src/ui/AuthorityControl.jsx`
- Modified: `ui/src/App.jsx`, `ui/src/ui/ControlView.jsx`, `ui/src/ui/GlobalStatusBar.jsx`, `ui/src/styles.css`, `ui/src/utils/helpers.js` (added `formatDuration`), `ui/src/utils/persistence.js` (already had templates support)

If you'd like, I can:
- run the dev server and verify the UI manually
- run a full build and report any bundler warnings/errors
- add short screenshots / animated GIFs for the new UI panels

## Overview

**Pulsar UI** is a containerized frontend application that visualizes telemetry data, device metrics, and system status from a fleet of IoT devices. It communicates with devices through MQTT WebSocket connections and displays live metrics, historical trends, and device control interfaces.

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
│       ├── main.jsx            # React app root (creates #root in index.html)
│       ├── App.jsx             # Main application component (orchestrator)
│       ├── config.js           # Runtime configuration loader
│       ├── mqtt.js             # MQTT WebSocket client initialization
│       ├── topic.js            # Pulsar topic parser (device/metric extraction)
│       ├── timeseries.js       # Time-series data aggregation & sampling
│       ├── styles.css          # Global styles
│       ├── utils/              # Utility functions & helpers
│       │   ├── helpers.js      # General utilities (ISO timestamp, UUID, JSON safe stringify)
│       │   └── parsing.js      # Payload parsing & numeric field extraction
│       ├── services/           # Business logic modules (pure JavaScript)
│       │   ├── device-registry.js    # Device state machine (create, stale, online)
│       │   ├── mqtt-handler.js      # MQTT message parsing & device updates
│       │   └── command-publisher.js # Command publishing & broadcast
│       ├── hooks/              # Custom React hooks
│       │   ├── useRafBatching.js    # RAF batching for 5-7x performance gain
│       │   └── useNotifications.js  # Notification state management
│       └── ui/
│           ├── DashboardView.jsx     # Device grid with status cards
│           ├── ControlView.jsx       # Interactive device command interface
│           ├── RawView.jsx           # Raw MQTT message viewer
│           ├── LiveMetrics.jsx       # Real-time metrics display
│           ├── DeviceList.jsx        # Device discovery & filtering
│           ├── MetricCard.jsx        # Single metric display component
│           ├── PlotCard.jsx          # Recharts time-series graph wrapper
│           ├── Sparkline.jsx         # Compact trend indicator
│           └── TopControlBar.jsx     # Navigation & status bar
```

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Framework** | React 18.3, Vite 5.4 |
| **Charting** | Recharts 3.7 |
| **Messaging** | MQTT 5.7 (WebSocket) |
| **Containerization** | Docker, Nginx 1.27 |
| **Build Tool** | Vite (HMR dev, optimized prod builds) |

## Key Features

- **Real-time MQTT Dashboard**: Live telemetry ingestion via WebSocket with 10 Hz UI refresh (device updates) + RAF batching for 5-7x packet visualization improvement
- **Multi-topic Subscription**: Flexible subscription to `pulsar/+/telemetry`, `/status`, `/state`, `/meta`, `/ack`, `/event` with single-topic manual override
- **Time-series Visualization**: Interactive Recharts line graphs with configurable time windows (default 60s), relative time-axis labels, and live data streaming
- **Device Management**: Auto-discovery, online/offline/stale status tracking, device role inference from metadata
- **Multiple Specialized Views**: Dashboard (grid overview), Control (command center), Raw (MQTT message inspector)
- **Auto-reconnection**: Configurable reconnect intervals (default 1.5s), transparent error handling with user notifications
- **Responsive UI**: Desktop-optimized with responsive cards, accessible on mobile
- **Relay/State Control**: Aggregate relay control across multiple devices, quick-access buttons for broadcast relay toggling
- **Persistent State**: Browser localStorage for pinned metrics, watched fields, and UI preferences per device

## UI Capabilities & Interactions

### Dashboard View
The primary grid-based interface for real-time device monitoring:

**Device Status Cards**
- Live device state with online/offline/stale badges
- Automatic relay state extraction from retained `state/relays` or telemetry fields
- Smart device capability surfacing (device type, firmware version, status metadata)
- Color-coded status indicators: ✓ online (green), ⚠ stale (yellow, no updates > 5s), ✗ offline (red)
- Click to select device for detailed control

**Watched Fields Grid**
- Customizable metric watch list (saved per session in localStorage)
- Default watched fields: `pressure_psi`, `mass_g`, `temp_c` (user-configurable)
- Displays latest numeric values with automatic unit inference (psi, bar, °C, °F, g, kg, V, A, %, etc.)
- Sparkline trend indicators (last ~30 points) embedded in each metric card
- Pin/unpin metrics to keep important ones at the top

**Time-Series Charts**
- Interactive Recharts line graphs, one per pinned metric
- Configurable time window (default 60 seconds, up to 5000 points cached per metric)
- Hover-to-inspect with timestamp and value tooltips
- Relative time axis (`-45s`, `-2m`) for instant context
- Decimal-aware formatting (0.001 to 1000+ ranges)

### Control View
Interactive device command and configuration interface:

**Device Selection**
- Dropdown or quick-click list for device selection
- Per-device state/meta inspection (expandable maps)
- Visual hints for subscription requirements

**Command Center**
- **Generic Command Interface**: Send arbitrary `<action>` + JSON args to `pulsar/<device>/cmd/<action>`
- **Command Template Library**: Pre-populated examples (e.g., `relay.set` with args `{"id":1,"state":1}`)
- **Command Timeout**: Configurable timeout (default 2000ms) for command acknowledgment
- **ACK Pattern**: Devices respond on `pulsar/<device>/ack/<action>` with matching command `id` field
- **Command History Log**: Full audit trail of sent commands with timestamp, device, action, args, and status
- **Args Validation**: JSON editor with syntax highlighting and parse-error feedback

**State & Meta Inspection**
- Sortable key-value view of device state (retained messages from `pulsar/+/state/#`)
- Device metadata display (device type, firmware, capabilities)
- Live refresh on every message

**Calibration Panel**
- Edit calibration coefficients in JSON format
- Auto-sync option to push changes to device
- Reset-to-current to discard unsaved edits

### Raw View
Low-level MQTT message inspector and subscription tester:

**Connection Management**
- Live WebSocket URL editor (defaults from `/config.json`)
- Single-topic subscribe field (wildcards: `+` for level, `#` for all-below)
- Multi-topic config override toggle
- Reconnect + Subscribe button for on-the-fly topic changes
- Pause/Resume feed (pause freezes incoming messages; resume resumes)
- Clear History button to reset message buffer

**Message Statistics**
- Total messages received counter
- Unique devices seen counter
- Message rate indication

**Message Browser**
- Full message table: Topic, Device ID, Message Family (extracted from topic path)
- Device/Family filter dropdowns for quick searching
- Raw payload display: JSON-pretty or hex-dumped
- Byte-size indicator for each message
- Timestamp (ISO-8601) for each ingest
- Quick-click device name to switch to Control view

**Topic Decoding**
- Automatic `pulsar/device01/telemetry/temperature` → device=`device01`, family=`telemetry`, metric=`temperature` parsing
- Family-based filtering (all telemetry, all status, etc.)

### Live Metrics Panel
Dense, compact metric display with sparklines:

**Metric Extraction**
- Scans incoming payloads for numeric fields
- Auto-skips metadata fields (timestamps, seq, uptime_ms, etc.)
- Nested field extraction from `fields` object in JSON payloads

**Per-Device Metric Pinning**
- Pin/unpin up to 24 metrics per device (saved to localStorage)
- Pinned metrics appear first, remaining shown in arrival order
- Up to ~14 metrics displayed at once (scrollable)
- Pin/unstar button on each card

**Sparkline Rendering**
- Embedded micro-charts (7–30 points per sparkline)
- Samples data if > 80 points available
- Updates at ~2.5 Hz for smooth visual feedback

### Top Control Bar
Application-level controls and broadcast operations:

**View Navigation**
- Tab switcher: Dashboard ↔ Control ↔ Raw
- Visual indicator of active view

**Broadcast Relay Control**
- Aggregate relay state across all online devices
- Quick-toggle buttons for relays (e.g., Relay 1, Relay 2, Relay 3, Relay 4)
- Relay states: ON (green), OFF (red), MIXED (yellow, some on/off), UNKNOWN (gray)
- Single click broadcasts `relay.set` command to all online devices
- Adaptive relay key detection (reads from device state; falls back to defaults [1,2,3,4])

**Connection Status Badge**
- MQTT connection state: Connected, Connecting, Reconnecting, Offline
- Color-coded (green=ok, yellow=warn, red=error)
- URL and error message on hover

### Notification System
In-app event log with visual feedback:

**Notification Levels**
- **Info** (blue): General messages
- **OK** (green): Success, device online, data fresh
- **Warn** (yellow): Stale data (> 5s no update), reconnecting
- **Bad** (red): Device offline, MQTT disconnected, errors

**Event Capture**
- Device online/offline transitions
- Stale ↔ fresh data state changes
- MQTT connection state changes
- Command sent/received with device context
- Notification retention: Last 40 messages in dashboard, up to 400 in memory

**Time-Stamped Display**
- ISO-8601 timestamps for correlation with telemetry
- Device ID context for multi-device logs
- Searchable/filterable by event type

### Device Discovery & Filtering

**Auto-Discovery**
- Dynamically populates device list as MQTT messages arrive
- Online status: calculated from `latestSeen` timestamp vs. stale threshold
- Tracks online, offline, and stale devices in separate counters

**Device List UI**
- Searchable device filter
- Compact and expanded list views
- Quick-select from compact list
- Color-coded badges (online, offline, stale)
- Click to pin/focus device in charts

### Data Handling & Formatting

**Payload Parsing**
- Auto-detects JSON, text, or binary payloads
- JSON prettified for display; falls back to text UTF-8 decode
- Empty payload handling (marked as "empty")
- Graceful error handling (malformed JSON → text display)

**Numeric Formatting**
- Smart precision: `0.001` for values < 10, `0.01` for < 100, `0.1` for < 1000, `0` for ≥ 1000
- Unit inference from field names: `temp_c` → °C, `pressure_psi` → psi, etc.
- Null/undefined → `—` placeholder

**Time-Series Aggregation**
- Sliding window per metric (up to 5000 points)
- Automatic stale removal (configurable, default 5s)
- Efficient decimation for charting (samples if > 80 points)
- Relative time formatting: `-45s`, `-2m` for easy trend reading

### Local Storage Persistence

## Architecture Overview (Refactored)

As of the latest refactoring, Pulsar UI follows a **modular, layered architecture**:

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
    │   [React Render] ← Batched per frame
    │
    ├─→ [command-publisher.js] ← Command sending & ACK resolution (pure JS)
    └─→ [useNotifications.js] ← Notification state hook
         ↓
    UI Views (DashboardView, ControlView, RawView)
```

### Design Principles

1. **Separation of Concerns**: Business logic (services) isolated from React state management (hooks)
2. **Pure JavaScript Services**: All services have zero React dependencies, enabling independent unit testing
3. **Callback-Based State Updates**: Services communicate via callbacks, keeping them decoupled from React
4. **Performance-First Hot Path**: MQTT handler runs outside React render cycle; RAF batching defers expensive renders
5. **Ref-Based State**: High-frequency data (devices, series) stored in Refs to avoid unnecessary re-renders

### Local Storage Persistence
- Per-session list of metrics to monitor on dashboard
- Survives page reload
- Default: `["pressure_psi", "mass_g", "temp_c"]`

**Pinned Metrics** (`pulsarui:pinnedFields:<device-id>`)
- Per-device list of pinned metrics in Live Metrics panel
- Up to 24 pinned metrics per device
- Auto-cleared when switching devices

### Accessibility & Responsiveness

- **Semantic HTML**: Proper `<label>`, `<button>`, `<input>` usage for screen readers
- **Keyboard Navigation**: Tab through controls, Enter to submit forms
- **Color Blind Friendly**: Icons + text labels (not color-only status)
- **Mobile Layout**: Single-column grid adapts for smaller screens (cards stack)
- **Touch Friendly**: Large buttons, clear visual targets

## Core Modules

### Infrastructure

#### [config.js](ui/src/config.js)
Loads runtime configuration from `/config.json` (generated from `config.template.json`). Provides MQTT WebSocket URL, subscription topics, and timeout settings. Falls back to sensible defaults if config fetch fails.

**Key Exports**: `loadRuntimeConfig()`

#### [mqtt.js](ui/src/mqtt.js)
Wraps the MQTT.js client for WebSocket connections. Emits connection state changes and message events. Handles reconnection logic, error propagation, and clean subscriptions.

**Key Exports**: `connectMqtt({ url, onState, onMessage })`

#### [topic.js](ui/src/topic.js)
Parses Pulsar topic paths (e.g., `pulsar/device01/telemetry/temperature`) to extract device ID, message type, and metric name. Enables hierarchical organization of device data.

**Key Exports**: `parsePulsarTopic(topicString)`

#### [timeseries.js](ui/src/timeseries.js)
Aggregates incoming MQTT messages into time-series data structures. Handles data point insertion, stale removal, and sampling for efficient rendering. Maintains sliding windows per metric.

**Key Exports**: `pushPoint(dataStore, deviceId, metricName, timestamp, value)`

### Utilities (`src/utils/`)

#### [helpers.js](ui/src/utils/helpers.js)
General-purpose utility functions extracted from App.jsx.

**Key Exports**:
- `nowIsoMs()` – ISO-8601 timestamp with milliseconds
- `newId()` – Generates crypto.randomUUID or fallback
- `safeJsonStringify(value)` – JSON.stringify with error handling
- `isFiniteNumber(value)` – Type-safe finite number check

#### [parsing.js](ui/src/utils/parsing.js)
Payload parsing and field extraction utilities.

**Key Exports**:
- `tryParsePayload(payloadU8)` – Auto-detects JSON/text/binary, parses gracefully
- `extractNumericFields(object)` – Extracts numeric fields, filters metadata

### Services (`src/services/`)

Pure JavaScript modules (no React dependencies) for business logic. All services use callback pattern for state updates.

#### [device-registry.js](ui/src/services/device-registry.js)
Device state machine for creation, status tracking, and lifecycle.

**Key Exports**:
- `ensureDevice(map, id)` – Create/retrieve device with nested Maps
- `computeStale(device, staleAfterMs)` – Set stale flag based on timeout
- `computeOnline(device, staleAfterMs)` – Calculate online status (3x stale threshold, min 15s)
- `getDeviceRole(device)` – Extract device_type from metadata

#### [mqtt-handler.js](ui/src/services/mqtt-handler.js)
MQTT message parsing and device state updates. Factory-created with injected dependencies.

**Key Exports**:
- `createMqttMessageHandler(options)` – Returns handler function
  - Parses topics and payloads
  - Updates device state from telemetry/status/state/meta topics
  - Routes ACK messages to pending commands
  - Ingests data into time-series
  - Callbacks: `onAckResolved(ackInfo)`, `onDeviceChanged()`

#### [command-publisher.js](ui/src/services/command-publisher.js)
Command publishing and broadcast utilities.

**Key Exports**:
- `publishCommand(options)` – Send command to single device
- `broadcastCommand(options)` – Send command to all online devices
  - Manages pending command state
  - Timeout handling after `commandTimeoutMs`
  - Callbacks: `onCommandSent(sentInfo)`, `onCommandTimeout(timeoutInfo)`

### Custom Hooks (`src/hooks/`)

#### [useRafBatching.js](ui/src/hooks/useRafBatching.js)
Performance optimization hook that batches rapid updates into requestAnimationFrame cycles.

**Key Exports**:
- `useRafBatching()` – Returns `{ scheduleUpdate, tick }`
- Queues callbacks for next rAF frame
- Batches multiple MQTT packets before single React setState
- **Impact**: 5-7x FPS improvement (4 Hz → 20-30 Hz effective refresh)

#### [useNotifications.js](ui/src/hooks/useNotifications.js)
Notification state management with in-memory buffer.

**Key Exports**:
- `useNotifications()` – Returns `{ notifItems, pushNotif, clearNotifs }`
- `pushNotif(level, title, detail, device)` – Enqueue notification
- Keeps up to 400 notifications in history
- Auto-unshifts new notifications to front

### Root Component

#### [App.jsx](ui/src/App.jsx)
Main orchestrator component (350 lines). Manages React state for connection/UI/settings, creates MQTT handler via factory, delegates rendering to specialized views.

**Key Responsibilities**:
- Load config and establish MQTT connection
- Coordinate device registry, time-series data, and notifications
- Detect stale/online status every 500ms
- Dispatch to DashboardView, ControlView, or RawView based on tab selection
- Use RAF batching for 10 Hz device tick refresh + smooth visualization

**State Management**: React hooks (`useState`, `useRef`, `useEffect`, `useMemo`)

### UI Components

| Component | Purpose |
|-----------|---------|
| **DashboardView** | Grid of device status cards with key metrics |
| **ControlView** | Send commands to devices, adjust settings |
| **RawView** | Raw MQTT message browser (topic, payload, timestamp) |
| **LiveMetrics** | Scrollable list of active metrics with sparklines |
| **DeviceList** | Searchable, filterable device inventory |
| **MetricCard** | Single metric display with unit, value, trend |
| **PlotCard** | Recharts wrapper for time-series line/bar charts |
| **Sparkline** | Micro chart (7–30 data points) for quick trends |
| **TopControlBar** | View switcher, connection status, refresh controls |

## Configuration

### Environment Variables & Runtime Config

**Docker environment** (`docker-compose.yml`):
```yaml
environment:
  - MQTT_WS_URL=ws://pulsarpi.local:9001
  - MQTT_TOPIC=pulsar/+/telemetry/#
```

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

The `99-gen-config.sh` entrypoint script injects `MQTT_WS_URL` and `MQTT_TOPIC` environment variables into `config.json` at container startup.

## Build & Deployment

### Local Development

```bash
cd ui
npm install
npm run dev  # Start dev server with HMR on 0.0.0.0:5173
```

Access at `http://localhost:5173`. Environment variables can be set via `.env` file or shell exports.

### Production Build

```bash
npm run build       # Outputs to ui/dist/
npm run preview     # Preview optimized build on 0.0.0.0:4173
```

### Docker Deployment

**Multi-stage build**:
1. Build stage: Node 20-Alpine → Vite compilation to `dist/`
2. Runtime stage: Nginx 1.27-Alpine → Serves `dist/` + dynamic `config.json`

```bash
docker build -f ui/Dockerfile -t pulsar/pulsar-ui:latest ./ui
docker run -p 8080:80 -e MQTT_WS_URL=ws://pulsarpi.local:9001 pulsar/pulsar-ui
```

**Via Docker Compose**:
```bash
docker-compose up -d  # Assumes pulsar_net bridge already exists
```

Accessible at `http://localhost:8080`

## Nginx Configuration

[nginx.conf](ui/nginx.conf) configures:
- Static file serving from `/usr/share/nginx/html` (Vite dist output)
- Dynamic `config.json` generation via shell script
- Reverse proxy rules (if applicable)
- CORS headers for MQTT WebSocket bridge

## MQTT Topic Contract

Pulsar UI expects topics following the v1 contract:

| Topic Pattern | Purpose |
|---------------|---------|
| `pulsar/+/telemetry/#` | Sensor readings (temperature, humidity, etc.) |
| `pulsar/+/status` | Device connectivity & health status |
| `pulsar/+/state/#` | Device state (on/off, mode, etc.) |
| `pulsar/+/meta/#` | Device metadata (model, firmware, etc.) |
| `pulsar/+/ack/#` | Command acknowledgments |
| `pulsar/+/event/#` | System events & notifications |

### Recommended Payload Schemas

For `pulsar/+/event/#` topics:
```json
{
  "id": "<uuid>",
  "ts_unix_ms": 1234567890,
  "severity": "info|warn|error",
  "msg": "...",
  "data": {...}
}
```

For `pulsar/+/ack/#` topics:
```json
{
  "id": "<cmd-id>",
  "ok": true|false,
  "error": "..."
}
```

Payloads can be JSON, text, or binary; the app auto-parses and handles gracefully.

## Dependencies

### Production
- **react** (18.3.1): UI framework
- **react-dom** (18.3.1): React DOM rendering
- **mqtt** (5.7.0): MQTT client with WebSocket support
- **recharts** (3.7.0): Chart library

### Development
- **vite** (5.4.11): Build tool & dev server
- **@vitejs/plugin-react** (4.3.4): Fast Refresh for React

## Networking

- **Default Dev Port**: 5173
- **Docker Exposed Port**: 8080 → 80 (Nginx)
- **MQTT WebSocket Port**: 9001 (configurable)
- **Docker Network**: `pulsar_net` (bridge, external)

## Recent Improvements

### Architectural Refactoring (Phase 6)
- **App.jsx reduced**: 961 lines → 350 lines (-63%)
- **Modular services**: Extracted device-registry, mqtt-handler, command-publisher as pure JS modules
- **Reusable utilities**: Created helpers.js and parsing.js for common functions
- **Custom hooks**: Added useRafBatching and useNotifications for encapsulated state logic
- **Testability**: Services have zero React dependencies, enabling independent unit testing

### Refresh Rate Improvements
- **Device updates**: 10 Hz (100ms throttle on `bumpDeviceTick()`)
- **Raw view**: 10 Hz (100ms message refresh interval)
- **Stale/online detection**: 500ms (background housekeeping)
- **RAF batching**: Queues rapid MQTT packets for single rAF cycle, achieving 5-7x visualization improvement

## Notes

- The app uses React Hooks for all state management (no Redux/Context wrapper by default)
- Time-series data is held in-memory; refresh page to reset
- Stale data (no updates for 5s) is automatically pruned
- MQTT reconnect backoff: 1.5s interval, 5s timeout
- Vite's fast refresh enables instant HMR during development
- **Performance**: Tier 1 implementation (useRafBatching) delivers 5-7x faster packet visualization (~20-30 Hz effective refresh with 10 Hz device tick). See [TIER1_IMPLEMENTATION.md](./TIER1_IMPLEMENTATION.md) for testing details.
- **Git**: Internal documentation files (TIER1_*.md, ARCHITECTURE.md, REFACTORING_SUMMARY.md, PERFORMANCE_TESTING.js) are excluded via `.gitignore`; only README.md is published.
