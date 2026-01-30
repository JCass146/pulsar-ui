import { Card, CardHeader, CardBody } from '@/components/atoms/Card/Card';
import { Pill } from '@/components/atoms/Pill/Pill';
import styles from './MetricCard.module.css';

export interface MetricCardProps {
  /** Metric name/label */
  label: string;
  /** Current value */
  value: number | string | null;
  /** Unit of measurement */
  unit?: string;
  /** Minimum threshold for warnings */
  min?: number;
  /** Maximum threshold for warnings */
  max?: number;
  /** Previous value for trend calculation */
  previousValue?: number;
  /** Show trend arrow */
  showTrend?: boolean;
  /** Custom className */
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  min,
  max,
  previousValue,
  showTrend = true,
  className,
}: MetricCardProps) {
  // Determine alert state
  const numValue = typeof value === 'number' ? value : null;
  let alertVariant: 'success' | 'warning' | 'danger' | 'default' = 'default';

  if (numValue !== null) {
    if (min !== undefined && numValue < min) {
      alertVariant = 'warning';
    } else if (max !== undefined && numValue > max) {
      alertVariant = 'danger';
    } else if (min !== undefined || max !== undefined) {
      alertVariant = 'success';
    }
  }

  // Calculate trend
  let trend: 'up' | 'down' | 'neutral' = 'neutral';
  if (showTrend && numValue !== null && previousValue !== undefined) {
    if (numValue > previousValue) trend = 'up';
    else if (numValue < previousValue) trend = 'down';
  }

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <Card className={`${styles.metricCard} ${className || ''}`}>
      <CardHeader>
        <div className={styles.header}>
          <span className={styles.label}>{label}</span>
          {alertVariant !== 'default' && (
            <Pill variant={alertVariant} size="sm">
              {alertVariant}
            </Pill>
          )}
        </div>
      </CardHeader>
      <CardBody>
        <div className={styles.body}>
          <div className={styles.valueRow}>
            <span className={styles.value}>
              {value !== null && value !== undefined ? value : '—'}
            </span>
            {unit && <span className={styles.unit}>{unit}</span>}
          </div>

          {showTrend && trend !== 'neutral' && (
            <div className={`${styles.trend} ${styles[trend]}`}>
              <span className={styles.trendIcon}>{trendIcons[trend]}</span>
              <span className={styles.trendLabel}>
                {trend === 'up' ? 'Increasing' : 'Decreasing'}
              </span>
            </div>
          )}

          {(min !== undefined || max !== undefined) && (
            <div className={styles.thresholds}>
              {min !== undefined && (
                <span className={styles.threshold}>
                  Min: {min}
                  {unit}
                </span>
              )}
              {max !== undefined && (
                <span className={styles.threshold}>
                  Max: {max}
                  {unit}
                </span>
              )}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
