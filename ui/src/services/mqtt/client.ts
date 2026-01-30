import mqtt, { MqttClient } from 'mqtt';
import { ConnectionState, MqttConfig } from '@/types/mqtt';

/**
 * MQTT client singleton with reconnection logic
 */
class MqttClientService {
  private client: MqttClient | null = null;
  private connectionState: ConnectionState = ConnectionState.Disconnected;
  private listeners: Set<(state: ConnectionState) => void> = new Set();

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Connect to MQTT broker
   */
  connect(config: MqttConfig): void {
    if (this.client) {
      return; // Already connected or connecting
    }

    this.setConnectionState(ConnectionState.Connecting);

    this.client = mqtt.connect(config.url, {
      clientId: config.clientId || `pulsar-ui-${Math.random().toString(16).slice(2, 8)}`,
      ...(config.username && { username: config.username }),
      ...(config.password && { password: config.password }),
      reconnectPeriod: config.reconnectPeriod || 1000,
      connectTimeout: config.connectTimeout || 30000,
      clean: true,
      keepalive: 60,
    });

    this.setupEventHandlers();
  }

  /**
   * Disconnect from broker
   */
  disconnect(): void {
    if (this.client) {
      this.client.end(true);
      this.client = null;
      this.setConnectionState(ConnectionState.Disconnected);
    }
  }

  /**
   * Subscribe to topic(s)
   */
  subscribe(topic: string | string[], qos: 0 | 1 | 2 = 1): void {
    if (!this.client) {
      console.warn('Cannot subscribe: MQTT client not connected');
      return;
    }

    this.client.subscribe(topic, { qos }, (err) => {
      if (err) {
        console.error('Subscribe error:', err);
      }
    });
  }

  /**
   * Unsubscribe from topic(s)
   */
  unsubscribe(topic: string | string[]): void {
    if (!this.client) return;
    this.client.unsubscribe(topic);
  }

  /**
   * Publish message
   */
  publish(
    topic: string,
    payload: string | Buffer,
    options: { qos?: 0 | 1 | 2; retain?: boolean } = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.publish(
        topic,
        payload,
        { qos: options.qos || 1, retain: options.retain || false },
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Add message handler
   */
  onMessage(handler: (topic: string, payload: Buffer) => void): void {
    if (this.client) {
      this.client.on('message', handler);
    }
  }

  /**
   * Remove message handler
   */
  offMessage(handler: (topic: string, payload: Buffer) => void): void {
    if (this.client) {
      this.client.off('message', handler);
    }
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionStateChange(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  /**
   * Setup MQTT event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      this.setConnectionState(ConnectionState.Connected);
      console.log('MQTT connected');
    });

    this.client.on('reconnect', () => {
      this.setConnectionState(ConnectionState.Reconnecting);
      console.log('MQTT reconnecting...');
    });

    this.client.on('close', () => {
      this.setConnectionState(ConnectionState.Disconnected);
      console.log('MQTT disconnected');
    });

    this.client.on('error', (err) => {
      this.setConnectionState(ConnectionState.Error);
      console.error('MQTT error:', err);
    });

    this.client.on('offline', () => {
      this.setConnectionState(ConnectionState.Disconnected);
      console.log('MQTT offline');
    });
  }

  /**
   * Update connection state and notify listeners
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return; // Avoid duplicate updates
    this.connectionState = state;
    this.listeners.forEach((listener) => listener(state));
  }
}

// Export singleton instance
export const mqttClient = new MqttClientService();
