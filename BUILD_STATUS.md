# Pulsar UI - Modern Architecture Rebuild Status

## Overview
Complete rewrite of pulsar-ui with modern TypeScript, Zustand state management, and atomic design component library.

## Architecture

### Tech Stack
- **TypeScript 5.7**: Strict mode with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
- **React 18.3**: Modern React with hooks and concurrent features
- **Zustand 5.0**: Minimal, fast state management (no Redux boilerplate)
- **Vite 5.4**: Fast dev server and optimized builds
- **MQTT.js 5.7**: WebSocket client for real-time telemetry
- **Zod 3.23**: Runtime type validation for MQTT messages
- **Vitest 2.1**: Fast unit testing with jsdom
- **CSS Modules**: Component-scoped styling
- **Recharts 3.7**: Time-series charting (ready for integration)

### Project Structure
```
ui/
├── src/
│   ├── types/               # TypeScript type definitions
│   │   ├── device.ts        # Device, DeviceHealth, Capability schemas
│   │   ├── telemetry.ts     # TimeSeriesPoint, TelemetryMessage schemas
│   │   ├── command.ts       # Command, AuthorityLevel, CommandStatus
│   │   └── mqtt.ts          # ConnectionState, MqttConfig, ParsedTopic
│   │
│   ├── stores/              # Zustand state stores
│   │   ├── device-registry.ts   # Map<deviceId, Device>, filtering, CRUD
│   │   ├── telemetry.ts         # CircularBuffer + RAF batching
│   │   ├── command-queue.ts     # Command lifecycle tracking
│   │   └── ui.ts                # Theme, sidebar, authority (with localStorage)
│   │
│   ├── services/            # Business logic layer
│   │   └── mqtt/
│   │       ├── client.ts    # Singleton MqttClient, connection management
│   │       ├── handlers.ts  # Message routing, device updates
│   │       └── parser.ts    # Topic parsing/building
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useMqtt.ts       # MQTT connection + subscription
│   │   ├── useDevice.ts     # Device queries (single, list, filtered)
│   │   ├── useTelemetry.ts  # Telemetry data access (points, latest)
│   │   └── useCommand.ts    # Command staging, execution, history
│   │
│   ├── components/          # Atomic design component library
│   │   ├── atoms/
│   │   │   ├── Button/      # 3 variants × 3 sizes
│   │   │   ├── Card/        # Card, CardHeader, CardBody, CardFooter
│   │   │   ├── Input/       # Text input with label, error states
│   │   │   ├── Pill/        # Badge-style tags (6 variants)
│   │   │   └── StatusBadge/ # Connection/health status indicator
│   │   │
│   │   └── molecules/
│   │       ├── DeviceChip/  # Device display with health badge
│   │       └── MetricCard/  # Telemetry value with thresholds, trends
│   │
│   ├── styles/              # Global CSS
│   │   ├── tokens.css       # Design system (single source of truth)
│   │   ├── base.css         # Resets, HTML element styles
│   │   ├── layout.css       # Grid, flexbox utilities
│   │   └── utilities.css    # Helper classes
│   │
│   ├── App.tsx              # Test app showcasing components
│   ├── main.tsx             # React 18 entry point
│   └── vite-env.d.ts        # Environment variable types
│
├── tsconfig.json            # TypeScript strict config + path aliases
├── vite.config.js           # Vite with path alias resolution
├── vitest.config.ts         # Test configuration
├── package.json             # Dependencies and scripts
├── Dockerfile               # Multi-stage Docker build
└── nginx.conf               # Production nginx config
```

## Completed Components

### Atoms (7 components)
1. **Button** (`atoms/Button/`)
   - Variants: `primary`, `secondary`, `danger`
   - Sizes: `sm`, `md`, `lg`
   - Props: Extends `ButtonHTMLAttributes`
   - CSS Module with hover/active/disabled states

2. **Card** (`atoms/Card/`)
   - Sub-components: `Card`, `CardHeader`, `CardBody`, `CardFooter`
   - Props: `interactive` (hover effects), extends `HTMLAttributes<HTMLDivElement>`
   - CSS Module with glass morphism and shadows

3. **Input** (`atoms/Input/`)
   - Features: Label, placeholder, error messages
   - Sizes: `sm`, `md`, `lg`
   - States: Hover, focus, disabled, error
   - CSS Module with focus rings and error styling

