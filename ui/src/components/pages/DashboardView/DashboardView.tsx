import { useTelemetry } from '@/stores/telemetry';
import { DeviceHealth } from '@/types/device';
import { PlotCard } from '@/components/organisms/PlotCard/PlotCard';
import { Card, CardBody } from '@/components/atoms/Card/Card';
import { useMemo, useState } from 'react';
import styles from './DashboardView.module.css';

export function DashboardView() {
  const buffers = useTelemetry((state) => state.buffers);
  const getPoints = useTelemetry((state) => state.getPoints);

  // Find first device with data (device-agnostic)
  const firstDeviceWithData = useMemo(() => {
    for (const [deviceId, buffer] of buffers.entries()) {
      if (buffer.size > 0) return deviceId;
    }
    return null;
  }, [buffers]);

  const selectedLocalId = firstDeviceWithData;

  // Dynamically discover all metrics for the selected device
  const availableMetrics = useMemo(() => {
    if (!selectedLocalId) return [];
    const deviceBuffers = buffers.get(selectedLocalId);
    if (!deviceBuffers) return [];
    const metrics = Array.from(deviceBuffers.keys());
    return metrics;
  }, [selectedLocalId, buffers]);

  // Generate chart color based on metric index
  const getChartColor = (index: number) => {
    const colors = [
      '#3b82f6', // primary-line
      '#8b5cf6', // secondary-line
      '#10b981', // success-line
      '#f59e0b', // warning-line
      '#ef4444', // danger-line
      '#06b6d4', // cyan
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
      <div className={styles.mainContent}>
        {selectedLocalId ? (
          <>
            {availableMetrics.length > 0 ? (
              <div className={styles.chartsGrid}>
                {availableMetrics
                  .filter(m => !m.startsWith('relay_') && m !== 'health')
                  .map((metric, index) => {
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
                      Waiting for data from devices...
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
                <p className={styles.emptyTitle}>No devices with data</p>
                <p className={styles.emptyText}>
                  Waiting for telemetry from connected devices...
                </p>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
