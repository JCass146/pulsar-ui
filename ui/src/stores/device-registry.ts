import { create } from 'zustand';
import { Device, DeviceHealth, DeviceFilter } from '@/types/device';

/**
 * Device registry state
 */
interface DeviceRegistryState {
  devices: Map<string, Device>;
  filter: DeviceFilter;
  
  // Actions
  addDevice: (device: Device) => void;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  removeDevice: (id: string) => void;
  setFilter: (filter: Partial<DeviceFilter>) => void;
  clearFilter: () => void;
  
  // Selectors
  getDevice: (id: string) => Device | undefined;
  getFilteredDevices: () => Device[];
  getDevicesByHealth: (health: DeviceHealth) => Device[];
  getDevicesByRole: (role: string) => Device[];
}

/**
 * Device registry Zustand store
 */
export const useDeviceRegistry = create<DeviceRegistryState>((set, get) => ({
  devices: new Map(),
  filter: {},

  addDevice: (device) =>
    set((state) => {
      const newDevices = new Map(state.devices);
      newDevices.set(device.id, device);
      return { devices: newDevices };
    }),

  updateDevice: (id, updates) =>
    set((state) => {
      const existing = state.devices.get(id);
      if (!existing) return state;

      const newDevices = new Map(state.devices);
      newDevices.set(id, { ...existing, ...updates });
      return { devices: newDevices };
    }),

  removeDevice: (id) =>
    set((state) => {
      const newDevices = new Map(state.devices);
      newDevices.delete(id);
      return { devices: newDevices };
    }),

  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
    })),

  clearFilter: () => set({ filter: {} }),

  getDevice: (id) => get().devices.get(id),

  getFilteredDevices: () => {
    const { devices, filter } = get();
    let filtered = Array.from(devices.values());

    if (filter.role) {
      filtered = filtered.filter((d) => d.role === filter.role);
    }
    if (filter.health) {
      filtered = filtered.filter((d) => d.health === filter.health);
    }
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      filtered = filtered.filter((d) => d.id.toLowerCase().includes(query));
    }

    return filtered.sort((a, b) => a.id.localeCompare(b.id));
  },

  getDevicesByHealth: (health) => {
    return Array.from(get().devices.values()).filter((d) => d.health === health);
  },

  getDevicesByRole: (role) => {
    return Array.from(get().devices.values()).filter((d) => d.role === role);
  },
}));
