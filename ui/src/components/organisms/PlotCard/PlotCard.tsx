import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardBody } from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import { Pill } from '@/components/atoms/Pill/Pill';
import { TimeSeriesPoint } from '@/types/telemetry';
import styles from './PlotCard.module.css';

export interface PlotCardProps {
  title: string;
  metric: string;
  unit?: string;
  data: TimeSeriesPoint[];
  color?: string;
  showTimeRange?: boolean;
  className?: string;
}

type TimeRange = '1m' | '5m' | '15m' | '1h' | '6h' | '24h' | 'all';

const TIME_RANGE_MS: Record<TimeRange, number | null> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  'all': null,
};

export function PlotCard({
  title,
  metric,
  unit,
  data,
  color = '#3b82f6', // Use actual hex instead of CSS variable
  showTimeRange = true,
  className,
}: PlotCardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('15m');

  // Filter data based on time range
  const filteredData = useMemo(() => {
    const rangeMs = TIME_RANGE_MS[timeRange];
    if (rangeMs === null) return data;

    const cutoffTime = Date.now() - rangeMs;
    return data.filter((point) => point.ts >= cutoffTime);
  }, [data, timeRange]);

  // Format relative time based on time range
  const formatRelativeTime = (ts: number) => {
    const rangeMs = TIME_RANGE_MS[timeRange];
    if (rangeMs === null) {
      return new Date(ts).toLocaleTimeString();
    }
    const msAgo = Date.now() - ts;
    if (msAgo < 60000) return `-${Math.round(msAgo / 1000)}s`;
    if (msAgo < 3600000) return `-${Math.round(msAgo / 60000)}m`;
    return `-${Math.round(msAgo / 3600000)}h`;
  };

  // Format data for Recharts
  const chartData = useMemo(
    () =>
      filteredData.map((point) => ({
        timestamp: point.ts,
        value: point.value,
        time: new Date(point.ts).toLocaleTimeString(),
      })),
    [filteredData]
  );

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return { min: null, max: null, avg: null, latest: null };
    }

    const values = filteredData.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const latest = values[values.length - 1];

    return { min, max, avg, latest };
  }, [filteredData]);

  const formatValue = (value: number | null) => {
    if (value === null) return '—';
    return `${value.toFixed(2)}${unit || ''}`;
  };

  return (
    <Card className={`${styles.plotCard} ${className || ''}`}>
      <CardHeader>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h3 className={styles.title}>{title}</h3>
            <Pill size="sm">{metric}</Pill>
          </div>

          {showTimeRange && (
            <div className={styles.timeRangeButtons}>
              {(Object.keys(TIME_RANGE_MS) as TimeRange[]).map((range) => (
                <button
                  key={range}
                  className={`${styles.rangeBtn} ${timeRange === range ? styles.active : ''}`}
                  onClick={() => setTimeRange(range)}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Latest</span>
            <span className={styles.statValue}>{formatValue(stats.latest)}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Avg</span>
            <span className={styles.statValue}>{formatValue(stats.avg)}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Min</span>
            <span className={styles.statValue}>{formatValue(stats.min)}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Max</span>
            <span className={styles.statValue}>{formatValue(stats.max)}</span>
          </div>
        </div>
      </CardHeader>

      <CardBody>
        {chartData.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <p className={styles.emptyTitle}>No data available</p>
            <p className={styles.emptyText}>Waiting for telemetry data...</p>
          </div>
        ) : (
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-divider)" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => formatRelativeTime(ts)}
                  stroke="var(--text-secondary)"
                  style={{ fontSize: '0.75rem' }}
                />
                <YAxis
                  stroke="var(--text-secondary)"
                  style={{ fontSize: '0.75rem' }}
                  tickFormatter={(value) => `${value}${unit || ''}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-raised)',
                    border: '1px solid var(--border-divider)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                  }}
                  labelFormatter={(ts) => new Date(ts as number).toLocaleString()}
                  formatter={(value: number) => [formatValue(value), metric]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
