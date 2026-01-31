import { useState, useEffect, useMemo } from 'react';
import { useNavigation } from '@/stores/navigation';
import { useUiState } from '@/stores/ui';
import { useDeviceRegistry } from '@/stores/device-registry';
import { useMqttConnection } from '@/hooks/useMqtt';
import { loadRuntimeConfig } from '@/config';
import { DeviceHealth } from '@/types/device';
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
  const currentView = useNavigation((state) => state.currentView);
  const sidebarCollapsed = useUiState((state) => state.sidebarCollapsed);
  const [mqttUrl, setMqttUrl] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Load runtime config on mount
  useEffect(() => {
    loadRuntimeConfig()
      .then((config) => {
        setMqttUrl(config.mqttWsUrl);
        setConfigLoaded(true);
      })
      .catch((err) => {
        console.error('[App] Failed to load config:', err);
        setConfigLoaded(true);
      });
  }, []);

  // Only initialize MQTT after config is loaded
  const mqttConfig = useMemo(() => (configLoaded && mqttUrl ? { url: mqttUrl } : null), [configLoaded, mqttUrl]);
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

  // Show loading state until config is loaded
  if (!configLoaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

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
