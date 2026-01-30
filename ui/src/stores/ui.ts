import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthorityLevel } from '@/types/command';

/**
 * UI state - theme, sidebar, modals, authority
 */
interface UiState {
  // Theme
  theme: 'light' | 'dark';
  
  // Sidebar
  sidebarCollapsed: boolean;
  
  // Authority
  authorityLevel: AuthorityLevel;
  armedUntil: number | null; // Unix timestamp ms
  
  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setAuthorityLevel: (level: AuthorityLevel, duration?: number) => void;
  clearArmed: () => void;
  isArmed: () => boolean;
}

/**
 * UI state Zustand store with localStorage persistence
 */
export const useUiState = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sidebarCollapsed: false,
      authorityLevel: AuthorityLevel.View,
      armedUntil: null,

      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(newTheme);
      },

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setAuthorityLevel: (level, duration) => {
        if (level === AuthorityLevel.Armed && duration) {
          set({
            authorityLevel: level,
            armedUntil: Date.now() + duration,
          });
        } else {
          set({
            authorityLevel: level,
            armedUntil: null,
          });
        }
      },

      clearArmed: () =>
        set({
          authorityLevel: AuthorityLevel.Control,
          armedUntil: null,
        }),

      isArmed: () => {
        const { authorityLevel, armedUntil } = get();
        if (authorityLevel !== AuthorityLevel.Armed) return false;
        if (!armedUntil) return true;
        if (Date.now() > armedUntil) {
          get().clearArmed();
          return false;
        }
        return true;
      },
    }),
    {
      name: 'pulsar-ui-state',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
