import { mqttClient } from './client';
import { parseTopic } from './parser';
import { useDeviceRegistry } from '@/stores/device-registry';
import { useTelemetry } from '@/stores/telemetry';
import { useMqttMessages } from '@/stores/mqtt-messages';
import { TelemetryMessageSchema } from '@/types/telemetry';
import { DeviceHealth } from '@/types/device';

/**
 * Handle incoming MQTT messages and route to appropriate stores
 */
export function handleMessage(topic: string, payload: Buffer): void {
  const parsed = parseTopic(topic);
  if (!parsed) {
    console.warn('Invalid topic format:', topic);
    return;
  }

  const { deviceId, messageType, metric } = parsed;

  // Capture all messages in raw message store
  try {
    const payloadData = JSON.parse(payload.toString());
    useMqttMessages.getState().addMessage({
      topic,
      deviceId,
      messageType,
      payload: payloadData,
      timestamp: Date.now(),
    });
  } catch (error) {
    // If payload is not valid JSON, store as string
    useMqttMessages.getState().addMessage({
      topic,
      deviceId,
      messageType,
      payload: { raw: payload.toString() },
      timestamp: Date.now(),
    });
  }

  try {
    switch (messageType) {
      case 'telemetry':
        handleTelemetry(deviceId, metric, payload);
        break;
      case 'status':
        handleStatus(deviceId, payload);
        break;
      case 'event':
        handleEvent(deviceId, payload);
        break;
      default:
        console.warn('Unhandled message type:', messageType);
    }
  } catch (error) {
    console.error('Error handling message:', error, { topic, payload: payload.toString() });
  }
}

/**
 * Handle telemetry messages
 */
function handleTelemetry(deviceId: string, metric: string | undefined, payload: Buffer): void {
  if (!metric) {
    console.warn('Telemetry message missing metric');
    return;
  }

  // Parse and validate payload
  const data = JSON.parse(payload.toString());
  const validated = TelemetryMessageSchema.parse(data);

  // Add point to telemetry store
  useTelemetry.getState().addPoint(deviceId, metric, {
    ts: validated.ts,
    value: validated.value,
  });

  // Update device last seen
  updateDeviceLastSeen(deviceId);
}

/**
 * Handle status messages
 */
function handleStatus(deviceId: string, payload: Buffer): void {
  const data = JSON.parse(payload.toString());
  
  const { addDevice, updateDevice, getDevice } = useDeviceRegistry.getState();
  const existing = getDevice(deviceId);

  if (!existing) {
    // Register new device
    addDevice({
      id: deviceId,
      role: data.role || 'unknown',
      health: DeviceHealth.Healthy,
      lastSeen: Date.now(),
      capability: data.capability || null,
      metadata: data,
    });
  } else {
    // Update existing device
    updateDevice(deviceId, {
      lastSeen: Date.now(),
      health: DeviceHealth.Healthy,
      capability: data.capability || existing.capability,
      metadata: { ...existing.metadata, ...data },
    });
  }
}

/**
 * Handle event messages
 */
function handleEvent(deviceId: string, payload: Buffer): void {
  const data = JSON.parse(payload.toString());
  console.log('Event received:', { deviceId, data });
  
  // Update device last seen
  updateDeviceLastSeen(deviceId);
  
  // TODO: Add to notification store when implemented
}

/**
 * Update device last seen timestamp and recalculate health
 */
function updateDeviceLastSeen(deviceId: string): void {
  const { getDevice, updateDevice } = useDeviceRegistry.getState();
  const device = getDevice(deviceId);
  
  if (!device) return;

  const now = Date.now();
  const age = now - device.lastSeen;
  
  let health = DeviceHealth.Healthy;
  if (age > 60000) {
    health = DeviceHealth.Offline;
  } else if (age > 10000) {
    health = DeviceHealth.Warning;
  }

  updateDevice(deviceId, {
    lastSeen: now,
    health,
  });
}

/**
 * Initialize MQTT message handlers
 */
export function initializeHandlers(): void {
  mqttClient.onMessage(handleMessage);
}
