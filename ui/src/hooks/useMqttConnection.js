import { useState, useRef, useCallback, useEffect } from "react";
import { connectMqtt } from "../mqtt.js";

/**
 * useMqttConnection
 *
 * Manages MQTT connection lifecycle and state.
 * Provides connection status, message handling, and reconnection logic.
 *
 * Usage:
 *   const mqtt = useMqttConnection({
 *     wsUrl: "ws://broker:9001",
 *     onMessage: (topic, payload) => { ... },
 *     onStateChange: (state) => { ... }
 *   });
 *
 * @param {Object} options - Configuration
 * @returns {Object} MQTT connection API
 */
export function useMqttConnection(options = {}) {
  const { wsUrl, onMessage, onStateChange } = options;

  const controllerRef = useRef(null);
  const [status, setStatus] = useState({ status: "disconnected", url: "" });
  const [connectedSubscriptions, setConnectedSubscriptions] = useState([]);

  // Connect to MQTT broker
  const connect = useCallback(
    async (url, topics = []) => {
      if (controllerRef.current) {
        // Already connected
        return true;
      }

      try {
        setStatus({ status: "connecting", url });

        controllerRef.current = await connectMqtt({
          url,
          onState: (newState) => {
            setStatus(newState);
            if (onStateChange) {
              onStateChange(newState);
            }
          },
          onMessage: (topic, payload) => {
            if (onMessage) {
              onMessage(topic, payload);
            }
          },
        });

        // Subscribe to topics
        if (topics.length && controllerRef.current.subscribe) {
          for (const topic of topics) {
            try {
              controllerRef.current.subscribe(topic);
            } catch (err) {
              console.warn(`Failed to subscribe to ${topic}:`, err);
            }
          }
          setConnectedSubscriptions(topics);
        }

        return true;
      } catch (err) {
        console.error("MQTT connection failed:", err);
        setStatus({ status: "error", url, error: err.message });
        return false;
      }
    },
    [onMessage, onStateChange]
  );

  // Disconnect from broker
  const disconnect = useCallback(() => {
    if (controllerRef.current) {
      try {
        controllerRef.current.disconnect?.();
        controllerRef.current = null;
        setStatus({ status: "disconnected", url: "" });
        setConnectedSubscriptions([]);
      } catch (err) {
        console.error("Disconnect error:", err);
      }
    }
  }, []);

  // Subscribe to additional topics
  const subscribe = useCallback((topic) => {
    if (controllerRef.current?.subscribe) {
      try {
        controllerRef.current.subscribe(topic);
        setConnectedSubscriptions((prev) => (prev.includes(topic) ? prev : [...prev, topic]));
        return true;
      } catch (err) {
        console.error(`Subscribe to ${topic} failed:`, err);
        return false;
      }
    }
    return false;
  }, []);

  // Unsubscribe from topic
  const unsubscribe = useCallback((topic) => {
    if (controllerRef.current?.unsubscribe) {
      try {
        controllerRef.current.unsubscribe(topic);
        setConnectedSubscriptions((prev) => prev.filter((t) => t !== topic));
        return true;
      } catch (err) {
        console.error(`Unsubscribe from ${topic} failed:`, err);
        return false;
      }
    }
    return false;
  }, []);

  // Publish message to topic
  const publish = useCallback((topic, payload, options = {}) => {
    if (controllerRef.current?.publish) {
      try {
        controllerRef.current.publish(topic, payload, options);
        return true;
      } catch (err) {
        console.error(`Publish to ${topic} failed:`, err);
        return false;
      }
    }
    return false;
  }, []);

  // Auto-connect if URL provided
  useEffect(() => {
    if (wsUrl && !controllerRef.current) {
      connect(wsUrl);
    }

    return () => {
      // Cleanup on unmount
      if (controllerRef.current) {
        disconnect();
      }
    };
  }, [wsUrl, connect, disconnect]);

  return {
    status,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    publish,
    connectedSubscriptions,
    controllerRef,
    isConnected: status.status === "connected",
  };
}
