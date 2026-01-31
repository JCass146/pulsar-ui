import { create } from 'zustand';

export interface PinnedMetric {
  deviceId: string;
  metric: string;
}

interface PinnedMetricsState {
  pinnedMetrics: Set<string>; // "deviceId:metric" pairs
  
  // Actions
  togglePin: (deviceId: string, metric: string) => void;
  isPinned: (deviceId: string, metric: string) => boolean;
  getPinnedList: () => PinnedMetric[];
}

function getKey(deviceId: string, metric: string): string {
  return `${deviceId}:${metric}`;
}

export const usePinnedMetrics = create<PinnedMetricsState>((set, get) => ({
  pinnedMetrics: new Set(),

  togglePin: (deviceId, metric) => {
    const key = getKey(deviceId, metric);
    const updated = new Set(get().pinnedMetrics);
    
    if (updated.has(key)) {
      updated.delete(key);
    } else {
      updated.add(key);
    }
    
    set({ pinnedMetrics: updated });
  },

  isPinned: (deviceId, metric) => {
    return get().pinnedMetrics.has(getKey(deviceId, metric));
  },

  getPinnedList: () => {
    const list: PinnedMetric[] = [];
    get().pinnedMetrics.forEach((key) => {
      const [deviceId, metric] = key.split(':');
      list.push({ deviceId, metric });
    });
    return list;
  },
}));
