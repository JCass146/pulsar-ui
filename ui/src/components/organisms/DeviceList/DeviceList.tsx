import { useState, useMemo } from 'react';
import { Device, DeviceHealth } from '@/types/device';
import { Card, CardHeader, CardBody } from '@/components/atoms/Card/Card';
import { Input } from '@/components/atoms/Input/Input';
import { Pill } from '@/components/atoms/Pill/Pill';
import { DeviceChip } from '@/components/molecules/DeviceChip/DeviceChip';
import styles from './DeviceList.module.css';

export interface DeviceListProps {
  devices: Device[];
  selectedDeviceId?: string | null;
  onDeviceSelect?: (deviceId: string) => void;
  showSearch?: boolean;
  showHealthFilter?: boolean;
  className?: string;
}

export function DeviceList({
  devices,
  selectedDeviceId,
  onDeviceSelect,
  showSearch = true,
  showHealthFilter = true,
  className,
}: DeviceListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState<DeviceHealth | 'all'>('all');

  // Filter devices based on search and health
  const filteredDevices = useMemo(() => {
    let filtered = devices;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (device) =>
          device.id.toLowerCase().includes(query) ||
          device.role?.toLowerCase().includes(query)
      );
    }

    // Health filter
    if (healthFilter !== 'all') {
      filtered = filtered.filter((device) => device.health === healthFilter);
    }

    return filtered;
  }, [devices, searchQuery, healthFilter]);

  const healthCounts = useMemo(
    () => ({
      all: devices.length,
      healthy: devices.filter((d) => d.health === DeviceHealth.Healthy).length,
      warning: devices.filter((d) => d.health === DeviceHealth.Warning).length,
      offline: devices.filter((d) => d.health === DeviceHealth.Offline).length,
    }),
    [devices]
  );

  const handleHealthFilterClick = (filter: DeviceHealth | 'all') => {
    setHealthFilter(filter);
  };

  return (
    <Card className={`${styles.deviceList} ${className || ''}`}>
      <CardHeader>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Devices <Pill size="sm">{filteredDevices.length}</Pill>
          </h2>

          {showHealthFilter && (
            <div className={styles.healthFilters}>
              <button
                className={`${styles.filterBtn} ${healthFilter === 'all' ? styles.active : ''}`}
                onClick={() => handleHealthFilterClick('all')}
              >
                All ({healthCounts.all})
              </button>
              <button
                className={`${styles.filterBtn} ${styles.healthy} ${
                  healthFilter === DeviceHealth.Healthy ? styles.active : ''
                }`}
                onClick={() => handleHealthFilterClick(DeviceHealth.Healthy)}
              >
                Healthy ({healthCounts.healthy})
              </button>
              <button
                className={`${styles.filterBtn} ${styles.warning} ${
                  healthFilter === DeviceHealth.Warning ? styles.active : ''
                }`}
                onClick={() => handleHealthFilterClick(DeviceHealth.Warning)}
              >
                Warning ({healthCounts.warning})
              </button>
              <button
                className={`${styles.filterBtn} ${styles.offline} ${
                  healthFilter === DeviceHealth.Offline ? styles.active : ''
                }`}
                onClick={() => handleHealthFilterClick(DeviceHealth.Offline)}
              >
                Offline ({healthCounts.offline})
              </button>
            </div>
          )}
        </div>

        {showSearch && (
          <Input
            placeholder="Search devices by ID or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
          />
        )}
      </CardHeader>

      <CardBody>
        {filteredDevices.length === 0 ? (
          <div className={styles.emptyState}>
            {devices.length === 0 ? (
              <>
                <div className={styles.emptyIcon}>📡</div>
                <p className={styles.emptyTitle}>No devices detected</p>
                <p className={styles.emptyText}>
                  Waiting for telemetry from pulsar-core MQTT broker...
                </p>
              </>
            ) : (
              <>
                <div className={styles.emptyIcon}>🔍</div>
                <p className={styles.emptyTitle}>No devices found</p>
                <p className={styles.emptyText}>Try adjusting your search or filters</p>
              </>
            )}
          </div>
        ) : (
          <div className={styles.deviceGrid}>
            {filteredDevices.map((device) => (
              <DeviceChip
                key={device.id}
                device={device}
                selected={selectedDeviceId === device.id}
                onClick={() => onDeviceSelect?.(device.id)}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
