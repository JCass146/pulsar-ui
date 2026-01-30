import { useMemo } from 'react';
import { Card, CardHeader, CardBody } from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import { Pill } from '@/components/atoms/Pill/Pill';
import { useCommandQueue } from '@/stores/command-queue';
import { Command, CommandStatus } from '@/types/command';
import styles from './CommandQueue.module.css';

export function CommandQueue() {
  const commands = useCommandQueue((state) => state.commands);
  const removeCommand = useCommandQueue((state) => state.removeCommand);
  const updateCommandStatus = useCommandQueue((state) => state.updateCommandStatus);

  const allCommands = useMemo(() => Array.from(commands.values()), [commands]);
  
  const stagedCommands = useMemo(() => 
    allCommands.filter((cmd) => cmd.status === CommandStatus.Staged),
    [allCommands]
  );
  
  const pendingCommands = useMemo(() => 
    allCommands.filter((cmd) => 
      cmd.status === CommandStatus.Pending || cmd.status === CommandStatus.Sent
    ),
    [allCommands]
  );
  
  const historyCommands = useMemo(() => 
    allCommands.filter((cmd) => 
      cmd.status === CommandStatus.Success || 
      cmd.status === CommandStatus.Failed || 
      cmd.status === CommandStatus.Timeout
    ),
    [allCommands]
  );

  const executeStaged = () => {
    stagedCommands.forEach((cmd) => {
      updateCommandStatus(cmd.id, CommandStatus.Pending);
    });
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusVariant = (status: CommandStatus): 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case CommandStatus.Staged: return 'default';
      case CommandStatus.Pending: return 'warning';
      case CommandStatus.Sent: return 'info';
      case CommandStatus.Success: return 'success';
      case CommandStatus.Failed: return 'danger';
      case CommandStatus.Timeout: return 'danger';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className={styles.header}>
          <h2>Command Queue</h2>
          {stagedCommands.length > 0 && (
            <Button variant="primary" onClick={executeStaged}>
              Execute All ({stagedCommands.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody>
        <div className={styles.sections}>
          {/* Staged Commands */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Staged ({stagedCommands.length})
            </h3>
            {stagedCommands.length === 0 ? (
              <p className={styles.emptyText}>No staged commands</p>
            ) : (
              <div className={styles.commandList}>
                {stagedCommands.map((cmd: Command) => (
                  <div key={cmd.id} className={styles.commandItem}>
                    <div className={styles.commandInfo}>
                      <div className={styles.commandHeader}>
                        <span className={styles.commandName}>{cmd.action}</span>
                        <span className={styles.device}>{cmd.deviceId}</span>
                      </div>
                      <code className={styles.params}>
                        {JSON.stringify(cmd.payload)}
                      </code>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => removeCommand(cmd.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Commands */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Pending ({pendingCommands.length})
            </h3>
            {pendingCommands.length === 0 ? (
              <p className={styles.emptyText}>No pending commands</p>
            ) : (
              <div className={styles.commandList}>
                {pendingCommands.map((cmd: Command) => (
                  <div key={cmd.id} className={styles.commandItem}>
                    <div className={styles.commandInfo}>
                      <div className={styles.commandHeader}>
                        <span className={styles.commandName}>{cmd.action}</span>
                        <span className={styles.device}>{cmd.deviceId}</span>
                      </div>
                      <code className={styles.params}>
                        {JSON.stringify(cmd.payload)}
                      </code>
                    </div>
                    <Pill variant={getStatusVariant(cmd.status)} size="sm">
                      {cmd.status}
                    </Pill>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              History ({historyCommands.length})
            </h3>
            {historyCommands.length === 0 ? (
              <p className={styles.emptyText}>No command history</p>
            ) : (
              <div className={styles.commandList}>
                {historyCommands.slice(-10).reverse().map((cmd: Command) => (
                  <div key={cmd.id} className={styles.commandItem}>
                    <div className={styles.commandInfo}>
                      <div className={styles.commandHeader}>
                        <span className={styles.commandName}>{cmd.action}</span>
                        <span className={styles.device}>{cmd.deviceId}</span>
                        <span className={styles.timestamp}>
                          {cmd.completedAt && formatTimestamp(cmd.completedAt)}
                        </span>
                      </div>
                      <code className={styles.params}>
                        {JSON.stringify(cmd.payload)}
                      </code>
                    </div>
                    <Pill variant={getStatusVariant(cmd.status)} size="sm">
                      {cmd.status}
                    </Pill>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
