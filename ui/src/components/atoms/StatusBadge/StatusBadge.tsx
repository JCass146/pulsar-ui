import { HTMLAttributes } from 'react';
import { ConnectionState } from '@/types/mqtt';
import { DeviceHealth } from '@/types/device';
import styles from './StatusBadge.module.css';

export interface StatusBadgeProps extends HTMLAttributes<HTMLDivElement> {
  /** Connection or device health status */
  status: ConnectionState | DeviceHealth;
  /** Show status indicator dot */
  showIndicator?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  ConnectionState | DeviceHealth,
  { label: string; color: string }
> = {
  // Connection states
  [ConnectionState.Connected]: { label: 'Connected', color: 'var(--warn-ok)' },
  [ConnectionState.Connecting]: { label: 'Connecting', color: 'var(--warn-warn)' },
  [ConnectionState.Reconnecting]: { label: 'Reconnecting', color: 'var(--warn-warn)' },
  [ConnectionState.Disconnected]: { label: 'Disconnected', color: 'var(--warn-bad)' },
  [ConnectionState.Error]: { label: 'Error', color: 'var(--warn-bad)' },

  // Device health states
  [DeviceHealth.Healthy]: { label: 'Healthy', color: 'var(--warn-ok)' },
  [DeviceHealth.Warning]: { label: 'Warning', color: 'var(--warn-warn)' },
  [DeviceHealth.Offline]: { label: 'Offline', color: 'var(--warn-bad)' },
  [DeviceHealth.Unknown]: { label: 'Unknown', color: 'var(--text-tertiary)' },
};

export function StatusBadge({
  status,
  showIndicator = true,
  size = 'md',
  className,
  ...props
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className={`${styles.badge} ${styles[size]} ${className || ''}`} {...props}>
      {showIndicator && (
        <div
          className={styles.indicator}
          style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}` }}
        />
      )}
      <span className={styles.label}>{config.label}</span>
    </div>
  );
}
