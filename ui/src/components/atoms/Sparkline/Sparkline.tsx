import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { TimeSeriesPoint } from '@/types/telemetry';
import styles from './Sparkline.module.css';

export interface SparklineProps {
  data: TimeSeriesPoint[];
  color?: string;
  onClick?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export function Sparkline({
  data,
  color = '#3b82f6',
  onClick,
  isPinned = false,
  onTogglePin,
}: SparklineProps) {
  // Use only the last 100 points for sparkline
  const sparkData = useMemo(() => {
    const filtered = data.slice(-100);
    return filtered.map((point) => ({
      value: point.value,
      ts: point.ts,
    }));
  }, [data]);

  if (sparkData.length === 0) {
    return (
      <div className={styles.sparkline} onClick={onClick}>
        <div className={styles.empty}>—</div>
      </div>
    );
  }

  return (
    <div className={`${styles.sparkline} ${isPinned ? styles.pinned : ''}`} onClick={onClick}>
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      
      {onTogglePin && (
        <button
          className={`${styles.pinButton} ${isPinned ? styles.pinned : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          title={isPinned ? 'Unpin from main view' : 'Pin to main view'}
        >
          {isPinned ? '⭐' : '☆'}
        </button>
      )}
    </div>
  );
}
