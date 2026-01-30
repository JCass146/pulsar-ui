import { z } from 'zod';

/**
 * Time-series data point
 */
export interface TimeSeriesPoint {
  ts: number; // Unix timestamp ms
  value: number;
}

/**
 * Telemetry message schema from MQTT
 */
export const TelemetryMessageSchema = z.object({
  value: z.number(),
  ts: z.number(),
  unit: z.string().optional(),
});

export type TelemetryMessage = z.infer<typeof TelemetryMessageSchema>;

/**
 * Metric metadata
 */
export interface MetricInfo {
  name: string;
  unit?: string;
  min?: number;
  max?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

/**
 * Telemetry buffer configuration
 */
export interface BufferConfig {
  maxSize: number; // Maximum points to retain
  maxAge?: number; // Maximum age in ms (optional)
}
