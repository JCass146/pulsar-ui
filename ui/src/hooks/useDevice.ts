import { useDeviceRegistry } from '@/stores/device-registry';
import { Device, DeviceFilter } from '@/types/device';

/**
 * Hook to access a single device
 */
export function useDevice(deviceId: string | null): Device | undefined {
  return useDeviceRegistry((state) => 
    deviceId ? state.devices.get(deviceId) : undefined
  );
}

/**
 * Hook to access selected device
 * Note: Device selection is now view-specific, not global.
 * This hook is deprecated - use local state in your view component instead.
 */
export function useSelectedDevice(): {
  device: Device | undefined;
  selectDevice: (id: string | null) => void;
} {
  // This hook is deprecated - selection is now view-specific
  return { 
    device: undefined, 
    selectDevice: () => console.warn('useSelectedDevice is deprecated - use local state instead') 
  };
}

/**
 * Hook to access filtered device list
 */
export function useDeviceList(filter?: DeviceFilter) {
  const setFilter = useDeviceRegistry((state) => state.setFilter);
  const clearFilter = useDeviceRegistry((state) => state.clearFilter);
  const devices = useDeviceRegistry((state) => state.getFilteredDevices());

  // Apply filter on mount
  if (filter) {
    setFilter(filter);
  }

  return {
    devices,
    setFilter,
    clearFilter,
  };
}
