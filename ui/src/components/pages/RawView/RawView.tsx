import { useState, useMemo } from 'react';
import { useMqttMessages, MessageFilter } from '@/stores/mqtt-messages';
import { useDeviceRegistry } from '@/stores/device-registry';
import { Card, CardBody } from '@/components/atoms/Card/Card';
import { Input } from '@/components/atoms/Input/Input';
import { Button } from '@/components/atoms/Button/Button';
import { RawMessageTable } from '@/components/organisms/RawMessageTable/RawMessageTable';
import styles from './RawView.module.css';

const MESSAGE_TYPES = ['telemetry', 'status', 'command', 'response', 'event'];

export function RawView() {
  const [filter, setFilter] = useState<MessageFilter>({});
  const getFilteredMessages = useMqttMessages((state) => state.getFilteredMessages);
  const clearMessages = useMqttMessages((state) => state.clearMessages);
  const devicesMap = useDeviceRegistry((state) => state.devices);

  const devices = useMemo(() => Array.from(devicesMap.values()), [devicesMap]);
  const filteredMessages = useMemo(() => getFilteredMessages(filter), [filter, getFilteredMessages]);

  const handleDeviceChange = (deviceId: string) => {
    setFilter((prev) => {
      const newFilter = { ...prev };
      if (deviceId) {
        newFilter.deviceId = deviceId;
      } else {
        delete newFilter.deviceId;
      }
      return newFilter;
    });
  };

  const handleMessageTypeChange = (messageType: string) => {
    setFilter((prev) => {
      const newFilter = { ...prev };
      if (messageType) {
        newFilter.messageType = messageType;
      } else {
        delete newFilter.messageType;
      }
      return newFilter;
    });
  };

  const handleTopicChange = (topic: string) => {
    setFilter((prev) => {
      const newFilter = { ...prev };
      if (topic) {
        newFilter.topic = topic;
      } else {
        delete newFilter.topic;
      }
      return newFilter;
    });
  };

  const handleSearchChange = (search: string) => {
    setFilter((prev) => {
      const newFilter = { ...prev };
      if (search) {
        newFilter.search = search;
      } else {
        delete newFilter.search;
      }
      return newFilter;
    });
  };

  const handleClearFilters = () => {
    setFilter({});
  };

  const exportMessages = () => {
    const data = JSON.stringify(filteredMessages, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mqtt-messages-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters = !!(filter.deviceId || filter.messageType || filter.topic || filter.search);

  return (
    <div className={styles.rawView}>
      {/* Filters */}
      <Card>
        <CardBody>
          <div className={styles.filters}>
            <div className={styles.filterRow}>
              {/* Device Filter */}
              <div className={styles.filterField}>
                <label className={styles.label}>Device</label>
                <select
                  className={styles.select}
                  value={filter.deviceId || ''}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                >
                  <option value="">All Devices</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message Type Filter */}
              <div className={styles.filterField}>
                <label className={styles.label}>Message Type</label>
                <select
                  className={styles.select}
                  value={filter.messageType || ''}
                  onChange={(e) => handleMessageTypeChange(e.target.value)}
                >
                  <option value="">All Types</option>
                  {MESSAGE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic Filter */}
              <div className={styles.filterField}>
                <label className={styles.label}>Topic</label>
                <Input
                  value={filter.topic || ''}
                  onChange={(e) => handleTopicChange(e.target.value)}
                  placeholder="Filter by topic..."
                />
              </div>

              {/* Search */}
              <div className={styles.filterField}>
                <label className={styles.label}>Search</label>
                <Input
                  value={filter.search || ''}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search payload..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
              >
                Clear Filters
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={exportMessages}
                disabled={filteredMessages.length === 0}
              >
                Export JSON
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={clearMessages}
              >
                Clear All Messages
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Message Table */}
      <RawMessageTable
        messages={filteredMessages}
        emptyMessage={
          hasActiveFilters
            ? 'No messages match the current filters'
            : 'No messages received yet. Messages will appear here as they arrive.'
        }
      />
    </div>
  );
}
