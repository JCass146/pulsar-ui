import { useRef, useCallback, useState, useEffect } from "react";

/**
 * useDeviceRegistry
 *
 * Manages device state and lifecycle (creation, updates, status).
 * Provides a clean API for App.jsx to interact with device data.
 *
 * Usage:
 *   const registry = useDeviceRegistry();
 *   registry.ensureDevice("device01");
 *   registry.getDevice("device01");
 *   registry.getAllDevices();
 *
 * @returns {Object} Device registry API
 */
export function useDeviceRegistry() {
  const devicesRef = useRef(new Map());
  const [tick, setTick] = useState(0);

  // Ensure device exists in registry
  const ensureDevice = useCallback((id) => {
    if (!devicesRef.current.has(id)) {
      devicesRef.current.set(id, {
        id,
        state: new Map(),
        meta: new Map(),
        pendingCommands: new Map(),
        latestSeen: Date.now(),
        stale: false,
        online: false,
        latestStatus: null,
      });
    }
    return devicesRef.current.get(id);
  }, []);

  // Get a specific device
  const getDevice = useCallback((id) => {
    return devicesRef.current.get(id);
  }, []);

  // Get all devices as array
  const getAllDevices = useCallback(() => {
    return Array.from(devicesRef.current.values());
  }, []);

  // Get devices sorted by status
  const getDevicesSorted = useCallback((online = true) => {
    let arr = Array.from(devicesRef.current.values());
    if (online) {
      arr = arr.filter((d) => d.online);
    }
    arr.sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      if (a.stale !== b.stale) return a.stale ? 1 : -1;
      return a.id.localeCompare(b.id);
    });
    return arr;
  }, []);

  // Remove a device from registry
  const removeDevice = useCallback((id) => {
    if (devicesRef.current.has(id)) {
      devicesRef.current.delete(id);
      setTick((t) => (t + 1) % 1_000_000);
    }
  }, []);

  // Trigger re-render after external state changes
  const bumpTick = useCallback(() => {
    setTick((t) => (t + 1) % 1_000_000);
  }, []);

  return {
    devicesRef,
    ensureDevice,
    getDevice,
    getAllDevices,
    getDevicesSorted,
    removeDevice,
    bumpTick,
    tick,
  };
}
