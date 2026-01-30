import { create } from 'zustand';
import { Command, CommandStatus } from '@/types/command';

/**
 * Command queue state
 */
interface CommandQueueState {
  commands: Map<string, Command>;
  
  // Actions
  stageCommand: (command: Command) => void;
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
