import { create } from 'zustand';
import { TimeSeriesPoint, BufferConfig } from '@/types/telemetry';

/**
 * Circular buffer for time-series data
 */
class CircularBuffer {
  private buffer: TimeSeriesPoint[] = [];
  private maxSize: number;
  private maxAge: number | undefined;

  constructor(config: BufferConfig) {
    this.maxSize = config.maxSize;
    this.maxAge = config.maxAge;
  }

  push(point: TimeSeriesPoint): void {
    // Remove old points if maxAge is set
    if (this.maxAge) {
      const cutoff = Date.now() - this.maxAge;
      this.buffer = this.buffer.filter((p) => p.ts >= cutoff);
    }

    // Add new point
    this.buffer.push(point);

    // Trim to max size
    if (this.buffer.length > this.maxSize) {
      this.buffer = this.buffer.slice(-this.maxSize);
    }
  }

  getPoints(): TimeSeriesPoint[] {
    return [...this.buffer];
  }

  getLatest(): TimeSeriesPoint | undefined {
    return this.buffer[this.buffer.length - 1];
  }

  clear(): void {
    this.buffer = [];
  }

  size(): number {
    return this.buffer.length;
  }
}

/**
 * Telemetry state - tracks buffers for each device/metric combination
 */
interface TelemetryState {
  // Map structure: deviceId -> metric -> CircularBuffer
  buffers: Map<string, Map<string, CircularBuffer>>;
  rafPending: boolean;
  
  // Actions
  addPoint: (deviceId: string, metric: string, point: TimeSeriesPoint) => void;
  getBuffer: (deviceId: string, metric: string) => CircularBuffer | undefined;
  getPoints: (deviceId: string, metric: string) => TimeSeriesPoint[];
  getLatestValue: (deviceId: string, metric: string) => number | undefined;
  clearDevice: (deviceId: string) => void;
  clearMetric: (deviceId: string, metric: string) => void;
}

/**
 * Default buffer config: 100 points, 5 minute retention
 */
const DEFAULT_BUFFER_CONFIG: BufferConfig = {
  maxSize: 100,
  maxAge: 5 * 60 * 1000, // 5 minutes
};

/**
 * Telemetry Zustand store
 */
export const useTelemetry = create<TelemetryState>((set, get) => ({
  buffers: new Map(),
  rafPending: false,

  addPoint: (deviceId, metric, point) => {
    const { buffers } = get();
    
    // Get or create device map
    let deviceMap = buffers.get(deviceId);
    if (!deviceMap) {
      deviceMap = new Map();
      buffers.set(deviceId, deviceMap);
    }

    // Get or create metric buffer
    let buffer = deviceMap.get(metric);
    if (!buffer) {
      buffer = new CircularBuffer(DEFAULT_BUFFER_CONFIG);
      deviceMap.set(metric, buffer);
    }

    // Add point to buffer
    buffer.push(point);

    // Trigger RAF-batched update
    if (!get().rafPending) {
      set({ rafPending: true });
      requestAnimationFrame(() => {
        set({ rafPending: false, buffers: new Map(get().buffers) });
      });
    }
  },

  getBuffer: (deviceId, metric) => {
    return get().buffers.get(deviceId)?.get(metric);
  },

  getPoints: (deviceId, metric) => {
    const buffer = get().buffers.get(deviceId)?.get(metric);
    return buffer ? buffer.getPoints() : [];
  },

  getLatestValue: (deviceId, metric) => {
    const buffer = get().buffers.get(deviceId)?.get(metric);
    return buffer?.getLatest()?.value;
  },

  clearDevice: (deviceId) =>
    set((state) => {
      const newBuffers = new Map(state.buffers);
      newBuffers.delete(deviceId);
      return { buffers: newBuffers };
    }),

  clearMetric: (deviceId, metric) =>
    set((state) => {
      const newBuffers = new Map(state.buffers);
      const deviceMap = newBuffers.get(deviceId);
      if (deviceMap) {
        deviceMap.delete(metric);
      }
      return { buffers: newBuffers };
    }),
}));
