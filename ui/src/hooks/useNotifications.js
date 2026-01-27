/**
 * Notification state management hook
 */

import { useCallback, useRef, useState } from "react";
import { newId } from "../utils/helpers.js";

/**
 * useNotifications - Manage app-wide notifications
 * @returns {{ notifItems, pushNotif, clearNotifs, notifTick }}
 */
export function useNotifications() {
  const notifsRef = useRef([]);
  const [notifTick, setNotifTick] = useState(0);

  const pushNotif = useCallback((level, title, detail = "", device = "") => {
    notifsRef.current.unshift({
      id: newId(),
      t_ms: Date.now(),
      level,           // "info" | "ok" | "warn" | "bad"
      title,
      detail,
      device
    });
    if (notifsRef.current.length > 400) notifsRef.current.length = 400;

    setNotifTick((x) => (x + 1) % 1_000_000);
  }, []);

  const clearNotifs = useCallback(() => {
    notifsRef.current.length = 0;
    setNotifTick((x) => (x + 1) % 1_000_000);
  }, []);

  const notifItems = notifsRef.current.slice(0, 40);

  return { notifItems, pushNotif, clearNotifs, notifTick };
}
