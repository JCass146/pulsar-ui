import { useEffect } from 'react';
import { useDeviceRegistry } from '@/stores/device-registry';
import { usePinnedMetrics } from '@/stores/pinned-metrics';
import { useTelemetry } from '@/stores/telemetry';

const STORAGE_KEY = 'pulsar:metric-priority-initialized';

export type MetricPriority = 'high' | 'medium' | 'low';

export interface MetricPriorityMap {
  [metric: string]: MetricPriority;
}

export interface DeviceCapabilities {
  v?: number;
  device_type?: string;
  telemetry_fields?: string[];
  metric_priority?: MetricPriorityMap;
  commands?: string[];
  relays?: number;
}

/**
 * Auto-books metrics to 'main' or 'live' based on device firmware metric_priority.
 * 
 * Priority mapping:
 * - 'high': books to 'main' (featured on main dashboard)
 * - 'medium': books to 'live' (featured in Live Metrics sidebar)
 * - 'low': left unbooked (appears in All tab)
 * 
 * Uses localStorage to track initialization, so it only runs once.
 */
export function useMetricPriority() {
  const devicesMap = useDeviceRegistry((state) => state.devices);
  const buffers = useTelemetry((state) => state.buffers);
  const setBookmark = usePinnedMetrics((state) => state.setBookmark);
  const getBookmarkType = usePinnedMetrics((state) => state.getBookmarkType);

  useEffect(() => {
    // Check if we've already initialized bookmarks
    const initialized = localStorage.getItem(STORAGE_KEY);
    if (initialized) return;

    // Collect all devices and their metrics
    for (const [deviceId, deviceInfo] of devicesMap.entries()) {
      // Get device capabilities from metadata
      // Note: Device.metadata is just a Record<string, unknown>, capabilities come from meta MQTT messages
      // We access it through the device info's metadata field
      const capabilitiesObj = deviceInfo.metadata?.['capabilities'];
      if (!capabilitiesObj) continue;

      const capabilities = capabilitiesObj as DeviceCapabilities;
      if (!capabilities?.metric_priority) continue;

      const metricPriority = capabilities.metric_priority;
      const buffer = buffers.get(deviceId);
      if (!buffer) continue;

      // For each metric in the buffer, auto-book based on priority
      for (const metric of buffer.keys()) {
        // Skip relay and health metrics
        if (metric.startsWith('relay_') || metric === 'health') continue;

        // Check if already bookmarked (don't override user preferences)
        if (getBookmarkType(deviceId, metric) !== null) continue;

        const priority = metricPriority[metric];
        if (!priority) continue;

        // Auto-book based on priority
        if (priority === 'high') {
          setBookmark(deviceId, metric, 'main');
        } else if (priority === 'medium') {
          setBookmark(deviceId, metric, 'live');
        }
        // 'low': leave as null (unbooked)
      }
    }

    // Mark as initialized
    localStorage.setItem(STORAGE_KEY, 'true');
  }, [devicesMap, buffers, setBookmark, getBookmarkType]);
}