4. **Pill** (`atoms/Pill/`)
   - Variants: `default`, `primary`, `success`, `warning`, `danger`, `info`
   - Sizes: `sm`, `md`, `lg`
   - Uppercase, rounded badge design
   - CSS Module with color-mix for backgrounds

5. **StatusBadge** (`atoms/StatusBadge/`)
   - Displays: `ConnectionState` or `DeviceHealth`
   - Features: Colored indicator dot with shadow
   - Sizes: `sm`, `md`, `lg`
   - Auto-mapped labels and colors

### Molecules (2 components)
1. **DeviceChip** (`molecules/DeviceChip/`)
   - Displays: Device ID, role, last-seen timestamp
   - Features: Health-colored badges (healthy/warning/offline/unknown)
   - Time formatting: "just now", "5s ago", "3m ago"
   - Clickable with selected state
   - CSS Module with health-specific colors

2. **MetricCard** (`molecules/MetricCard/`)
   - Displays: Metric label, value, unit
   - Features: Min/max thresholds with alert styling
   - Trend indicators: Up/down arrows with colors
   - Null value handling ("—" placeholder)
   - CSS Module with alert variants

## State Management (Zustand Stores)

### Device Registry Store
```typescript
interface DeviceRegistryState {
  devices: Map<string, Device>;
  selectedDeviceId: string | null;
  filter: DeviceFilter;
  
  // Actions
  addDevice(device: Device): void;
  updateDevice(id: string, updates: Partial<Device>): void;
  removeDevice(id: string): void;
  selectDevice(id: string | null): void;
  setFilter(filter: Partial<DeviceFilter>): void;
  clearFilter(): void;
  
  // Selectors
  getFilteredDevices(): Device[];
  getDevicesByHealth(health: DeviceHealth): Device[];
}
```

### Telemetry Store
```typescript
class CircularBuffer {
  push(point: TimeSeriesPoint): void;
  getPoints(maxAge?: number): TimeSeriesPoint[];
  getLatest(): TimeSeriesPoint | null;
  clear(): void;
  size(): number;
}

interface TelemetryState {
  buffers: Map<string, CircularBuffer>; // key: `${deviceId}:${metric}`
  
  // RAF-batched actions
  addPoint(deviceId: string, metric: string, point: TimeSeriesPoint): void;
  getMetricData(deviceId: string, metric: string): {
    points: TimeSeriesPoint[];
    latestValue: number | null;
    isEmpty: boolean;
  };
}
```

### Command Queue Store
```typescript
interface CommandQueueState {
  stagedCommand: Command | null;
  pendingCommands: Map<string, Command>;
  history: Command[];
  
  // Actions
  stageCommand(command: Omit<Command, 'id' | 'status'>): void;
  executeStaged(): void;
  stageAndExecute(command: Omit<Command, 'id' | 'status'>): void;
  updateCommandStatus(id: string, status: CommandStatus): void;
  clearHistory(): void;
  
  // Selectors
  getPendingByDevice(deviceId: string): Command[];
}
```

### UI Store
```typescript
interface UiState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  authorityLevel: AuthorityLevel;
  authorityExpiresAt: number | null;
  
  // Actions
  toggleTheme(): void;
  setTheme(theme: 'light' | 'dark'): void;
  toggleSidebar(): void;
  grantAuthority(level: AuthorityLevel, durationMs: number): void;
  revokeAuthority(): void;
}
```

## MQTT Service Layer

### Client (Singleton)
- Connection management with exponential backoff reconnect
- TypeScript strict mode compatible (optional username/password using spread conditionals)
- Pub/sub methods: `publish()`, `subscribe()`, `unsubscribe()`
- State listeners: `onStateChange((state: ConnectionState) => void)`
- Singleton pattern: `MqttClient.getInstance(config)`

### Handlers
- `handleMessage(topic, payload)`: Routes messages to stores
  - Telemetry → `addPoint()` to CircularBuffer
  - Status → `addDevice()` / `updateDevice()`
  - Events → Console logging (notifications pending)
- `updateDeviceLastSeen(deviceId)`: Calculates health based on time since last message
  - Healthy: < 10s
  - Warning: 10s - 60s
  - Offline: > 60s

### Topic Parser
- Format: `pulsar/{deviceId}/{messageType}/{metric}`
- `parseTopic(topic)`: Returns `{ deviceId, messageType, metric }`
- `buildTopic(deviceId, messageType, metric)`: Constructs topic string

