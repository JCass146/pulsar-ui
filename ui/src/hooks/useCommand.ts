import { useCommandQueue } from '@/stores/command-queue';
import { useUiState } from '@/stores/ui';
import { Command, CommandStatus, AuthorityLevel } from '@/types/command';
import { mqttClient } from '@/services/mqtt/client';
import { buildTopic } from '@/services/mqtt/parser';

/**
 * Hook to stage and execute commands
 */
export function useCommand() {
  const stageCommand = useCommandQueue((state) => state.stageCommand);
  const updateCommandStatus = useCommandQueue((state) => state.updateCommandStatus);
  const authorityLevel = useUiState((state) => state.authorityLevel);
  const isArmed = useUiState((state) => state.isArmed);

  /**
   * Stage a command (add to queue without executing)
   */
  const stage = (command: Omit<Command, 'id' | 'status' | 'stagedAt'>): string => {
    const id = `cmd-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const fullCommand: Command = {
      ...command,
      id,
      status: CommandStatus.Staged,
      stagedAt: Date.now(),
    };
    stageCommand(fullCommand);
    return id;
  };

  /**
   * Execute a staged command
   */
  const execute = async (commandId: string): Promise<void> => {
    const command = useCommandQueue.getState().getCommand(commandId);
    if (!command) {
      throw new Error(`Command ${commandId} not found`);
    }

    // Authority check
    if (command.requiresArmed && !isArmed()) {
      throw new Error('Command requires ARMED authority level');
    }
    if (authorityLevel === AuthorityLevel.View) {
      throw new Error('Cannot execute commands in VIEW mode');
    }

    // Update status to pending
    updateCommandStatus(commandId, CommandStatus.Pending);

    try {
      // Build topic and publish
      const topic = buildTopic(command.deviceId, 'command', command.action);
      const payload = JSON.stringify(command.payload);

      await mqttClient.publish(topic, payload, { qos: 1 });

      // Update status to sent
      updateCommandStatus(commandId, CommandStatus.Sent);

      // Wait for ACK (simplified - in production you'd listen for ACK message)
      // For now, mark as success after a timeout
      setTimeout(() => {
        updateCommandStatus(commandId, CommandStatus.Success);
      }, 1000);
    } catch (error) {
      updateCommandStatus(
        commandId,
        CommandStatus.Failed,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  };

  /**
   * Stage and immediately execute a command
   */
  const stageAndExecute = async (
    command: Omit<Command, 'id' | 'status' | 'stagedAt'>
  ): Promise<string> => {
    const id = stage(command);
    await execute(id);
    return id;
  };

  return {
    stage,
    execute,
    stageAndExecute,
  };
}

/**
 * Hook to access command queue
 */
export function useCommandHistory() {
  const pending = useCommandQueue((state) => state.getPendingCommands());
  const history = useCommandQueue((state) => state.getCommandHistory());
  const clearHistory = useCommandQueue((state) => state.clearHistory);

  return {
    pending,
    history,
    clearHistory,
  };
}
