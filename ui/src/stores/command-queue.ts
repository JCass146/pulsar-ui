import { create } from 'zustand';
import { Command, CommandStatus } from '@/types/command';
import { mqttClient } from '@/services/mqtt/client';
import { buildTopic } from '@/services/mqtt/parser';

/**
 * Command queue state
 */
interface CommandQueueState {
  commands: Map<string, Command>;
  
  // Actions
  stageCommand: (command: Command) => void;
  executeCommand: (id: string) => Promise<void>;
  updateCommandStatus: (id: string, status: CommandStatus, error?: string) => void;
  removeCommand: (id: string) => void;
  clearHistory: () => void;
  
  // Selectors
  getCommand: (id: string) => Command | undefined;
  getPendingCommands: () => Command[];
  getCommandHistory: () => Command[];
  getDeviceCommands: (deviceId: string) => Command[];
}

/**
 * Command queue Zustand store
 */
export const useCommandQueue = create<CommandQueueState>((set, get) => ({
  commands: new Map(),

  stageCommand: (command) =>
    set((state) => {
      const newCommands = new Map(state.commands);
      newCommands.set(command.id, command);
      return { commands: newCommands };
    }),

  executeCommand: async (id) => {
    const command = get().getCommand(id);
    if (!command) {
      console.error('[CommandQueue] Command not found:', id);
      return;
    }

    try {
      // Update status to pending
      get().updateCommandStatus(id, CommandStatus.Pending);

      // Build MQTT topic: pulsar/{deviceId}/cmd/{action}
      const topic = buildTopic(command.deviceId, 'cmd', command.action);
      
      // Publish command to MQTT
      await mqttClient.publish(topic, JSON.stringify(command.payload), { qos: 1 });
      
      console.log('[CommandQueue] Published command:', { topic, payload: command.payload });

      // Update status to sent
      get().updateCommandStatus(id, CommandStatus.Sent);

      // Set timeout for command response
      setTimeout(() => {
        const cmd = get().getCommand(id);
        if (cmd && cmd.status === CommandStatus.Sent) {
          get().updateCommandStatus(id, CommandStatus.Timeout, 'Command timeout - no response received');
        }
      }, 5000); // 5 second timeout

    } catch (error) {
      console.error('[CommandQueue] Failed to publish command:', error);
      get().updateCommandStatus(id, CommandStatus.Failed, error instanceof Error ? error.message : 'Unknown error');
    }
  },

  updateCommandStatus: (id, status, error) =>
    set((state) => {
      const existing = state.commands.get(id);
      if (!existing) return state;

      const newCommands = new Map(state.commands);
      const updates: Partial<Command> = { status };

      if (status === CommandStatus.Sent && !existing.sentAt) {
        updates.sentAt = Date.now();
      }
      if (
        (status === CommandStatus.Success ||
          status === CommandStatus.Failed ||
          status === CommandStatus.Timeout) &&
        !existing.completedAt
      ) {
        updates.completedAt = Date.now();
      }
      if (error) {
        updates.error = error;
      }

      newCommands.set(id, { ...existing, ...updates });
      return { commands: newCommands };
    }),

  removeCommand: (id) =>
    set((state) => {
      const newCommands = new Map(state.commands);
      newCommands.delete(id);
      return { commands: newCommands };
    }),

  clearHistory: () =>
    set((state) => {
      const newCommands = new Map(state.commands);
      // Keep only pending/staged commands
      for (const [id, cmd] of newCommands.entries()) {
        if (
          cmd.status === CommandStatus.Success ||
          cmd.status === CommandStatus.Failed ||
          cmd.status === CommandStatus.Timeout
        ) {
          newCommands.delete(id);
        }
      }
      return { commands: newCommands };
    }),

  getCommand: (id) => get().commands.get(id),

  getPendingCommands: () => {
    return Array.from(get().commands.values())
      .filter(
        (cmd) =>
          cmd.status === CommandStatus.Staged ||
          cmd.status === CommandStatus.Pending ||
          cmd.status === CommandStatus.Sent
      )
      .sort((a, b) => b.stagedAt - a.stagedAt);
  },

  getCommandHistory: () => {
    return Array.from(get().commands.values())
      .filter(
        (cmd) =>
          cmd.status === CommandStatus.Success ||
          cmd.status === CommandStatus.Failed ||
          cmd.status === CommandStatus.Timeout
      )
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  },

  getDeviceCommands: (deviceId) => {
    return Array.from(get().commands.values())
      .filter((cmd) => cmd.deviceId === deviceId)
      .sort((a, b) => b.stagedAt - a.stagedAt);
  },
}));
