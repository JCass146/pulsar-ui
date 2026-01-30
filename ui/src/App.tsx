import { useNavigation } from '@/stores/navigation';
import { useUiState } from '@/stores/ui';
import { Sidebar } from '@/components/organisms/Sidebar/Sidebar';
import { DashboardView } from '@/components/pages/DashboardView/DashboardView';
import { FleetView } from '@/components/pages/FleetView/FleetView';
import { CommandsView } from '@/components/pages/CommandsView/CommandsView';
import { RawView } from '@/components/pages/RawView/RawView';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/utilities.css';

function App() {
  const currentView = useNavigation((state) => state.currentView);
  const sidebarCollapsed = useUiState((state) => state.sidebarCollapsed);

  return (
    <div className={`app-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar />
      
      <main className="main-content">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'fleet' && <FleetView />}
        {currentView === 'commands' && <CommandsView />}
        {currentView === 'raw' && <RawView />}
      </main>
    </div>
  );
}

export default App;
