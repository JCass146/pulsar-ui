import { create } from 'zustand';

export type ViewType = 'dashboard' | 'fleet' | 'commands' | 'raw';

interface NavigationState {
  currentView: ViewType;
  setView: (view: ViewType) => void;
}

export const useNavigation = create<NavigationState>((set) => ({
  currentView: 'dashboard',
  
  setView: (view) => {
    window.location.hash = `#/${view}`;
    set({ currentView: view });
  },
}));

// Initialize from URL hash on load
if (typeof window !== 'undefined') {
  const initializeFromHash = () => {
    const hash = window.location.hash.slice(2); // Remove '#/'
    const validViews: ViewType[] = ['dashboard', 'fleet', 'commands', 'raw'];
    const view = validViews.includes(hash as ViewType) ? (hash as ViewType) : 'dashboard';
    useNavigation.setState({ currentView: view });
  };

  // Listen to hash changes
  window.addEventListener('hashchange', initializeFromHash);
  initializeFromHash();
}
