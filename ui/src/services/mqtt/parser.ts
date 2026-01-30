import { ParsedTopic } from '@/types/mqtt';

/**
 * Parse Pulsar MQTT topic
 * Expected format: pulsar/{deviceId}/{messageType}/{metric?}
 */
export function parseTopic(topic: string): ParsedTopic | null {
  const parts = topic.split('/');
  
  if (parts.length < 3 || parts[0] !== 'pulsar') {
    return null;
  }

  const deviceId = parts[1];
  const messageType = parts[2] as ParsedTopic['messageType'];
  const metric = parts[3];

  // Validate message type
  if (!['telemetry', 'event', 'status', 'command'].includes(messageType)) {
    return null;
  }

  return {
    deviceId,
    messageType,
    metric,
  };
}

/**
 * Build topic string for publishing
 */
export function buildTopic(deviceId: string, messageType: string, metric?: string): string {
  const parts = ['pulsar', deviceId, messageType];
  if (metric) {
    parts.push(metric);
  }
  return parts.join('/');
}
