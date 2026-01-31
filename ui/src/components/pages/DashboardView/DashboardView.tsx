import { useTelemetry } from '@/stores/telemetry';
import { useDeviceRegistry } from '@/stores/device-registry';
import { usePinnedMetrics } from '@/stores/pinned-metrics';
import { TabBar } from '@/components/atoms/Tab/Tab';
import { DeviceHealth } from '@/types/device';
import { PlotCard } from '@/components/organisms/PlotCard/PlotCard';
import { Sparkline } from '@/components/atoms/Sparkline/Sparkline';
import { Card, CardBody } from '@/components/atoms/Card/Card';
import { useMemo, useState } from 'react';
import styles from './DashboardView.module.css';

export function DashboardView() {
  const buffers = useTelemetry((state) => state.buffers);
  const getPoints = useTelemetry((state) => state.getPoints);
  const devicesMap = useDeviceRegistry((state) => state.devices);
  const bookmarks = usePinnedMetrics((state) => state.bookmarks);
  const setBookmark = usePinnedMetrics((state) => state.setBookmark);
  const getBookmarkType = usePinnedMetrics((state) => state.getBookmarkType);

  const [liveMetricsTab, setLiveMetricsTab] = useState<'featured' | 'all'>('featured');

  // Collect all device/metric combinations with data
  const allMetricsWithData = useMemo(() => {
    const metrics: Array<{ deviceId: string; metric: string }> = [];
    for (const [deviceId, buffer] of buffers.entries()) {
      for (const metric of buffer.keys()) {
        // Skip relay and health metrics
        if (!metric.startsWith('relay_') && metric !== 'health') {
          metrics.push({ deviceId, metric });
        }
      }
    }
    return metrics;
  }, [buffers]);

  // Separate bookmarked to main, bookmarked to live, and unbooked
  const mainPinnedList = useMemo(() => {
    // Show main bookmarked metrics OR unbookmarked metrics if no bookmarks exist
    const mainBookmarked = allMetricsWithData.filter(m => getBookmarkType(m.deviceId, m.metric) === 'main');
    const hasAnyBookmarks = allMetricsWithData.some(m => getBookmarkType(m.deviceId, m.metric) !== null);
    
    // If there are any bookmarks, only show main bookmarked
    // If no bookmarks, show all unbooked metrics (default view)
    if (hasAnyBookmarks) {
      return mainBookmarked;
    }
    
    // Default: show all unbooked metrics on main if nothing is bookmarked
    return allMetricsWithData.filter(m => getBookmarkType(m.deviceId, m.metric) !== 'live');
  }, [allMetricsWithData, getBookmarkType]);

  const liveFeaturedList = useMemo(() => {
    return allMetricsWithData.filter(m => getBookmarkType(m.deviceId, m.metric) === 'live');
  }, [allMetricsWithData, getBookmarkType]);

  const allUnbookedMetrics = useMemo(() => {
    return allMetricsWithData.filter(m => getBookmarkType(m.deviceId, m.metric) === null);
  }, [allMetricsWithData, getBookmarkType]);

  // Show featured or all based on active tab
  const sparklineMetricsToShow = useMemo(() => {
    if (liveMetricsTab === 'featured') {
      return liveFeaturedList;
    }
    return allUnbookedMetrics;
  }, [liveMetricsTab, liveFeaturedList, allUnbookedMetrics]);

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
        {mainPinnedList.length > 0 ? (
          <div className={styles.chartsGrid}>
            {mainPinnedList.map((item, index) => {
              const { title, unit } = getMetricLabel(item.metric);
              const data = getPoints(item.deviceId, item.metric);
              const device = devicesMap.get(item.deviceId);
              
              return (
                <PlotCard
                  key={`${item.deviceId}:${item.metric}`}
                  title={`${title} ${device ? `(${device.id})` : ''}`}
                  metric={item.metric}
                  deviceId={item.deviceId}
                  unit={unit}
                  data={data}
                  color={getChartColor(index)}
                  bookmarkType={getBookmarkType(item.deviceId, item.metric)}
                  onBookmark={(type) => setBookmark(item.deviceId, item.metric, type)}
                />
              );
            })}
          </div>
        ) : (
          <Card>
            <CardBody>
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📊</div>
                <p className={styles.emptyTitle}>No main plots</p>
                <p className={styles.emptyText}>
                  Bookmark plots from Live Metrics to display them here
                </p>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      <aside className={styles.sparklineSidebar}>
        <div className={styles.sidebarHeader}>
          <h3 className={styles.sidebarTitle}>Live Metrics</h3>
        </div>

        <TabBar
          tabs={[
            { label: 'Featured', isActive: liveMetricsTab === 'featured', onClick: () => {} },
            { label: 'All', isActive: liveMetricsTab === 'all', onClick: () => {} },
          ]}
          value={liveMetricsTab}
          onChange={(tab) => setLiveMetricsTab(tab as 'featured' | 'all')}
        />

        <div className={styles.sparklineGrid}>
          {sparklineMetricsToShow.length > 0 ? (
            sparklineMetricsToShow.map((item, index) => {
              const { title } = getMetricLabel(item.metric);
              const data = getPoints(item.deviceId, item.metric);
              const device = devicesMap.get(item.deviceId);
              
              return (
                <div key={`${item.deviceId}:${item.metric}`} className={styles.sparklineCard}>
                  <div className={styles.sparklineHeader}>
                    <div className={styles.sparklineLabel}>
                      <span className={styles.metricTitle}>{title}</span>
                      <span className={styles.deviceName}>{device?.id}</span>
                    </div>
                  </div>
                  <Sparkline
                    data={data}
                    color={getChartColor(index)}
                    bookmarkType={getBookmarkType(item.deviceId, item.metric)}
                    onBookmark={(type) => setBookmark(item.deviceId, item.metric, type)}
                  />
                </div>
              );
            })
          ) : (
            <div className={styles.emptySparklines}>
              <p>
                {liveMetricsTab === 'featured'
                  ? 'No featured metrics. Bookmark metrics to see them here!'
                  : 'All metrics are bookmarked!'}
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
