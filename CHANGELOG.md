# Changelog

All notable changes to Pulsar UI are documented in this file.

## [Unreleased] - 2026-01-28

### Added - UI Polish & Layout Fixes
- Fixed missing `StatusBadge` component in CommandQueue.jsx with proper status icons and colors
- Fixed missing `DeviceChip` import in DashboardView.jsx
- Added `display: flex; flex-direction: column` to `.card` class for better content flow
- Added `flex: 1; min-height: 0; overflow-y: auto` to `.controls` and `.feed` classes for proper scrolling
- Added `line-height: 1.4` to `label` elements for better text spacing
- Added `line-height: 1.4; margin-top: 2px` to `.hint` class for improved readability
- Added `min-height: 0` to `.grid` class to prevent overflow issues
- Added `min-height: 0; flex: 1` to `.controlViewMain` for proper containment
- Added `overflow: hidden` to `.app` class for top-level containment
- Removed unused `Row` component and `filteredNotifications` variable from VirtualizedNotifications.jsx
- Updated notification footer to use `filteredGroups.length` instead of `filteredNotifications.length`

### Fixed
- Text overlapping and clipping issues across UI
- Controls card border clipping
- Proper scroll behavior in content areas
- Card containment and layout flow

## [2026-01-27] - Comprehensive Refactor & Professional Features

### Added - Density & Visual Polish Refactor
- **Command Staging & Preview System** (Step 12)
  - All commands now require explicit review before execution
  - Preview modals show device, action, payload, and authority requirements
  - Expert mode toggle to bypass staging for safe commands
  - Dangerous command detection (system.reboot, firmware.update, etc.)
  
- **Device Capabilities Panel** (Step 13)
  - New DeviceCapabilities.jsx component
  - Automatic inference of supported commands from device state
  - Feature detection from meta topics
  - Display of sensors, actuators, and device capabilities
  - Unknown capability handling with subscription hints

- **Scenario & Sequencing Support** (Step 14)
  - Multi-step command sequences with progress tracking
  - Scenario editor with step management
  - localStorage persistence for scenarios
  - Import/export functionality for scenario sharing
  - Step-by-step execution with timing control
  - Progress indicators and execution status

- **Notification Grouping** (Step 15)
  - Grouped notifications by (device + error type) instead of category
  - Auto-expansion for new fault groups
  - Count indicators showing notifications per group
  - Expandable detail view for each notification group
  - Sticky faults section for active errors
  - Reduced cognitive load through intelligent grouping

- **Consistent Chart Sizing** (Step 16)
  - Fixed 268px height for all plot cards (48px header + 220px chart)
  - CSS Grid layout with `repeat(auto-fit, 268px)` for consistent rows
  - Removed dynamic height calculations
  - Flex layout structure for chart components
  - Prevented layout jank through fixed dimensions

### Changed - Architecture Improvements
- **Refactored notification system** to use grouped display with device-level aggregation
- **Enhanced command workflow** with staging and preview modals
- **Improved chart layout** using fixed dimensions and CSS Grid
- **Modernized template system** with scenario support and tabs
- Updated CommandQueue.jsx to show staged commands before execution
- Updated CommandTemplates.jsx with scenario tab and execution tracking
- Modified PlotCard.jsx to use fixed 220px chart height
- Enhanced ControlView.jsx with capabilities panel and command staging integration
- Improved VirtualizedNotifications.jsx with grouping and auto-expansion logic

### Fixed - Visual & UX Issues
- Notification spam from repeated errors (now grouped)
- Inconsistent chart heights causing layout jank
- Lack of command preview safety
- Unknown device capabilities
- No scenario automation support

## [Previous] - Architectural Refactoring & Performance

