import { z } from 'zod';

/**
 * Authority levels for command execution
 */
export enum AuthorityLevel {
  View = 'VIEW',
  Control = 'CONTROL',
  Armed = 'ARMED',
}

/**
 * Command execution status
 */
export enum CommandStatus {
  Staged = 'staged',
  Pending = 'pending',
  Sent = 'sent',
  Success = 'success',
  Failed = 'failed',
  Timeout = 'timeout',
}

/**
 * Command template schema
 */
export const CommandTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  action: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
  requiresArmed: z.boolean().default(false),
});

export type CommandTemplate = z.infer<typeof CommandTemplateSchema>;

/**
 * Command instance being executed
 */
export interface Command {
  id: string;
  deviceId: string;
  action: string;
  payload: Record<string, unknown>;
  status: CommandStatus;
  stagedAt: number; // Unix timestamp ms
  sentAt?: number;
  completedAt?: number;
  error?: string;
  requiresArmed: boolean;
}

/**
 * Command execution options
 */
export interface CommandOptions {
  timeout?: number; // ms, default 5000
  qos?: 0 | 1 | 2; // MQTT QoS, default 1
}
