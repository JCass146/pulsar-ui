import { useState, useEffect } from 'react';
import { useNavigation } from '@/stores/navigation';
import { useUiState } from '@/stores/ui';
import { useDeviceRegistry } from '@/stores/device-registry';
import { useMqttConnection } from '@/hooks/useMqtt';
import { loadRuntimeConfig } from '@/config';
import { DeviceHealth } from '@/types/device';
import { MqttConfig } from '@/types/mqtt';
import { Sidebar } from '@/components/organisms/Sidebar/Sidebar';
import { DashboardView } from '@/components/pages/DashboardView/DashboardView';
import { FleetView } from '@/components/pages/FleetView/FleetView';
import { CommandsView } from '@/components/pages/CommandsView/CommandsView';
import { RawView } from '@/components/pages/RawView/RawView';
import { NotificationRail } from '@/components/organisms/NotificationRail/NotificationRail';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/utilities.css';

function App() {
  console.log('[App] Component rendering...');
  const currentView = useNavigation((state) => state.currentView);
  const sidebarCollapsed = useUiState((state) => state.sidebarCollapsed);
  const [mqttConfig, setMqttConfig] = useState<MqttConfig | null>(null);

  console.log('[App] Current view:', currentView, 'Sidebar collapsed:', sidebarCollapsed);

  // Load runtime config on mount
  useEffect(() => {
    console.log('[App] Loading runtime config...');
    loadRuntimeConfig().then((config) => {
      console.log('[App] Loaded MQTT config:', config.mqttWsUrl);
      setMqttConfig({ url: config.mqttWsUrl });
    }).catch((err) => {
      console.error('[App] Failed to load config:', err);
    });
  }, []);

  // Initialize MQTT connection (only when config is loaded)
  const connectionState = useMqttConnection(mqttConfig);

  // Background health monitoring - recalculate device health every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const devices = useDeviceRegistry.getState().devices;
      const updateDevice = useDeviceRegistry.getState().updateDevice;
      const now = Date.now();

      devices.forEach((device) => {
        const age = now - device.lastSeen;
        let health = DeviceHealth.Healthy;
        
        if (age > 60000) {
          health = DeviceHealth.Offline;
        } else if (age > 10000) {
          health = DeviceHealth.Warning;
        }

        if (device.health !== health) {
          updateDevice(device.id, { health });
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  console.log('[App] Rendering JSX with connectionState:', connectionState);

  return (
    <div className={`app-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar connectionState={connectionState} />
      
      <main className="main-content">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'fleet' && <FleetView />}
        {currentView === 'commands' && <CommandsView />}
        {currentView === 'raw' && <RawView />}
      </main>
      
      <NotificationRail />
    </div>
  );
}

export default App;