## Custom Hooks

1. **useMqtt.ts** - `useMqttConnection(config)`
   - Initializes MQTT client singleton
   - Sets up message handlers
   - Subscribes to topics: `pulsar/+/telemetry/#`, `pulsar/+/status/#`, `pulsar/+/event/#`
   - Returns: `ConnectionState` (reactive)

2. **useDevice.ts**
   - `useDevice(id)`: Single device by ID
   - `useSelectedDevice()`: Currently selected device + `selectDevice(id)`
   - `useDeviceList()`: Filtered device list + `setFilter()` / `clearFilter()`

3. **useTelemetry.ts**
   - `useMetricData(deviceId, metric)`: Returns `{ points, latestValue, isEmpty }`
   - `useDeviceMetrics(deviceId, metrics[])`: Returns `Map<metric, latestValue>`

4. **useCommand.ts**
   - `useCommand()`: Returns `{ stage, execute, stageAndExecute }`
   - `useCommandHistory()`: Returns `{ pending, history, clearHistory }`

## Performance Optimizations

### RAF Batching (telemetry.ts)
High-frequency telemetry updates are batched using `requestAnimationFrame` to prevent render storms:
```typescript
let rafId: number | null = null;
let pendingUpdates: Array<() => void> = [];

function scheduleUpdate(update: () => void) {
  pendingUpdates.push(update);
  if (rafId === null) {
    rafId = requestAnimationFrame(() => {
      pendingUpdates.forEach(fn => fn());
      pendingUpdates = [];
      rafId = null;
    });
  }
}
```

### Circular Buffers
Telemetry data stored in fixed-size circular buffers with automatic time-based expiration:
- Configurable `maxSize` (default: 1000 points)
- Configurable `maxAge` (default: 1 hour)
- O(1) push, O(n) filtered query
- Automatic old data removal

### Zustand Subscriptions
Only re-render components when specific state slices change (no unnecessary re-renders).

## Docker Build

### Multi-Stage Dockerfile
```dockerfile
# Build stage: Node 20 Alpine
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production=false
COPY . .
RUN npm run build  # Includes TypeScript compilation

# Runtime stage: nginx Alpine
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# ... (crossorigin attribute removal, config template)
```

### Build Commands
- **Dev**: `npm run dev` → Vite dev server on port 5173
- **Build**: `npm run build` → `tsc && vite build` (TypeScript check + bundle)
- **Preview**: `npm run preview` → Preview production build on port 4173
- **Test**: `npm run test` → Vitest watch mode
- **Type-check**: `npm run type-check` → `tsc --noEmit` (validation only)

## Current Status

