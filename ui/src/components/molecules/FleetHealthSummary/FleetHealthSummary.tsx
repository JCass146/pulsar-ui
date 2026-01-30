import { DeviceHealth } from '@/types/device';
import { Pill } from '@/components/atoms/Pill/Pill';
import styles from './FleetHealthSummary.module.css';

export interface FleetHealthSummaryProps {
  healthCounts: Record<DeviceHealth, number>;
}

export function FleetHealthSummary({ healthCounts }: FleetHealthSummaryProps) {
  const healthItems: Array<{ health: DeviceHealth; label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = [
    { health: DeviceHealth.Healthy, label: 'Healthy', variant: 'success' },
    { health: DeviceHealth.Warning, label: 'Warning', variant: 'warning' },
    { health: DeviceHealth.Offline, label: 'Offline', variant: 'danger' },
    { health: DeviceHealth.Unknown, label: 'Unknown', variant: 'default' },
  ];

  const totalDevices = Object.values(healthCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className={styles.summary}>
      <div className={styles.total}>
        <span className={styles.totalCount}>{totalDevices}</span>
        <span className={styles.totalLabel}>Total Devices</span>
      </div>
      
      <div className={styles.healthGrid}>
        {healthItems.map((item) => (
          <div key={item.health} className={styles.healthItem}>
            <Pill variant={item.variant}>
              {healthCounts[item.health] || 0}
            </Pill>
            <span className={styles.healthLabel}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
