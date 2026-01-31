import { mqttClient } from './client';
import { parseTopic } from './parser';
import { useDeviceRegistry } from '@/stores/device-registry';
import { useTelemetry } from '@/stores/telemetry';
import { useMqttMessages } from '@/stores/mqtt-messages';
import { useNotifications, NotificationLevel } from '@/stores/notifications';
import { TelemetryMessageSchema } from '@/types/telemetry';
import { DeviceHealth } from '@/types/device';

/**
 * Handle incoming MQTT messages and route to appropriate stores
 */
export function handleMessage(topic: string, payload: Buffer): void {
  console.log('[MQTT] Message received:', topic, payload.toString().substring(0, 100));
  
  const parsed = parseTopic(topic);
  if (!parsed) {
    console.warn('Invalid topic format:', topic);
    return;
  }

  const { deviceId, messageType, metric } = parsed;
  console.log('[MQTT] Parsed:', { deviceId, messageType, metric });

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
      case 'state':
        handleState(deviceId, metric, payload);
        break;
      case 'meta':
        handleMeta(deviceId, metric, payload);
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
 * Expected format: { v: 1, t_ms: timestamp, fields: { metric1: value1, metric2: value2, ... } }
 */
function handleTelemetry(deviceId: string, metric: string | undefined, payload: Buffer): void {
  const data = JSON.parse(payload.toString());
  
  // Ensure device exists (auto-register on first telemetry)
  const { addDevice, getDevice } = useDeviceRegistry.getState();
  if (!getDevice(deviceId)) {
    addDevice({
      id: deviceId,
      role: 'unknown',
      health: DeviceHealth.Healthy,
      lastSeen: data.t_ms || Date.now(),
      capability: null,
      metadata: {},
    });
  }
  
  // Check for pulsar-core format with fields object
  if (data.fields && typeof data.fields === 'object') {
    const timestamp = data.t_ms || Date.now();
    
    // Add a point for each field
    Object.entries(data.fields).forEach(([metricName, value]) => {
      if (typeof value === 'number') {
        useTelemetry.getState().addPoint(deviceId, metricName, {
          ts: timestamp,
          value: value,
        });
      }
    });
  } else if (metric && typeof data.value === 'number') {
    // Legacy format: single metric with value/ts
    useTelemetry.getState().addPoint(deviceId, metric, {
      ts: data.ts || Date.now(),
      value: data.value,
    });
  } else {
    console.warn('Unknown telemetry format:', data);
    return;
  }

  // Update device last seen
  updateDeviceLastSeen(deviceId);
}

/**
 * Handle status messages
 * Expected format: { v: 1, online: true, t_ms: timestamp, ip: "...", fw: "...", device_type: "..." }
 */
function handleStatus(deviceId: string, payload: Buffer): void {
  const data = JSON.parse(payload.toString());
  
  const { addDevice, updateDevice, getDevice } = useDeviceRegistry.getState();
  const existing = getDevice(deviceId);

  if (!existing) {
    // Register new device
    addDevice({
      id: deviceId,
      role: data.device_type || data.role || 'unknown',
      health: data.online ? DeviceHealth.Healthy : DeviceHealth.Offline,
      lastSeen: data.t_ms || Date.now(),
      capability: data.capability || null,
      metadata: data,
    });
  } else {
    // Update existing device
    updateDevice(deviceId, {
      lastSeen: data.t_ms || Date.now(),
      health: data.online ? DeviceHealth.Healthy : DeviceHealth.Offline,
      role: data.device_type || data.role || existing.role,
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
  
  // Determine notification level based on event data
  let level = NotificationLevel.Info;
  if (data.level === 'error' || data.severity === 'error') {
    level = NotificationLevel.Error;
  } else if (data.level === 'warning' || data.severity === 'warning') {
    level = NotificationLevel.Warning;
  } else if (data.level === 'success' || data.severity === 'success') {
    level = NotificationLevel.Success;
  }
  
  // Create notification with event message
  const message = data.message || data.event || data.type || 'Device event';
  useNotifications.getState().addNotification(deviceId, level, message);
  
  // Update device last seen
  updateDeviceLastSeen(deviceId);
}

/**
 * Handle state messages (state/online, state/relays, state/calibration)
 * Store in device metadata under 'state' key
 */
function handleState(deviceId: string, stateKey: string | undefined, payload: Buffer): void {
  const { getDevice, updateDevice } = useDeviceRegistry.getState();
  const device = getDevice(deviceId);
  
  if (!device) {
    console.warn('State message for unknown device:', deviceId);
    return;
  }

  try {
    const data = JSON.parse(payload.toString());
    const stateData = device.metadata?.state || {};
    
    if (stateKey) {
      // Store under state.{stateKey} (e.g., state.online, state.relays)
      stateData[stateKey] = data;
    } else {
      // Store entire payload
      Object.assign(stateData, data);
    }
    
    updateDevice(deviceId, {
      metadata: { ...device.metadata, state: stateData },
      lastSeen: Date.now(),
    });
  } catch (error) {
    // Non-JSON payload (e.g., state/online = "1" or "0")
    const stateData = device.metadata?.state || {};
    if (stateKey) {
      stateData[stateKey] = payload.toString();
    }
    updateDevice(deviceId, {
      metadata: { ...device.metadata, state: stateData },
      lastSeen: Date.now(),
    });
  }
}

/**
 * Handle meta messages (meta/info, meta/config)
 * Store in device metadata under 'meta' key
 */
function handleMeta(deviceId: string, metaKey: string | undefined, payload: Buffer): void {
  const { getDevice, updateDevice } = useDeviceRegistry.getState();
  const device = getDevice(deviceId);
  
  if (!device) {
    console.warn('Meta message for unknown device:', deviceId);
    return;
  }

  const data = JSON.parse(payload.toString());
  const metaData = device.metadata?.meta || {};
  
  if (metaKey) {
    // Store under meta.{metaKey} (e.g., meta.info, meta.config)
    metaData[metaKey] = data;
  } else {
    // Store entire payload
    Object.assign(metaData, data);
  }
  
  updateDevice(deviceId, {
    metadata: { ...device.metadata, meta: metaData },
    lastSeen: Date.now(),
  });
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
