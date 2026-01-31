import { useNotifications, NotificationLevel } from '@/stores/notifications';
import styles from './NotificationRail.module.css';

export function NotificationRail() {
  const notifications = useNotifications((state) => state.getUnacknowledged());
  const acknowledgeNotification = useNotifications((state) => state.acknowledgeNotification);
  const acknowledgeAll = useNotifications((state) => state.acknowledgeAll);

  if (notifications.length === 0) {
    return null;
  }

  const getLevelClass = (level: NotificationLevel): string => {
    switch (level) {
      case NotificationLevel.Info: return styles.levelInfo || '';
      case NotificationLevel.Success: return styles.levelSuccess || '';
      case NotificationLevel.Warning: return styles.levelWarning || '';
      case NotificationLevel.Error: return styles.levelError || '';
      default: return '';
    }
  };

  const getLevelIcon = (level: NotificationLevel): string => {
    switch (level) {
      case NotificationLevel.Info: return 'ℹ️';
      case NotificationLevel.Success: return '✅';
      case NotificationLevel.Warning: return '⚠️';
      case NotificationLevel.Error: return '❌';
      default: return '🔔';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className={styles.rail}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          Notifications
          {notifications.length > 0 && (
            <span className={styles.count}>{notifications.length}</span>
          )}
        </h3>
        {notifications.length > 0 && (
          <button className={styles.clearButton} onClick={acknowledgeAll}>
            Clear All
          </button>
        )}
      </div>

      <div className={styles.list}>
        {notifications.map((notification) => (
          <div key={notification.id} className={`${styles.notification} ${getLevelClass(notification.level)}`}>
            <div className={styles.notificationHeader}>
              <span className={styles.icon}>{getLevelIcon(notification.level)}</span>
              <div className={styles.notificationInfo}>
                <div className={styles.notificationMeta}>
                  <span className={styles.deviceId}>{notification.deviceId}</span>
                  <span className={styles.level}>{notification.level}</span>
                </div>
                <p className={styles.message}>{notification.message}</p>
                <div className={styles.notificationFooter}>
                  <span className={styles.timestamp}>{formatTimestamp(notification.timestamp)}</span>
                  {notification.count > 1 && (
                    <span className={styles.badge}>{notification.count}x</span>
                  )}
                </div>
              </div>
              <button
                className={styles.dismissButton}
                onClick={() => acknowledgeNotification(notification.id)}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
