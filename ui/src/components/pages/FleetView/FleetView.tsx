import { useState, useMemo } from 'react';
import { useDeviceRegistry } from '@/stores/device-registry';
import { DeviceHealth } from '@/types/device';
import { FleetHealthSummary } from '@/components/molecules/FleetHealthSummary/FleetHealthSummary';
import { DeviceList } from '@/components/organisms/DeviceList/DeviceList';
import { DeviceDetailsPanel } from '@/components/organisms/DeviceDetailsPanel/DeviceDetailsPanel';
import { Card, CardBody } from '@/components/atoms/Card/Card';
import styles from './FleetView.module.css';

export function FleetView() {
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);
  const devicesMap = useDeviceRegistry((state) => state.devices);

  const devices = useMemo(() => Array.from(devicesMap.values()), [devicesMap]);

  const healthCounts = useMemo(() => {
    const counts: Record<DeviceHealth, number> = {
      [DeviceHealth.Healthy]: 0,
      [DeviceHealth.Warning]: 0,
      [DeviceHealth.Offline]: 0,
      [DeviceHealth.Unknown]: 0,
    };

    devices.forEach((device) => {
      counts[device.health]++;
    });

    return counts;
  }, [devices]);

  const selectedDevice = useMemo(() => {
    return selectedLocalId ? devicesMap.get(selectedLocalId) : undefined;
  }, [selectedLocalId, devicesMap]);

  return (
    <div className={styles.fleetView}>
      <div className={styles.sidebar}>
        <FleetHealthSummary healthCounts={healthCounts} />
        <DeviceList
          devices={devices}
          selectedDeviceId={selectedLocalId}
          onDeviceSelect={setSelectedLocalId}
        />
      </div>

      <div className={styles.mainContent}>
        {selectedDevice ? (
          <DeviceDetailsPanel device={selectedDevice} />
        ) : (
          <Card>
            <CardBody>
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🚀</div>
                <p className={styles.emptyTitle}>No device selected</p>
                <p className={styles.emptyText}>
                  Select a device from the fleet list to view details, telemetry, and capabilities
                </p>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
