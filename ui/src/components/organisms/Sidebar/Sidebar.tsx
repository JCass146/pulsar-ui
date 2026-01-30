import { useNavigation, ViewType } from '@/stores/navigation';
import { useUiState } from '@/stores/ui';
import { useMqttConnection } from '@/hooks/useMqtt';
import { NavItem } from '@/components/atoms/NavItem/NavItem';
import { StatusBadge } from '@/components/atoms/StatusBadge/StatusBadge';
import { Button } from '@/components/atoms/Button/Button';
import styles from './Sidebar.module.css';

function getMqttConfig() {
  const url = import.meta.env.VITE_MQTT_WS_URL || 'ws://localhost:9001';
  return { url };
}

export function Sidebar() {
  const currentView = useNavigation((state) => state.currentView);
  const setView = useNavigation((state) => state.setView);
  const collapsed = useUiState((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiState((state) => state.toggleSidebar);
  const toggleTheme = useUiState((state) => state.toggleTheme);
  const theme = useUiState((state) => state.theme);
  const connectionState = useMqttConnection(getMqttConfig());

  const navItems: Array<{ view: ViewType; icon: string; label: string }> = [
    { view: 'dashboard', icon: '📊', label: 'Dashboard' },
    { view: 'fleet', icon: '🚀', label: 'Fleet' },
    { view: 'commands', icon: '⚡', label: 'Commands' },
    { view: 'raw', icon: '📡', label: 'Raw' },
  ];

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>⚡</span>
        {!collapsed && <span className={styles.brandText}>Pulsar UI</span>}
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <NavItem
            key={item.view}
            icon={item.icon}
            label={item.label}
            active={currentView === item.view}
            collapsed={collapsed}
            onClick={() => setView(item.view)}
          />
        ))}
      </nav>

      <div className={styles.footer}>
        {!collapsed && (
          <div className={styles.connectionStatus}>
            <StatusBadge status={connectionState} size="sm" />
          </div>
        )}

        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleSidebar}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </Button>
        </div>

        {!collapsed && (
          <div className={styles.version}>
            <span>v2.0.0</span>
          </div>
        )}
      </div>
    </aside>
  );
}
