/**
 * MQTT connection states
 */
export enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Reconnecting = 'reconnecting',
  Error = 'error',
}

/**
 * MQTT connection config
 */
export interface MqttConfig {
  url: string;
  clientId?: string;
  username?: string;
  password?: string;
  reconnectPeriod?: number; // ms, default 1000
  connectTimeout?: number; // ms, default 30000
}

/**
 * Parsed MQTT topic structure for pulsar messages
 * Expected format: pulsar/{deviceId}/{messageType}/{metric?}
 */
export interface ParsedTopic {
  deviceId: string;
  messageType: 'telemetry' | 'event' | 'status' | 'command';
  metric?: string;
}

/**
 * MQTT message handler
 */
export type MessageHandler = (topic: string, payload: Buffer) => void;

/**
 * Raw MQTT message captured for debugging
 */
export interface MqttMessage {
  topic: string;
  deviceId: string;
  messageType: string;
  payload: Record<string, unknown>;
  timestamp: number;
}
