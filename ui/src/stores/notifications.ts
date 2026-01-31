import { create } from 'zustand';

export enum NotificationLevel {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Success = 'success',
}

export interface Notification {
  id: string;
  deviceId: string;
  level: NotificationLevel;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  count: number; // For grouped notifications
}

interface NotificationState {
  notifications: Map<string, Notification>;
  
  // Actions
  addNotification: (deviceId: string, level: NotificationLevel, message: string) => void;
  acknowledgeNotification: (id: string) => void;
  acknowledgeAll: () => void;
  clearNotifications: () => void;
  
  // Selectors
  getUnacknowledged: () => Notification[];
  getDeviceNotifications: (deviceId: string) => Notification[];
  getNotificationCount: () => number;
}

/**
 * Generate group key for notification grouping
 */
function getGroupKey(deviceId: string, level: NotificationLevel, message: string): string {
  // Extract error type from message (e.g., "Connection timeout" -> "connection")
  const type = message.toLowerCase().split(' ')[0];
  return `${deviceId}:${level}:${type}`;
}

/**
 * Notifications Zustand store
 * Groups notifications by device + error type
 */
export const useNotifications = create<NotificationState>((set, get) => ({
  notifications: new Map(),

  addNotification: (deviceId, level, message) => {
    const groupKey = getGroupKey(deviceId, level, message);
    const existingNotifications = get().notifications;
    const existing = Array.from(existingNotifications.values()).find(
      (n) => getGroupKey(n.deviceId, n.level, n.message) === groupKey && !n.acknowledged
    );

    if (existing) {
      // Increment count for existing notification
      const updated: Notification = {
        ...existing,
        count: existing.count + 1,
        timestamp: Date.now(), // Update timestamp to most recent
      };
      
      const newNotifications = new Map(existingNotifications);
      newNotifications.set(existing.id, updated);
      set({ notifications: newNotifications });
    } else {
      // Create new notification
      const notification: Notification = {
        id: `notif-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        deviceId,
        level,
        message,
        timestamp: Date.now(),
        acknowledged: false,
        count: 1,
      };
      
      const newNotifications = new Map(existingNotifications);
      newNotifications.set(notification.id, notification);
      set({ notifications: newNotifications });
    }
  },

  acknowledgeNotification: (id) => {
    const notification = get().notifications.get(id);
    if (!notification) return;

    const newNotifications = new Map(get().notifications);
    newNotifications.set(id, { ...notification, acknowledged: true });
    set({ notifications: newNotifications });
  },

  acknowledgeAll: () => {
    const newNotifications = new Map(get().notifications);
    newNotifications.forEach((notification, id) => {
      newNotifications.set(id, { ...notification, acknowledged: true });
    });
    set({ notifications: newNotifications });
  },

  clearNotifications: () => {
    set({ notifications: new Map() });
  },

  getUnacknowledged: () => {
    return Array.from(get().notifications.values())
      .filter((n) => !n.acknowledged)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  getDeviceNotifications: (deviceId) => {
    return Array.from(get().notifications.values())
      .filter((n) => n.deviceId === deviceId)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  getNotificationCount: () => {
    return Array.from(get().notifications.values()).filter((n) => !n.acknowledged).length;
  },
}));
