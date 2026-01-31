import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { BookmarkMenu } from '@/components/atoms/BookmarkMenu/BookmarkMenu';
import { TimeSeriesPoint } from '@/types/telemetry';
import { BookmarkType } from '@/stores/pinned-metrics';
import styles from './Sparkline.module.css';

export interface SparklineProps {
  data: TimeSeriesPoint[];
  color?: string;
  onClick?: () => void;
  bookmarkType?: BookmarkType;
  onBookmark?: (type: BookmarkType) => void;
}

export function Sparkline({
  data,
  color = '#3b82f6',
  onClick,
  bookmarkType,
  onBookmark,
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
    <div className={styles.sparkline} onClick={onClick}>
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
      
      {onBookmark && (
        <div className={styles.bookmarkButton} onClick={(e) => e.stopPropagation()}>
          <BookmarkMenu
            currentType={bookmarkType || null}
            onBookmark={onBookmark}
          />
        </div>
      )}
    </div>
  );
}
