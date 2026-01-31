import { create } from 'zustand';

export type BookmarkType = 'main' | 'live' | null;

export interface BookmarkedMetric {
  deviceId: string;
  metric: string;
  type: BookmarkType;
}

interface BookmarkedMetricsState {
  // Map of "deviceId:metric" -> bookmark type ('main' | 'live' | null)
  bookmarks: Map<string, BookmarkType>;
  
  // Actions
  setBookmark: (deviceId: string, metric: string, type: BookmarkType) => void;
  getBookmarkType: (deviceId: string, metric: string) => BookmarkType;
  getBookmarkedMetrics: (type: BookmarkType) => BookmarkedMetric[];
  clearBookmark: (deviceId: string, metric: string) => void;
  isPinned: (deviceId: string, metric: string) => boolean; // backward compat
}

function getKey(deviceId: string, metric: string): string {
  return `${deviceId}:${metric}`;
}

export const usePinnedMetrics = create<BookmarkedMetricsState>((set, get) => ({
  bookmarks: new Map(),

  setBookmark: (deviceId, metric, type) => {
    const key = getKey(deviceId, metric);
    const updated = new Map(get().bookmarks);
    
    if (type === null) {
      updated.delete(key);
    } else {
      updated.set(key, type);
    }
    
    set({ bookmarks: updated });
  },

  getBookmarkType: (deviceId, metric) => {
    return get().bookmarks.get(getKey(deviceId, metric)) || null;
  },

  getBookmarkedMetrics: (type) => {
    const list: BookmarkedMetric[] = [];
    get().bookmarks.forEach((bookmarkType, key) => {
      if (type === null) {
        if (bookmarkType === null) {
          const [deviceId, metric] = key.split(':');
          list.push({ deviceId, metric, type: bookmarkType });
        }
      } else if (bookmarkType === type) {
        const [deviceId, metric] = key.split(':');
        list.push({ deviceId, metric, type: bookmarkType });
      }
    });
    return list;
  },

  clearBookmark: (deviceId, metric) => {
    const key = getKey(deviceId, metric);
    const updated = new Map(get().bookmarks);
    updated.delete(key);
    set({ bookmarks: updated });
  },

  // Backward compatibility: returns true if bookmarked to either 'main' or 'live'
  isPinned: (deviceId, metric) => {
    const type = get().bookmarks.get(getKey(deviceId, metric));
    return type !== null && type !== undefined;
  },
}));
