import { useNavigation } from '@/stores/navigation';
import { useDeviceRegistry } from '@/stores/device-registry';
import { useTelemetry } from '@/stores/telemetry';
import { DeviceHealth } from '@/types/device';
import { DeviceList } from '@/components/organisms/DeviceList/DeviceList';
import { PlotCard } from '@/components/organisms/PlotCard/PlotCard';
import { Card, CardBody } from '@/components/atoms/Card/Card';
import { useMemo, useState } from 'react';
import styles from './DashboardView.module.css';

export function DashboardView() {
  const devicesMap = useDeviceRegistry((state) => state.devices);
  const getPoints = useTelemetry((state) => state.getPoints);
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);

  const devices = useMemo(() => Array.from(devicesMap.values()), [devicesMap]);

  const temperatureData = useMemo(() => {
    if (!selectedLocalId) return [];
    return getPoints(selectedLocalId, 'temperature');
  }, [selectedLocalId, getPoints]);

  const pressureData = useMemo(() => {
    if (!selectedLocalId) return [];
    return getPoints(selectedLocalId, 'pressure');
  }, [selectedLocalId, getPoints]);

  return (
    <div className={styles.dashboard}>
      <div className={styles.sidebar}>
        <DeviceList
          devices={devices}
          selectedDeviceId={selectedLocalId}
          onDeviceSelect={setSelectedLocalId}
        />
      </div>

      <div className={styles.mainContent}>
        {selectedLocalId ? (
          <>
            <PlotCard
              title="Temperature"
              metric="temperature"
              unit="°F"
              data={temperatureData}
              color="var(--warn-warn)"
            />
            <PlotCard
              title="Pressure"
              metric="pressure"
              unit=" PSI"
              data={pressureData}
              color="var(--primary-line)"
            />
          </>
        ) : (
          <Card>
            <CardBody>
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📊</div>
                <p className={styles.emptyTitle}>No device selected</p>
                <p className={styles.emptyText}>
                  Select a device from the list to view telemetry charts
                </p>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
