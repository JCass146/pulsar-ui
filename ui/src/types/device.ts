import { z } from 'zod';

/**
 * Device capability schema - defines what commands/metrics a device supports
 */
export const CapabilitySchema = z.object({
  commands: z.array(z.string()),
  metrics: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type Capability = z.infer<typeof CapabilitySchema>;

/**
 * Device health states
 */
export enum DeviceHealth {
  Healthy = 'healthy',
  Warning = 'warning',
  Offline = 'offline',
  Unknown = 'unknown',
}

/**
 * Device state tracked in registry
 */
export interface Device {
  id: string;
  role: string;
  health: DeviceHealth;
  lastSeen: number; // Unix timestamp ms
  capability: Capability | null;
  metadata: Record<string, unknown>;
}

/**
 * Device registry filter options
 */
export interface DeviceFilter {
  role?: string;
  health?: DeviceHealth;
  searchQuery?: string;
}