### ✅ Completed
- [x] TypeScript strict configuration with path aliases
- [x] Type definitions (device, telemetry, command, mqtt)
- [x] Zustand stores (4/4: device-registry, telemetry, command-queue, ui)
- [x] MQTT service layer (client, handlers, parser)
- [x] Custom React hooks (4/4: useMqtt, useDevice, useTelemetry, useCommand)
- [x] Atomic components (5/5: Button, Card, Input, Pill, StatusBadge)
- [x] Molecule components (2/?: DeviceChip, MetricCard)
- [x] Test App.tsx with component showcase
- [x] Dev server running (http://localhost:5173)
- [x] TypeScript strict mode errors resolved
- [x] CSS Modules working with design tokens

### ⏳ In Progress
- [ ] Organism components (need: DeviceList, PlotCard, CommandQueue, NotificationRail, Sidebar)
- [ ] Template components (DashboardLayout)
- [ ] Page components (DashboardView, FleetView, CommandsView, TimelineView)

### 📋 Pending
- [ ] DeviceList with react-window virtualization
- [ ] PlotCard with Recharts integration
- [ ] CommandQueue with command lifecycle UI
- [ ] NotificationRail with event grouping
- [ ] Sidebar navigation
- [ ] Unit tests for stores and services
- [ ] Integration tests with pulsar-core MQTT broker
- [ ] E2E tests with actual device telemetry

## Next Steps

1. **DeviceList Organism** (Priority: High)
   - Virtualized list of DeviceChip components
   - Search/filter integration
   - Selection state management
   - Empty state handling

2. **PlotCard Organism** (Priority: High)
   - Recharts LineChart integration
   - Time range selector (1m, 5m, 15m, 1h, 6h, 24h)
   - Metric selector dropdown
   - Zoom/pan controls
   - Live/paused toggle

3. **CommandQueue Organism** (Priority: Critical - Safety)
   - Pending commands with status indicators
   - Command history with timestamps
   - Retry/cancel actions
   - Authority level gating
   - Confirmation modals for dangerous commands

4. **NotificationRail Organism** (Priority: Medium)
   - Event stream from MQTT
   - Filtering by severity (ok/warn/bad/info)
   - Auto-dismiss or sticky
   - Grouped by device or time

5. **Sidebar Organism** (Priority: Low)
   - Collapsible navigation
   - Page routing
   - Brand logo
   - Utility actions (theme toggle, settings)

6. **Integration Testing** (Priority: High)
   - Test with actual pulsar-core MQTT broker
   - Verify telemetry data flow
   - Test command publishing
   - Validate device health calculations

## Design System (tokens.css)

### Color Palette
```css
--primary-line: #0066ff;
--primary-fill: #0066ff22;

--warn-ok: #10b981;   /* Green */
--warn-warn: #f59e0b; /* Yellow/Orange */
--warn-bad: #ef4444;  /* Red */
--info-default: #3b82f6; /* Blue */

--text-primary: #e5e7eb;   /* Light mode: #111827 */
--text-secondary: #9ca3af;
--text-tertiary: #6b7280;

--surface-default: #1f2937; /* Light mode: #ffffff */
--surface-raised: #374151;
--glass-light: #ffffff22;

--border-divider: #374151;  /* Light mode: #e5e7eb */
--border-hover: #4b5563;
```

### Spacing Scale
```css
--space-xs: 0.25rem;  /* 4px */
--space-sm: 0.5rem;   /* 8px */
--space-md: 1rem;     /* 16px */
--space-lg: 1.5rem;   /* 24px */
--space-xl: 2rem;     /* 32px */
```

### Border Radius
```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

## Path Aliases

Configured in `tsconfig.json` and `vite.config.js`:
```typescript
{
  "@/": "./src/",
  "@/components": "./src/components/",
  "@/stores": "./src/stores/",
  "@/services": "./src/services/",
  "@/hooks": "./src/hooks/",
  "@/types": "./src/types/",
  "@/utils": "./src/utils/",
}
```

## Environment Variables

Defined in `vite-env.d.ts`:
```typescript
interface ImportMetaEnv {
  readonly VITE_MQTT_WS_URL: string;
}
```

Usage:
```typescript
const mqttUrl = import.meta.env.VITE_MQTT_WS_URL || 'ws://localhost:9001';
```

## Deployment

### Portainer Stack
1. Point to GitHub repo: `https://github.com/yourusername/PulsarStack`
2. Portainer builds from Dockerfile (no pre-built image)
3. Environment variables injected via docker-compose.yml:
   ```yaml
   environment:
     - VITE_MQTT_WS_URL=ws://raspberrypi.local:9001
   ```

### Local Development
```bash
cd pulsar-ui/ui
npm install
npm run dev  # http://localhost:5173
```

### Production Build Test
```bash
npm run build
npm run preview  # http://localhost:4173
```

### Docker Build Test
```bash
docker build -t pulsar-ui:latest .
docker run -p 8080:80 -e VITE_MQTT_WS_URL=ws://localhost:9001 pulsar-ui:latest
# Visit http://localhost:8080
```

## Known Issues

### Resolved
- ✅ TypeScript strict mode error with MQTT client optional properties (fixed with spread conditionals)
- ✅ CSS variables not loading in Docker (consolidated to single tokens.css)
- ✅ Card component not accepting style prop (extended HTMLAttributes)

### Open
- ⚠️ Dev server terminal output not captured (process running but silent in PowerShell)
- ⚠️ No unit tests written yet (Vitest configured but empty)
- ⚠️ No integration testing with actual pulsar-core MQTT broker
- ⚠️ No virtualization library installed yet (react-window in package.json but not used)

## Performance Metrics (Target)

- Initial load: < 200ms (Vite code-splitting)
- MQTT message handling: > 100 messages/sec (RAF batching)
- Telemetry buffer: 1000 points/metric, 1-hour retention
- Re-render rate: < 60fps (Zustand selective subscriptions)
- Bundle size: < 500KB gzipped (Vite tree-shaking)

---

**Last Updated**: January 29, 2025  
**Status**: In active development - Component library phase  
**Next Milestone**: Complete organism components (DeviceList, PlotCard, CommandQueue)
