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

    // Only initialize once (check AFTER url validation)
    if (isInitialized.current) {
      console.log('[useMqttConnection] Already initialized');
      return;
    }
    isInitialized.current = true;

    console.log('[useMqttConnection] Initializing MQTT connection to:', config.url);

    // Connect to broker FIRST (this creates the client)
    mqttClient.connect(config);

    // THEN initialize message handlers (now client exists)
    initializeHandlers();

    // Subscribe to connection state changes
    const unsubscribe = mqttClient.onConnectionStateChange((state) => {
      setConnectionState(state);
      
      // Subscribe to topics when connected
      if (state === ConnectionState.Connected) {
        console.log('[useMqttConnection] Connected! Subscribing to topics...');
        mqttClient.subscribe('pulsar/+/telemetry/#', 1);
        mqttClient.subscribe('pulsar/+/telemetry', 1);
        mqttClient.subscribe('pulsar/+/status', 1);
        mqttClient.subscribe('pulsar/+/event/#', 1);
        mqttClient.subscribe('pulsar/+/state/#', 1);
        mqttClient.subscribe('pulsar/+/meta/#', 1);
      }
    });

    return () => {
      unsubscribe();
      mqttClient.disconnect();
    };
  }, [config?.url]); // Re-run when URL changes

  return connectionState;
}
