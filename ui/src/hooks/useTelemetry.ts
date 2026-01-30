import { useTelemetry } from '@/stores/telemetry';
import { TimeSeriesPoint } from '@/types/telemetry';

/**
 * Hook to access telemetry data for a device metric
 */
export function useMetricData(
  deviceId: string | null,
  metric: string
): {
  points: TimeSeriesPoint[];
  latestValue: number | undefined;
  isEmpty: boolean;
} {
  const points = useTelemetry((state) =>
    deviceId ? state.getPoints(deviceId, metric) : []
  );
  const latestValue = useTelemetry((state) =>
    deviceId ? state.getLatestValue(deviceId, metric) : undefined
  );

  return {
    points,
    latestValue,
    isEmpty: points.length === 0,
  };
}

/**
 * Hook to access latest value for multiple metrics
 */
export function useDeviceMetrics(
  deviceId: string | null,
  metrics: string[]
): Map<string, number | undefined> {
  const values = new Map<string, number | undefined>();

  for (const metric of metrics) {
    const value = useTelemetry((state) =>
      deviceId ? state.getLatestValue(deviceId, metric) : undefined
    );
    values.set(metric, value);
  }

  return values;
}
