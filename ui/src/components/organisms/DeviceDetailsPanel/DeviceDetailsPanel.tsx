import { Device } from '@/types/device';
import { useTelemetry } from '@/stores/telemetry';
import { Card, CardHeader, CardBody } from '@/components/atoms/Card/Card';
import { StatusBadge } from '@/components/atoms/StatusBadge/StatusBadge';
import { MetricCard } from '@/components/molecules/MetricCard/MetricCard';
import { PlotCard } from '@/components/organisms/PlotCard/PlotCard';
import { useMemo } from 'react';
import styles from './DeviceDetailsPanel.module.css';

export interface DeviceDetailsPanelProps {
  device: Device;
}

export function DeviceDetailsPanel({ device }: DeviceDetailsPanelProps) {
  const getPoints = useTelemetry((state) => state.getPoints);
  const getLatestValue = useTelemetry((state) => state.getLatestValue);

  const temperatureData = useMemo(() => {
    return getPoints(device.id, 'temperature');
  }, [device.id, getPoints]);

  const pressureData = useMemo(() => {
    return getPoints(device.id, 'pressure');
  }, [device.id, getPoints]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={styles.panel}>
      {/* Device Info Card */}
      <Card>
        <CardHeader>
          <h2>{device.id}</h2>
        </CardHeader>
        <CardBody>
          <div className={styles.info}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status</span>
              <StatusBadge status={device.health} />
            </div>
            
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Role</span>
              <span className={styles.infoValue}>{device.role}</span>
            </div>

            {device.capability && device.capability.commands && device.capability.commands.length > 0 && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Commands</span>
                <div className={styles.capabilities}>
                  {device.capability.commands.map((cmd: string) => (
                    <span key={cmd} className={styles.capability}>
                      {cmd}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {device.lastSeen && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Last Seen</span>
                <span className={styles.infoValue}>{formatTimestamp(device.lastSeen)}</span>
              </div>
            )}

            {device.metadata && Object.keys(device.metadata).length > 0 && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Metadata</span>
                <div className={styles.metadata}>
                  {Object.entries(device.metadata).map(([key, value]) => (
                    <div key={key} className={styles.metadataItem}>
                      <span className={styles.metadataKey}>{key}:</span>
                      <span className={styles.metadataValue}>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Current Metrics */}
      <div className={styles.metricsGrid}>
        <MetricCard
          label="Temperature"
          value={getLatestValue(device.id, 'temperature') ?? null}
          unit="°F"
        />
        <MetricCard
          label="Pressure"
          value={getLatestValue(device.id, 'pressure') ?? null}
          unit="PSI"
        />
      </div>

      {/* Time-Series Charts */}
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
    </div>
  );
}
