import { useState, useMemo } from 'react';
import { useDeviceRegistry } from '@/stores/device-registry';
import { CommandStatus } from '@/types/command';
import { Card, CardBody } from '@/components/atoms/Card/Card';
import { Checkbox } from '@/components/atoms/Checkbox/Checkbox';
import { DeviceDropdown } from '@/components/molecules/DeviceDropdown/DeviceDropdown';
import { CommandTemplateCard, CommandTemplate } from '@/components/molecules/CommandTemplateCard/CommandTemplateCard';
import { CommandBuilder } from '@/components/organisms/CommandBuilder/CommandBuilder';
import { CommandQueue } from '@/components/organisms/CommandQueue/CommandQueue';
import { useCommandQueue } from '@/stores/command-queue';
import styles from './CommandsView.module.css';

const COMMAND_TEMPLATES: CommandTemplate[] = [
  {
    id: 'activate-relay',
    name: 'Activate Relay',
    description: 'Turn on a relay for a specified duration',
    command: 'activate_relay',
    params: { duration: 5000 },
  },
  {
    id: 'deactivate-relay',
    name: 'Deactivate Relay',
    description: 'Turn off all relays',
    command: 'deactivate_relay',
    params: {},
  },
  {
    id: 'set-threshold',
    name: 'Set Threshold',
    description: 'Update pressure threshold for alerts',
    command: 'set_threshold',
    params: { metric: 'pressure', value: 100 },
  },
  {
    id: 'request-status',
    name: 'Request Status',
    description: 'Request full device status report',
    command: 'request_status',
    params: {},
  },
];

export function CommandsView() {
  const [targetDeviceId, setTargetDeviceId] = useState<string | null>(null);
  const [isBroadcast, setIsBroadcast] = useState(false);
  const devicesMap = useDeviceRegistry((state) => state.devices);
  const stageCommand = useCommandQueue((state) => state.stageCommand);

  const devices = useMemo(() => Array.from(devicesMap.values()), [devicesMap]);

  const handleTemplateUse = (template: CommandTemplate) => {
    if (!isBroadcast && !targetDeviceId) {
      return;
    }

    stageCommand({
      id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      deviceId: isBroadcast ? '*' : targetDeviceId!,
      action: template.command,
      payload: template.params,
      status: CommandStatus.Staged,
      stagedAt: Date.now(),
      requiresArmed: false,
    });
  };

  const handleBroadcastToggle = (checked: boolean) => {
    setIsBroadcast(checked);
    if (checked) {
      setTargetDeviceId(null);
    }
  };

  return (
    <div className={styles.commandsView}>
      <div className={styles.mainContent}>
        {/* Target Selection */}
        <Card>
          <CardBody>
            <div className={styles.targetSection}>
              <DeviceDropdown
                devices={devices}
                selectedDeviceId={targetDeviceId}
                onDeviceSelect={setTargetDeviceId}
                disabled={isBroadcast}
                placeholder={isBroadcast ? 'Broadcast to all devices' : 'Select a device...'}
              />
              
              <Checkbox
                label="Broadcast to all devices"
                checked={isBroadcast}
                onChange={(e) => handleBroadcastToggle(e.target.checked)}
              />

              {isBroadcast && (
                <div className={styles.warning}>
                  ⚠️ Broadcast commands will be sent to all devices in the fleet
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Command Templates */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Command Templates</h2>
          <div className={styles.templatesGrid}>
            {COMMAND_TEMPLATES.map((template) => (
              <CommandTemplateCard
                key={template.id}
                template={template}
                onUse={handleTemplateUse}
              />
            ))}
          </div>
        </div>

        {/* Custom Command Builder */}
        <CommandBuilder targetDeviceId={targetDeviceId} isBroadcast={isBroadcast} />

        {/* Command Queue */}
        <CommandQueue />
      </div>
    </div>
  );
}