### Added - App.jsx Refactoring (Phase 6)
- **New Services Layer** (pure JavaScript, zero React dependencies):
  - `device-registry.js` - Device state machine (ensureDevice, computeStale, computeOnline, getDeviceRole)
  - `mqtt-handler.js` - MQTT message parsing and device updates (createMqttMessageHandler factory)
  - `command-publisher.js` - Command publishing and broadcast (publishCommand, broadcastCommand)
  - `event-handler.js` - Event tracking for timeline (getEventsForChart, purgeOldEvents)
  - `error-handler.js` - Global error handling (safeExecute wrapper)

- **New Utility Modules**:
  - `helpers.js` - General utilities (nowIsoMs, newId, safeJsonStringify, isFiniteNumber, formatDuration)
  - `parsing.js` - Payload parsing (tryParsePayload, extractNumericFields)
  - `persistence.js` - localStorage management (pinned metrics, templates, scenarios)
  - `CircularBuffer.js` - Efficient ring buffer for time-series data

- **New Custom Hooks**:
  - `useRafBatching.js` - RAF batching for 5-7x performance improvement
  - `useNotifications.js` - Notification state management
  - `useDebounce.js` - Debouncing utilities
  - `useDeviceRegistry.js` - Device registry hook
  - `useMqttConnection.js` - MQTT connection lifecycle

- **Performance Optimization** (Tier 1):
  - requestAnimationFrame batching for MQTT packets
  - Single React render per frame boundary
  - 5-7x FPS improvement (4 Hz → 20-30 Hz effective refresh)
  - Virtualized lists with React Window
  - Ref-based state for high-frequency data

### Changed - Architecture
- **App.jsx reduced from 961 lines → 350 lines** (-63%)
- Separated business logic from React state management
- Callback-based state updates to decouple services from React
- Modular services with single responsibilities
- Pure JavaScript services enable independent unit testing

### Added - Milestone 3: Command Workflows
- **Command Queue** (`CommandQueue.jsx`):
  - Active command queue showing pending commands
  - Progress bars for command timeouts
  - Command history with status (pending, sent, acked, timeout, failed, cancelled)
  - Cancel and retry support
  - Expandable payload and error details

- **Command Templates** (`CommandTemplates.jsx`):
  - Built-in command templates library
  - Custom template creation and editing
  - Template categories and search filters
  - localStorage persistence
  - Template duplication and deletion
  - Import/export functionality

- **Authority Control** (`AuthorityControl.jsx`):
  - Three authority levels: VIEW, CONTROL, ARMED
  - `useAuthorityControl()` hook for state management
  - `AuthorityBadge` component for visual indication
  - `ArmedTimer` with 30-second auto-expire
  - `AuthoritySelector` modal with ARM confirmation
  - `CommandGate` wrapper to block unauthorized commands
  - Dangerous action gating (firmware updates, factory reset, etc.)

### Added - UI Components & Features
- **DeviceChip Component**: Consistent device identity display across all views
  - Friendly name support
  - Short device ID (e.g., 743B…CBB0)
  - Health dot indicators
  - Optional role/tag display
  - Multiple size variants (small, medium, large)
  - DeviceChipGroup and DeviceChipLegend variants

- **Theme Support**:
  - Light/dark theme with CSS custom properties
  - ThemeContext provider
  - ThemeToggle component
  - Comprehensive theming for all UI elements

- **GlobalStatusBar Enhancements**:
  - MQTT connection status
  - Fleet statistics (online/offline/stale devices)
  - Authority level badge (when not on Control tab)
  - Armed timer display
  - Pause/resume controls

- **Enhanced Views**:
  - **DashboardView**: Grid layout with plot cards, device selection, notification rail
  - **ControlView**: Command center with authority control, queue, templates, capabilities
  - **RawView**: Fleet panel, message browser, retained state bank
  - **TimelineView**: Event tracking with filtering and severity levels

