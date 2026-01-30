import { create } from 'zustand';
import { MqttMessage } from '@/types/mqtt';

/**
 * Circular buffer for MQTT messages
 */
class MessageBuffer {
  private buffer: MqttMessage[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  push(message: MqttMessage): void {
    this.buffer.push(message);
    
    // Trim to max size
    if (this.buffer.length > this.maxSize) {
      this.buffer = this.buffer.slice(-this.maxSize);
    }
  }

  getMessages(): MqttMessage[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer = [];
  }

  size(): number {
    return this.buffer.length;
  }
}

/**
 * MQTT messages state
 */
interface MqttMessagesState {
  buffer: MessageBuffer;
  
  // Actions
  addMessage: (message: MqttMessage) => void;
  clearMessages: () => void;
  
  // Selectors
  getMessages: () => MqttMessage[];
  getFilteredMessages: (filter: MessageFilter) => MqttMessage[];
}

export interface MessageFilter {
  deviceId?: string;
  topic?: string;
  messageType?: string;
  search?: string;
}

/**
 * MQTT messages Zustand store
 * Stores last 1000 messages in a circular buffer
 */
export const useMqttMessages = create<MqttMessagesState>((set, get) => ({
  buffer: new MessageBuffer(1000),

  addMessage: (message) => {
    const { buffer } = get();
    buffer.push(message);
    // Trigger re-render
    set({ buffer: new MessageBuffer(1000) });
    // Copy messages to new buffer to maintain state
    const messages = get().buffer.getMessages();
    const newBuffer = new MessageBuffer(1000);
    messages.forEach((msg) => newBuffer.push(msg));
    set({ buffer: newBuffer });
  },

  clearMessages: () => {
    const newBuffer = new MessageBuffer(1000);
    set({ buffer: newBuffer });
  },

  getMessages: () => {
    return get().buffer.getMessages();
  },

  getFilteredMessages: (filter) => {
    let messages = get().buffer.getMessages();

    if (filter.deviceId) {
      messages = messages.filter((msg) => msg.deviceId === filter.deviceId);
    }

    if (filter.topic) {
      messages = messages.filter((msg) => msg.topic.includes(filter.topic!));
    }

    if (filter.messageType) {
      messages = messages.filter((msg) => msg.messageType === filter.messageType);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      messages = messages.filter((msg) => {
        const payloadStr = JSON.stringify(msg.payload).toLowerCase();
        return (
          msg.topic.toLowerCase().includes(searchLower) ||
          msg.deviceId.toLowerCase().includes(searchLower) ||
          payloadStr.includes(searchLower)
        );
      });
    }

    return messages;
  },
}));
