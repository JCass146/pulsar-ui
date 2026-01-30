import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import { Input } from '@/components/atoms/Input/Input';
import { useCommandQueue } from '@/stores/command-queue';
import { CommandStatus } from '@/types/command';
import styles from './CommandBuilder.module.css';

export interface CommandBuilderProps {
  targetDeviceId: string | null;
  isBroadcast: boolean;
}

export function CommandBuilder({ targetDeviceId, isBroadcast }: CommandBuilderProps) {
  const [command, setCommand] = useState('');
  const [params, setParams] = useState('{}');
  const [paramsError, setParamsError] = useState<string | null>(null);
  const stageCommand = useCommandQueue((state) => state.stageCommand);

  const handleParamsChange = (value: string) => {
    setParams(value);
    try {
      JSON.parse(value);
      setParamsError(null);
    } catch (e) {
      setParamsError('Invalid JSON');
    }
  };

  const handleStage = () => {
    if (!command.trim()) {
      return;
    }

    if (!isBroadcast && !targetDeviceId) {
      return;
    }

    try {
      const parsedParams = JSON.parse(params);
      
      stageCommand({
        id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        deviceId: isBroadcast ? '*' : targetDeviceId!,
        action: command.trim(),
        payload: parsedParams,
        status: CommandStatus.Staged,
        stagedAt: Date.now(),
        requiresArmed: false,
      });

      // Reset form
      setCommand('');
      setParams('{}');
      setParamsError(null);
    } catch (e) {
      setParamsError('Invalid JSON parameters');
    }
  };

  const canStage = command.trim() && !paramsError && (isBroadcast || targetDeviceId);

  return (
    <Card>
      <CardHeader>
        <h2>Command Builder</h2>
      </CardHeader>
      <CardBody>
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Command</label>
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g., activate_relay, set_threshold"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Parameters (JSON)</label>
            <textarea
              className={styles.textarea}
              value={params}
              onChange={(e) => handleParamsChange(e.target.value)}
              placeholder='{"key": "value"}'
              rows={4}
            />
            {paramsError && <span className={styles.error}>{paramsError}</span>}
          </div>

          <Button
            onClick={handleStage}
            disabled={!canStage}
            variant="primary"
            className={styles.stageButton}
          >
            Stage Command
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
