import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import DeviceRow from './DeviceRow.jsx';

function VirtualizedDeviceList({
  devices,
  selectedDevice,
  onSelect,
  compact = false,
  groupByRole = false,
  searchTerm = ''
}) {
  // Filter devices by search term
  const filteredDevices = useMemo(() => {
    if (!searchTerm) return devices;
    return devices.filter(device =>
      device.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [devices, searchTerm]);

  // Group devices by role if enabled
  const groupedDevices = useMemo(() => {
    if (!groupByRole) return { '': filteredDevices };

    const groups = {};
    filteredDevices.forEach(device => {
      const role = device.role || 'unknown';
      if (!groups[role]) groups[role] = [];
      groups[role].push(device);
    });
    return groups;
  }, [filteredDevices, groupByRole]);

  // Flatten grouped devices for virtualization
  const flatDevices = useMemo(() => {
    return Object.values(groupedDevices).flat();
  }, [groupedDevices]);

  // Row renderer for virtualized list
  const Row = ({ index, style }) => {
    const device = flatDevices[index];
    return (
      <div style={style}>
        <DeviceRow
          device={device}
          isSelected={device.id === selectedDevice}
          onClick={() => onSelect(device.id)}
          compact={compact}
        />
      </div>
    );
  };

  // Calculate list height based on compact mode
  const itemSize = compact ? 40 : 56;
  const maxHeight = compact ? 240 : 360;

  return (
    <div className={`deviceList ${compact ? 'compact' : ''}`}>
      {Object.entries(groupedDevices).map(([role, roleDevices]) => (
        <div key={role} className="deviceGroup">
          {groupByRole && role && (
            <div className="groupHdr">
              <span>{role}</span>
              <span className="muted">{roleDevices.length}</span>
            </div>
          )}
          <div className="groupBody">
            <AutoSizer>
              {({ height, width }) => (
                <List
                  height={Math.min(height, maxHeight)}
                  itemCount={roleDevices.length}
                  itemSize={itemSize}
                  width={width}
                >
                  {({ index, style }) => (
                    <DeviceRow
                      device={roleDevices[index]}
                      isSelected={roleDevices[index].id === selectedDevice}
                      onClick={() => onSelect(roleDevices[index].id)}
                      compact={compact}
                      style={style}
                    />
                  )}
                </List>
              )}
            </AutoSizer>
          </div>
        </div>
      ))}
    </div>
  );
}

// Separate DeviceRow component for better organization
function DeviceRow({ device, isSelected, onClick, compact, style }) {
  return (
    <div
      className={`deviceRow ${isSelected ? 'active' : ''} ${compact ? 'compact' : ''}`}
      onClick={onClick}
      style={style}
    >
      <div className="dot" data-status={device.online ? (device.stale ? 'stale' : 'online') : 'offline'} />
      <div className="deviceMain">
        <div className="deviceId">{device.id}</div>
        {device.role && <div className="deviceRole muted">{device.role}</div>}
      </div>
      <div className="deviceRight">
        <div className="deviceSeen muted">
          {device.lastSeenMs ? new Date(device.lastSeenMs).toLocaleTimeString() : '—'}
        </div>
      </div>
    </div>
  );
}

export default VirtualizedDeviceList;