import { useEffect, useState, useRef } from 'react';
import { mqttClient } from '@/services/mqtt/client';
import { ConnectionState, MqttConfig } from '@/types/mqtt';
import { initializeHandlers } from '@/services/mqtt/handlers';

/**
 * Hook to manage MQTT connection
 */
export function useMqttConnection(config: MqttConfig) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    () => mqttClient.getConnectionState()
  );
  const isInitialized = useRef(false);

  useEffect(() => {
    // Don't connect if URL is empty (config still loading)
    if (!config?.url || config.url.trim() === '') {
      console.log('[useMqttConnection] Waiting for config...');
      return;
    }

    // Only initialize once
    if (isInitialized.current) return;
    isInitialized.current = true;

    console.log('[useMqttConnection] Connecting to:', config.url);

    // Initialize message handlers
    initializeHandlers();

    // Subscribe to connection state changes
    const unsubscribe = mqttClient.onConnectionStateChange(setConnectionState);

    // Connect to broker
    mqttClient.connect(config);

    // Subscribe to telemetry topics
    mqttClient.subscribe('pulsar/+/telemetry/#', 1);
    mqttClient.subscribe('pulsar/+/status', 1);
    mqttClient.subscribe('pulsar/+/event/#', 1);

    return () => {
      unsubscribe();
      mqttClient.disconnect();
    };
  }, [config?.url]); // Re-run when URL changes

  return connectionState;
}
