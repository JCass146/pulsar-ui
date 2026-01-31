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
  const buffers = useTelemetry((state) => state.buffers);
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);

  const devices = useMemo(() => Array.from(devicesMap.values()), [devicesMap]);

  // Dynamically discover all metrics for the selected device
  const availableMetrics = useMemo(() => {
    if (!selectedLocalId) return [];
    const deviceBuffers = buffers.get(selectedLocalId);
    if (!deviceBuffers) return [];
    const metrics = Array.from(deviceBuffers.keys());
    console.log('[DashboardView] Available metrics for', selectedLocalId, ':', metrics);
    return metrics;
  }, [selectedLocalId, buffers]);

  // Generate chart color based on metric index
  const getChartColor = (index: number) => {
    const colors = [
      'var(--primary-line)',
      'var(--warn-warn)',
      'var(--success-green)',
      'var(--info-blue)',
      'var(--accent-purple)',
      'var(--danger-red)',
    ];
    return colors[index % colors.length];
  };

  // Get friendly metric names
  const getMetricLabel = (metric: string) => {
    const labels: Record<string, { title: string; unit: string }> = {
      pressure_psi: { title: 'Pressure', unit: ' PSI' },
      temperature: { title: 'Temperature', unit: '°F' },
      temperature_c: { title: 'Temperature', unit: '°C' },
      mass_g: { title: 'Mass', unit: ' g' },
      load_raw: { title: 'Load Cell (Raw)', unit: '' },
      rssi_dbm: { title: 'Signal Strength', unit: ' dBm' },
      heap_free: { title: 'Free Memory', unit: ' bytes' },
      uptime_ms: { title: 'Uptime', unit: ' ms' },
      relay_1: { title: 'Relay 1', unit: '' },
      relay_2: { title: 'Relay 2', unit: '' },
      relay_3: { title: 'Relay 3', unit: '' },
      relay_4: { title: 'Relay 4', unit: '' },
      humidity: { title: 'Humidity', unit: '%' },
    };
    
    return labels[metric] || { title: metric, unit: '' };
  };

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
            {availableMetrics.length > 0 ? (
              <div className={styles.chartsGrid}>
                {availableMetrics.map((metric, index) => {
                  const { title, unit } = getMetricLabel(metric);
                  const data = getPoints(selectedLocalId, metric);
                  
                  return (
                    <PlotCard
                      key={metric}
                      title={title}
                      metric={metric}
                      unit={unit}
                      data={data}
                      color={getChartColor(index)}
                    />
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardBody>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📊</div>
                    <p className={styles.emptyTitle}>No telemetry data</p>
                    <p className={styles.emptyText}>
                      Waiting for data from {devicesMap.get(selectedLocalId)?.id || selectedLocalId}
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}
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
