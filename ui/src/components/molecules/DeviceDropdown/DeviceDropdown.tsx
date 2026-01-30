import { Device } from '@/types/device';
import styles from './DeviceDropdown.module.css';

export interface DeviceDropdownProps {
  devices: Device[];
  selectedDeviceId: string | null;
  onDeviceSelect: (deviceId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function DeviceDropdown({
  devices,
  selectedDeviceId,
  onDeviceSelect,
  disabled = false,
  placeholder = 'Select a device...',
}: DeviceDropdownProps) {
  return (
    <div className={styles.dropdown}>
      <label className={styles.label}>Target Device</label>
      <select
        className={styles.select}
        value={selectedDeviceId || ''}
        onChange={(e) => onDeviceSelect(e.target.value || null)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {devices.map((device) => (
          <option key={device.id} value={device.id}>
            {device.id} ({device.role})
          </option>
        ))}
      </select>
    </div>
  );
}
