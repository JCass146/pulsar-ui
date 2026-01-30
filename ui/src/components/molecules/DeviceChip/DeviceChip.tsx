import { Device, DeviceHealth } from '@/types/device';
import styles from './DeviceChip.module.css';

export interface DeviceChipProps {
  device: Device;
  onClick?: () => void;
  selected?: boolean;
}

export function DeviceChip({ device, onClick, selected = false }: DeviceChipProps) {
  const healthColor = {
    [DeviceHealth.Healthy]: styles.healthy,
    [DeviceHealth.Warning]: styles.warning,
    [DeviceHealth.Offline]: styles.offline,
    [DeviceHealth.Unknown]: styles.unknown,
  }[device.health];

  const classes = [
    styles.chip,
    healthColor,
    selected && styles.selected,
    onClick && styles.clickable,
  ]
    .filter(Boolean)
    .join(' ');

  const timeSinceLastSeen = Date.now() - device.lastSeen;
  const lastSeenText =
    timeSinceLastSeen < 1000
      ? 'just now'
      : timeSinceLastSeen < 60000
      ? `${Math.floor(timeSinceLastSeen / 1000)}s ago`
      : `${Math.floor(timeSinceLastSeen / 60000)}m ago`;

  return (
    <div className={classes} onClick={onClick}>
      <div className={styles.main}>
        <div className={styles.id}>{device.id}</div>
        <div className={styles.meta}>
          {device.role} • {lastSeenText}
        </div>
      </div>
      <div className={`${styles.badge} ${healthColor}`}>
        {device.health}
      </div>
    </div>
  );
}