### Changed - UI Improvements
- **Density System**: Consistent spacing using CSS custom properties
- **Fixed Visual Bugs**: Resolved layout issues, spacing inconsistencies, alignment problems
- **Redundancy Elimination**: Removed duplicate code and streamlined components
- **Improved Notifications**: Category filters, sticky faults, virtualized rendering
- **Enhanced Device List**: Virtualized rendering, search, filtering, compact/expanded views
- **Better Metrics Display**: LiveMetricsRail with sparklines and pinning support

### Fixed - Bugs & Issues
- Theme switching now properly updates all UI elements
- Light theme renders correctly with proper contrast
- MQTT reconnection logic improved with backoff
- Stale/online detection accuracy improved
- Command timeout handling enhanced
- Notification overflow handled with virtualization

## [Initial Release] - Core Features

### Added - Foundation
- React 18.3 with Vite 5.4 build system
- MQTT 5.7 WebSocket client integration
- Recharts 3.7 for time-series visualization
- Basic device discovery and telemetry display
- Raw MQTT message viewer
- Docker containerization with Nginx
- Multi-stage Docker build
- Runtime configuration via environment variables

### Added - Core UI Components
- Dashboard view with device grid
- Control view for command sending
- Raw view for MQTT inspection
- Device list with filtering
- Metric cards with sparklines
- Plot cards with time-series graphs
- Top control bar with navigation
- Status badges and indicators

### Added - Data Handling
- MQTT topic parsing (pulsar/+/telemetry/#, etc.)
- Payload auto-detection (JSON/text/binary)
- Time-series data aggregation
- Circular buffer for efficient storage
- Numeric field extraction
- Unit inference from field names

### Added - Device Management
- Auto-discovery from MQTT messages
- Online/offline/stale status tracking
- Device role inference from metadata
- State/meta topic handling
- Command acknowledgment pattern
- Pending command tracking

---

## Version History Summary

| Version | Date | Key Changes |
|---------|------|-------------|
| Unreleased | 2026-01-28 | UI polish, layout fixes, component cleanup |
| 2026-01-27 | 2026-01-27 | Comprehensive refactor, professional features, density system |
| Previous | 2026-01 | Architectural refactoring, performance optimization (5-7x), Milestone 3 |
| Initial | 2025 | Core features, MQTT integration, basic UI |

---

## Migration Notes

### From Previous → 2026-01-27
- **Breaking Changes**: None (backward compatible)
- **New Features**: Command staging, device capabilities, scenarios, notification grouping
- **UI Changes**: Fixed chart dimensions, grouped notifications, capabilities panel
- **Performance**: Chart sizing improvements prevent layout jank

### From Initial → Previous
- **Breaking Changes**: App.jsx refactored (internal only, no API changes)
- **New Features**: RAF batching (5-7x performance), command workflows, authority control
- **Architecture**: Services layer extracted, hooks added, utilities modularized
- **Performance**: 4 Hz → 20-30 Hz effective refresh rate

---

## Upcoming Features

### Planned
- [ ] Web Workers for MQTT processing (Tier 2 performance)
- [ ] Canvas/WebGL rendering for charts (Tier 3 performance)
- [ ] TypeScript migration for type safety
- [ ] Unit test suite for services
- [ ] Integration tests for MQTT flows
- [ ] Advanced charting options (zoom, pan, annotations)
- [ ] Custom dashboard layouts
- [ ] Device grouping and tagging
- [ ] Alert rules engine
- [ ] Historical data export

### Under Consideration
- [ ] GraphQL API integration
- [ ] Multi-user support with authentication
- [ ] Role-based access control
- [ ] Audit log for command history
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)

---

## Development Guidelines

### Contributing
1. All services must be pure JavaScript (no React dependencies)
2. Use callback pattern for state updates from services
3. Components should be focused on single responsibility
4. Maintain backward compatibility for MQTT topic contract
5. Write tests for new services
6. Document all configuration options
7. Update CHANGELOG.md for all user-facing changes

### Versioning
This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR**: Incompatible API/topic contract changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, performance improvements

---

**Last Updated**: January 28, 2026
